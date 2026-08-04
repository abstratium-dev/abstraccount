package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.AttachmentContentEntity;
import dev.abstratium.abstraccount.entity.AttachmentEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.transaction.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/**
 * Service for persisting and loading transaction attachments (e.g. receipt
 * PDFs).
 * <p>
 * Every read/write of attachment metadata goes through {@link EntityManager}
 * (either {@code find} or JPQL), so Hibernate's discriminator multi-tenancy
 * (see {@code docs/HIBERNATE_DISCRIMINATOR_MULTITENANCY.md}) automatically
 * scopes every operation to the caller's organisation. The binary content in
 * {@link AttachmentContentEntity} has no tenant column of its own and is only
 * ever loaded by the id of an {@link AttachmentEntity} that has already been
 * confirmed to belong to the current tenant - see {@link #loadContent(String)}.
 */
@ApplicationScoped
public class AttachmentPersistenceService {

    @Inject
    EntityManager entityManager;

    @Inject
    JournalPersistenceService journalPersistenceService;

    /**
     * Finds an attachment by id, scoped to the current tenant.
     *
     * @param attachmentId the attachment id
     * @return Optional containing the attachment, or empty if not found (or
     *         belonging to another tenant)
     */
    @Transactional
    public Optional<AttachmentEntity> findById(String attachmentId) {
        return Optional.ofNullable(entityManager.find(AttachmentEntity.class, attachmentId));
    }

    /**
     * Lists all attachments for a transaction, most recently uploaded first.
     *
     * @param transactionId the transaction id
     * @return list of attachment metadata
     */
    @Transactional
    public List<AttachmentEntity> listByTransaction(String transactionId) {
        TypedQuery<AttachmentEntity> query = entityManager.createQuery(
            "SELECT a FROM AttachmentEntity a WHERE a.transactionId = :transactionId ORDER BY a.uploadedAt DESC",
            AttachmentEntity.class);
        query.setParameter("transactionId", transactionId);
        return query.getResultList();
    }

    /**
     * Lists all attachments for every transaction of a journal whose
     * transaction date falls within the given (inclusive) range, most
     * recently uploaded first. Used for bulk export (see
     * {@code docs/ephemeral-and-volatile-and-temporary-but-interesting/TRANSACTION_ATTACHMENTS.md} §10.2).
     * The transaction set is always derived server-side from the tenant-
     * scoped journal, never from client-supplied attachment/transaction ids.
     *
     * @param journalId the journal id
     * @param from      inclusive start date, or {@code null} for no lower bound
     * @param to        inclusive end date, or {@code null} for no upper bound
     * @return list of attachment metadata for matching transactions
     */
    @Transactional
    public List<AttachmentEntity> listByJournalAndDateRange(String journalId, java.time.LocalDate from, java.time.LocalDate to) {
        StringBuilder jpql = new StringBuilder(
            "SELECT a FROM AttachmentEntity a WHERE a.transactionId IN (" +
            "SELECT t.id FROM TransactionEntity t WHERE t.journalId = :journalId");
        if (from != null) {
            jpql.append(" AND t.transactionDate >= :from");
        }
        if (to != null) {
            jpql.append(" AND t.transactionDate <= :to");
        }
        jpql.append(") ORDER BY a.uploadedAt DESC");

        TypedQuery<AttachmentEntity> query = entityManager.createQuery(jpql.toString(), AttachmentEntity.class);
        query.setParameter("journalId", journalId);
        if (from != null) {
            query.setParameter("from", from);
        }
        if (to != null) {
            query.setParameter("to", to);
        }
        return query.getResultList();
    }

    /**
     * Loads the binary content for an attachment that has already been
     * confirmed to belong to the current tenant (i.e. was obtained via
     * {@link #findById(String)} or one of the list methods above).
     *
     * @param attachmentId the attachment id (must already be tenant-verified)
     * @return the raw bytes, or empty if no content row exists
     */
    @Transactional
    public Optional<byte[]> loadContent(String attachmentId) {
        AttachmentContentEntity content = entityManager.find(AttachmentContentEntity.class, attachmentId);
        return Optional.ofNullable(content).map(AttachmentContentEntity::getContent);
    }

    /**
     * Creates a new attachment for a transaction. Rejects the upload if the
     * transaction does not exist or its journal is locked.
     *
     * @param transactionId the transaction id
     * @param fileName      the original file name
     * @param contentType   the content type (e.g. application/pdf)
     * @param bytes         the raw file bytes
     * @param uploadedBy    the principal name of the uploader, may be null
     * @return the persisted attachment metadata
     * @throws IllegalArgumentException if the transaction does not exist
     * @throws JournalLockedException   if the owning journal is locked
     */
    @Transactional
    public AttachmentEntity create(String transactionId, String fileName, String contentType, byte[] bytes, String uploadedBy) {
        TransactionEntity transaction = entityManager.find(TransactionEntity.class, transactionId);
        if (transaction == null) {
            throw new IllegalArgumentException("Transaction not found: " + transactionId);
        }
        journalPersistenceService.requireNotLocked(transaction.getJournalId());

        AttachmentEntity attachment = new AttachmentEntity();
        attachment.setTransactionId(transactionId);
        attachment.setFileName(fileName);
        attachment.setContentType(contentType);
        attachment.setSizeBytes(bytes.length);
        attachment.setSha256(sha256(bytes));
        attachment.setUploadedAt(Instant.now());
        attachment.setUploadedBy(uploadedBy);

        entityManager.persist(attachment);
        entityManager.persist(new AttachmentContentEntity(attachment.getId(), bytes));
        return attachment;
    }

    /**
     * Replaces the content (and file name/content type) of an existing
     * attachment. Rejects the replacement if the owning journal is locked.
     *
     * @param attachmentId the attachment id (tenant-scoped lookup)
     * @param fileName     the new file name
     * @param contentType  the new content type
     * @param bytes        the new raw file bytes
     * @param uploadedBy   the principal name of the uploader, may be null
     * @return the updated attachment metadata, or empty if not found for this tenant
     * @throws JournalLockedException if the owning journal is locked
     */
    @Transactional
    public Optional<AttachmentEntity> replace(String attachmentId, String fileName, String contentType, byte[] bytes, String uploadedBy) {
        AttachmentEntity attachment = entityManager.find(AttachmentEntity.class, attachmentId);
        if (attachment == null) {
            return Optional.empty();
        }
        TransactionEntity transaction = entityManager.find(TransactionEntity.class, attachment.getTransactionId());
        journalPersistenceService.requireNotLocked(transaction != null ? transaction.getJournalId() : null);

        attachment.setFileName(fileName);
        attachment.setContentType(contentType);
        attachment.setSizeBytes(bytes.length);
        attachment.setSha256(sha256(bytes));
        attachment.setUploadedAt(Instant.now());
        attachment.setUploadedBy(uploadedBy);

        AttachmentContentEntity content = entityManager.find(AttachmentContentEntity.class, attachmentId);
        if (content == null) {
            entityManager.persist(new AttachmentContentEntity(attachmentId, bytes));
        } else {
            content.setContent(bytes);
        }
        return Optional.of(attachment);
    }

    /**
     * Deletes an attachment (metadata and content). Rejects the deletion if
     * the owning journal is locked.
     *
     * @param attachmentId the attachment id (tenant-scoped lookup)
     * @return {@code true} if an attachment was deleted, {@code false} if
     *         not found for this tenant
     * @throws JournalLockedException if the owning journal is locked
     */
    @Transactional
    public boolean delete(String attachmentId) {
        AttachmentEntity attachment = entityManager.find(AttachmentEntity.class, attachmentId);
        if (attachment == null) {
            return false;
        }
        TransactionEntity transaction = entityManager.find(TransactionEntity.class, attachment.getTransactionId());
        journalPersistenceService.requireNotLocked(transaction != null ? transaction.getJournalId() : null);

        AttachmentContentEntity content = entityManager.find(AttachmentContentEntity.class, attachmentId);
        if (content != null) {
            entityManager.remove(content);
        }
        entityManager.remove(attachment);
        return true;
    }

    private static String sha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is guaranteed to be available on every JVM; this is unreachable.
            throw new IllegalStateException(e);
        }
    }
}
