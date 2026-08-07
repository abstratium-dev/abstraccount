package dev.abstratium.abstraccount.boundary;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.AttachmentEntity;
import dev.abstratium.abstraccount.service.AttachmentPersistenceService;
import dev.abstratium.abstraccount.service.JournalLockedException;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.StreamingOutput;

/**
 * REST resource for managing attachments (e.g. receipt PDFs) linked to
 * transactions.
 * <p>
 * See {@code docs/ephemeral-and-volatile-and-temporary-but-interesting/TRANSACTION_ATTACHMENTS.md}
 * for the design rationale (BLOB-in-MySQL storage, tenant isolation via the
 * discriminator {@code @TenantId}, journal-locking rules).
 */
@Path("/api/attachment")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class AttachmentResource {

    private static final Logger LOG = Logger.getLogger(AttachmentResource.class);

    /** Only PDFs are accepted for now (see TRANSACTION_ATTACHMENTS.md §7). */
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("application/pdf");

    /** A generous but bounded upload size to avoid unbounded memory usage. */
    private static final long MAX_SIZE_BYTES = 20L * 1024 * 1024; // 20MB

    private static final byte[] PDF_MAGIC = "%PDF-".getBytes(StandardCharsets.US_ASCII);

    @Inject
    AttachmentPersistenceService attachmentPersistenceService;

    @Inject
    JournalPersistenceService journalPersistenceService;

    @Inject
    SecurityIdentity securityIdentity;

    /**
     * Uploads a new attachment for a transaction.
     */
    @POST
    @Path("/transaction/{transactionId}")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public AttachmentDTO upload(@PathParam("transactionId") String transactionId,
                                 @RestForm("file") FileUpload file) {
        byte[] bytes = readAndValidate(file);

        try {
            AttachmentEntity attachment = attachmentPersistenceService.create(
                transactionId, safeFileName(file), file.contentType(), bytes, currentUsername());
            LOG.infof("Uploaded attachment %s for transaction %s", attachment.getId(), transactionId);
            return toDTO(attachment);
        } catch (IllegalArgumentException e) {
            throw new WebApplicationException(e.getMessage(), 404);
        } catch (JournalLockedException e) {
            throw e; // mapped to 423 by JournalLockedExceptionMapper
        }
    }

    /**
     * Lists the attachments for a transaction (metadata only).
     */
    @GET
    @Path("/transaction/{transactionId}")
    public List<AttachmentDTO> list(@PathParam("transactionId") String transactionId) {
        requireTransactionInOrg(transactionId);
        return attachmentPersistenceService.listByTransaction(transactionId).stream()
            .map(this::toDTO)
            .toList();
    }

    /**
     * Verifies that a transaction exists in the caller's organisation
     * (tenant-scoped {@code em.find}, see
     * {@code docs/HIBERNATE_DISCRIMINATOR_MULTITENANCY.md}), throwing a 404
     * otherwise. Used so that an unknown or cross-tenant transaction id
     * yields a clear 404 rather than a silently-empty result.
     */
    private void requireTransactionInOrg(String transactionId) {
        journalPersistenceService.findTransactionById(transactionId)
            .orElseThrow(() -> new WebApplicationException("Transaction not found: " + transactionId, 404));
    }

    /**
     * Downloads all attachments for every transaction of a journal whose
     * transaction date falls within the given (inclusive) range, as a single
     * zip file. Useful for handing a fiscal year's receipts to an accountant
     * or auditor. The transaction set is always derived server-side from the
     * tenant-scoped journal (never from client-supplied ids).
     */
    @GET
    @Path("/journal/{journalId}/zip")
    @Produces("application/zip")
    public Response downloadJournalZip(@PathParam("journalId") String journalId,
                                        @QueryParam("from") String from,
                                        @QueryParam("to") String to) {
        LocalDate fromDate = parseDateOrBadRequest(from, "from");
        LocalDate toDate = parseDateOrBadRequest(to, "to");

        journalPersistenceService.findJournalById(journalId)
            .orElseThrow(() -> new WebApplicationException("Journal not found: " + journalId, 404));

        List<AttachmentEntity> attachments = attachmentPersistenceService.listByJournalAndDateRange(journalId, fromDate, toDate);
        return buildZipResponse(attachments, "journal-" + journalId + "-attachments.zip");
    }

    private LocalDate parseDateOrBadRequest(String value, String paramName) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (java.time.format.DateTimeParseException e) {
            throw new WebApplicationException("Invalid '" + paramName + "' date: " + value, 400);
        }
    }

    /**
     * Downloads the raw bytes of an attachment.
     */
    @GET
    @Path("/{attachmentId}")
    @Produces(MediaType.WILDCARD)
    public Response download(@PathParam("attachmentId") String attachmentId) {
        AttachmentEntity attachment = attachmentPersistenceService.findById(attachmentId)
            .orElseThrow(() -> new WebApplicationException("Attachment not found: " + attachmentId, 404));

        byte[] content = attachmentPersistenceService.loadContent(attachmentId)
            .orElseThrow(() -> new WebApplicationException("Attachment content not found: " + attachmentId, 404));

        return Response.ok(content, attachment.getContentType())
            .header("Content-Disposition", contentDisposition("inline", attachment.getFileName()))
            .build();
    }

    /**
     * Replaces the content of an existing attachment.
     */
    @PUT
    @Path("/{attachmentId}")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Transactional
    public AttachmentDTO replace(@PathParam("attachmentId") String attachmentId,
                                  @RestForm("file") FileUpload file) {
        byte[] bytes = readAndValidate(file);

        try {
            AttachmentEntity attachment = attachmentPersistenceService.replace(
                    attachmentId, safeFileName(file), file.contentType(), bytes, currentUsername())
                .orElseThrow(() -> new WebApplicationException("Attachment not found: " + attachmentId, 404));
            LOG.infof("Replaced attachment %s", attachmentId);
            return toDTO(attachment);
        } catch (JournalLockedException e) {
            throw e; // mapped to 423 by JournalLockedExceptionMapper
        }
    }

    /**
     * Deletes an attachment.
     */
    @DELETE
    @Path("/{attachmentId}")
    @Transactional
    public Map<String, Object> delete(@PathParam("attachmentId") String attachmentId) {
        boolean deleted;
        try {
            deleted = attachmentPersistenceService.delete(attachmentId);
        } catch (JournalLockedException e) {
            throw e; // mapped to 423 by JournalLockedExceptionMapper
        }
        if (!deleted) {
            throw new WebApplicationException("Attachment not found: " + attachmentId, 404);
        }
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("attachmentId", attachmentId);
        LOG.infof("Deleted attachment %s", attachmentId);
        return response;
    }

    private Response buildZipResponse(List<AttachmentEntity> attachments, String zipFileName) {
        Map<String, Integer> nameCounts = new HashMap<>();
        StreamingOutput streamingOutput = output -> {
            try (ZipOutputStream zip = new ZipOutputStream(output)) {
                for (AttachmentEntity attachment : attachments) {
                    byte[] content = attachmentPersistenceService.loadContent(attachment.getId()).orElse(null);
                    if (content == null) {
                        continue;
                    }
                    String entryName = uniqueEntryName(attachment, nameCounts);
                    zip.putNextEntry(new ZipEntry(entryName));
                    zip.write(content);
                    zip.closeEntry();
                }
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        };
        return Response.ok(streamingOutput)
            .header("Content-Disposition", contentDisposition("attachment", zipFileName))
            .build();
    }

    /**
     * Builds a {@code Content-Disposition} header value, escaping any
     * quote/backslash/control characters in the file name so it cannot break
     * out of the quoted-string value (defensive; file names are also
     * sanitized on upload, see {@link #sanitizeFileName(String)}).
     */
    private String contentDisposition(String disposition, String fileName) {
        String safe = fileName.replace("\\", "\\\\").replace("\"", "\\\"")
            .replaceAll("[\\r\\n\\x00-\\x1F]", "");
        return disposition + "; filename=\"" + safe + "\"";
    }

    private String uniqueEntryName(AttachmentEntity attachment, Map<String, Integer> nameCounts) {
        String baseName = attachment.getFileName() != null ? attachment.getFileName() : "attachment.pdf";
        String candidate = attachment.getTransactionId() + "_" + baseName;
        int count = nameCounts.merge(candidate, 1, Integer::sum);
        if (count == 1) {
            return candidate;
        }
        int dot = candidate.lastIndexOf('.');
        String withoutExt = dot >= 0 ? candidate.substring(0, dot) : candidate;
        String ext = dot >= 0 ? candidate.substring(dot) : "";
        return withoutExt + "_" + count + ext;
    }

    /**
     * Reads the uploaded file's bytes and validates its size, declared
     * content-type, and magic bytes. Never trusts the client-supplied
     * content-type alone.
     */
    private byte[] readAndValidate(FileUpload file) {
        if (file == null) {
            throw new WebApplicationException("No file was uploaded", 400);
        }
        if (file.size() > MAX_SIZE_BYTES) {
            throw new WebApplicationException("File exceeds maximum allowed size of " + (MAX_SIZE_BYTES / (1024 * 1024)) + "MB", 400);
        }
        String contentType = file.contentType() != null ? file.contentType().toLowerCase(Locale.ROOT) : null;
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new WebApplicationException("Unsupported content type: " + contentType, 400);
        }

        byte[] bytes;
        try {
            bytes = Files.readAllBytes(file.uploadedFile());
        } catch (IOException e) {
            throw new WebApplicationException("Failed to read uploaded file", 500);
        }

        if (bytes.length < PDF_MAGIC.length || !startsWith(bytes, PDF_MAGIC)) {
            throw new WebApplicationException("File does not appear to be a valid PDF", 400);
        }
        return bytes;
    }

    private static boolean startsWith(byte[] data, byte[] prefix) {
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Sanitizes the client-supplied file name before it is persisted, so
     * that it can never carry path-traversal segments (which would enable
     * "Zip Slip" when a bulk-export zip is later extracted by a recipient,
     * see TRANSACTION_ATTACHMENTS.md §11) or control/quote characters (which
     * could otherwise interfere with the {@code Content-Disposition} header
     * built in {@link #contentDisposition(String, String)}).
     */
    private String safeFileName(FileUpload file) {
        return sanitizeFileName(file.fileName());
    }

    private static String sanitizeFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "attachment.pdf";
        }
        // Keep only the last path segment (strip any directory components,
        // whether '/'- or '\'-separated) and drop control characters.
        String baseName = fileName.replace('\\', '/');
        baseName = baseName.substring(baseName.lastIndexOf('/') + 1);
        baseName = baseName.replaceAll("[\\r\\n\\x00-\\x1F]", "").trim();
        return baseName.isEmpty() ? "attachment.pdf" : baseName;
    }

    private String currentUsername() {
        try {
            return securityIdentity != null && securityIdentity.getPrincipal() != null
                ? securityIdentity.getPrincipal().getName() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private AttachmentDTO toDTO(AttachmentEntity attachment) {
        return new AttachmentDTO(
            attachment.getId(),
            attachment.getTransactionId(),
            attachment.getFileName(),
            attachment.getContentType(),
            attachment.getSizeBytes(),
            attachment.getUploadedAt(),
            attachment.getUploadedBy()
        );
    }
}
