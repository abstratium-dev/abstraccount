package dev.abstratium.abstraccount.boundary;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.jboss.logging.Logger;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.adapters.PartnerDataAdapter;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.model.Journal;
import dev.abstratium.abstraccount.service.JournalParser;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;

/**
 * REST resource for journal operations.
 * Provides endpoints for querying journal data with filtering.
 */
@Path("/api/journal")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class JournalResource {
    
    private static final Logger LOG = Logger.getLogger(JournalResource.class);
    
    @Inject
    JournalParser journalParser;
    
    @Inject
    dev.abstratium.abstraccount.service.JournalModelPersistenceService modelPersistenceService;
    
    @Inject
    JournalPersistenceService journalPersistenceService;
    
    @Inject
    PartnerDataAdapter partnerDataAdapter;
    
    /**
     * Gets transactions with their entries and tags.
     * Queries directly from database.
     * 
     * @param journalId the journal ID (required)
     * @param startDate optional inclusive start date filter (YYYY-MM-DD)
     * @param endDate optional exclusive end date filter (YYYY-MM-DD)
     * @param partnerId optional partner ID filter
     * @param status optional transaction status filter
     * @param filter optional filter string (e.g., "begin:20240601 end:20241031 invoice invoice:*34")
     */
    @GET
    @Path("/{journalId}/transactions")
    public List<TransactionDTO> getTransactions(
            @PathParam("journalId") String journalId,
            @QueryParam("startDate") String startDate,
            @QueryParam("endDate") String endDate,
            @QueryParam("partnerId") String partnerId,
            @QueryParam("status") String status,
            @QueryParam("filter") String filter) {
        
        // Parse dates
        LocalDate startLocalDate = startDate != null ? LocalDate.parse(startDate) : null;
        LocalDate endLocalDate = endDate != null ? LocalDate.parse(endDate) : null;
        
        // Parse filter string if provided
        List<String> tagKeys = null;
        Map<String, String> tagKeyValuePairs = null;
        List<String> notTagKeys = null;
        Map<String, String> notTagKeyValuePairs = null;
        String partnerFilter = partnerId;
        
        if (filter != null && !filter.trim().isEmpty()) {
            tagKeys = new ArrayList<>();
            tagKeyValuePairs = new HashMap<>();
            notTagKeys = new ArrayList<>();
            notTagKeyValuePairs = new HashMap<>();
            
            String[] tokens = filter.trim().split("\\s+");
            for (String token : tokens) {
                boolean isNegated = false;
                
                // Check for 'not:' prefix
                if (token.startsWith("not:")) {
                    isNegated = true;
                    token = token.substring(4); // Remove 'not:' prefix
                }
                
                if (token.startsWith("begin:")) {
                    String dateStr = token.substring(6);
                    startLocalDate = parseCompactDate(dateStr);
                } else if (token.startsWith("end:")) {
                    String dateStr = token.substring(4);
                    endLocalDate = parseCompactDate(dateStr);
                } else if (token.startsWith("partner:")) {
                    String partnerValue = token.substring(8);
                    // Convert wildcard * to SQL LIKE pattern %
                    partnerFilter = partnerValue.replace("*", "%");
                } else if (token.contains(":")) {
                    // Tag key-value pair
                    int colonIdx = token.indexOf(':');
                    String key = token.substring(0, colonIdx);
                    String value = token.substring(colonIdx + 1);
                    // Convert wildcard * to SQL LIKE pattern %
                    value = value.replace("*", "%");
                    
                    if (isNegated) {
                        notTagKeyValuePairs.put(key, value);
                    } else {
                        tagKeyValuePairs.put(key, value);
                    }
                } else {
                    // Tag key only
                    if (isNegated) {
                        notTagKeys.add(token);
                    } else {
                        tagKeys.add(token);
                    }
                }
            }
            
            if (tagKeys.isEmpty()) tagKeys = null;
            if (tagKeyValuePairs.isEmpty()) tagKeyValuePairs = null;
            if (notTagKeys.isEmpty()) notTagKeys = null;
            if (notTagKeyValuePairs.isEmpty()) notTagKeyValuePairs = null;
        }
        
        // Query entries from database (which eagerly loads transactions)
        List<dev.abstratium.abstraccount.entity.EntryEntity> entryEntities = 
            journalPersistenceService.queryEntriesWithFilters(
                journalId,
                startLocalDate,
                endLocalDate,
                partnerFilter,
                status,
                null, // no account filter
                tagKeys,
                tagKeyValuePairs,
                notTagKeys,
                notTagKeyValuePairs
            );
        
        // Load all accounts for this journal to join with entries
        List<dev.abstratium.abstraccount.entity.AccountEntity> accounts = 
            journalPersistenceService.loadAllAccounts(journalId);
        Map<String, dev.abstratium.abstraccount.entity.AccountEntity> accountMap = accounts.stream()
            .collect(Collectors.toMap(
                dev.abstratium.abstraccount.entity.AccountEntity::getId,
                acc -> acc
            ));
        
        // Deduplicate to get unique transactions
        Map<String, dev.abstratium.abstraccount.entity.TransactionEntity> transactionMap = new HashMap<>();
        for (dev.abstratium.abstraccount.entity.EntryEntity entry : entryEntities) {
            transactionMap.put(entry.getTransaction().getId(), entry.getTransaction());
        }
        
        // Convert to DTOs
        List<TransactionDTO> transactionDTOs = new ArrayList<>();
        
        for (dev.abstratium.abstraccount.entity.TransactionEntity txEntity : transactionMap.values()) {
            // Convert tags
            List<TagDTO> tags = txEntity.getTags().stream()
                .map(tag -> new TagDTO(tag.getTagKey(), tag.getTagValue()))
                .collect(Collectors.toList());
            
            // Convert entries
            List<EntryDTO> entries = txEntity.getEntries().stream()
                .sorted((a, b) -> Integer.compare(a.getEntryOrder(), b.getEntryOrder()))
                .map(entry -> {
                    dev.abstratium.abstraccount.entity.AccountEntity account = accountMap.get(entry.getAccountId());
                    return new EntryDTO(
                        entry.getId(),
                        entry.getEntryOrder(),
                        entry.getAccountId(),
                        account != null ? account.getName() : "",
                        account != null ? account.getType().name() : "",
                        entry.getCommodity(),
                        entry.getAmount(),
                        entry.getNote()
                    );
                })
                .collect(Collectors.toList());
            
            String txPartnerId = txEntity.getPartnerId();
            String txPartnerName = txPartnerId != null 
                ? partnerDataAdapter.getPartner(txPartnerId)
                    .map(p -> p.name())
                    .orElse(null)
                : null;
            
            transactionDTOs.add(new TransactionDTO(
                txEntity.getId(),
                txEntity.getTransactionDate(),
                txEntity.getStatus().name(),
                txEntity.getDescription(),
                txPartnerId,
                txPartnerName,
                tags,
                entries
            ));
        }
        
        return transactionDTOs.stream().sorted((a, b) -> b.date().compareTo(a.date())).collect(Collectors.toList());
    }
    
    /**
     * Parses a compact date string in yyyyMMdd format.
     * 
     * @param dateStr the date string
     * @return LocalDate
     */
    private LocalDate parseCompactDate(String dateStr) {
        if (dateStr.length() != 8) {
            throw new WebApplicationException("Invalid date format: " + dateStr + ". Expected yyyyMMdd", 400);
        }
        int year = Integer.parseInt(dateStr.substring(0, 4));
        int month = Integer.parseInt(dateStr.substring(4, 6));
        int day = Integer.parseInt(dateStr.substring(6, 8));
        return LocalDate.of(year, month, day);
    }
    
    /**
     * Gets all distinct tags for a journal.
     * Used for autocomplete functionality.
     * 
     * @param journalId the journal ID
     * @return list of tag DTOs
     */
    @GET
    @Path("/{journalId}/tags")
    public List<TagDTO> getTags(@PathParam("journalId") String journalId) {
        List<Object[]> tags = journalPersistenceService.getDistinctTags(journalId);
        return tags.stream()
            .map(row -> new TagDTO((String) row[0], (String) row[1]))
            .collect(Collectors.toList());
    }
    
    /**
     * Lists all journals in the system.
     * 
     * @return list of journal metadata
     */
    @GET
    @Path("/list")
    public List<JournalDTO> listJournals() {
        LOG.debug("Listing all journals");
        
        List<JournalEntity> journals = journalPersistenceService.findAllJournals();
        
        return journals.stream()
            .map(j -> new JournalDTO(
                j.getId(),
                j.getTitle(),
                j.getSubtitle(),
                j.getCurrency(),
                j.getCommodities()
            ))
            .collect(Collectors.toList());
    }
    
    /**
     * Gets metadata for a specific journal by ID.
     * 
     * @param journalId the journal ID
     * @return journal metadata
     */
    @GET
    @Path("/{journalId}/metadata")
    public JournalDTO getJournalMetadata(@PathParam("journalId") String journalId) {
        LOG.debugf("Getting metadata for journal: %s", journalId);
        
        JournalEntity journal = journalPersistenceService.findJournalById(journalId)
            .orElseThrow(() -> new WebApplicationException("Journal not found: " + journalId, 404));
        
        return new JournalDTO(
            journal.getId(),
            journal.getTitle(),
            journal.getSubtitle(),
            journal.getCurrency(),
            journal.getCommodities()
        );
    }
    
    /**
     * Deletes a journal and all its related data (accounts, transactions, entries, tags).
     * 
     * @param journalId the ID of the journal to delete
     * @return confirmation message
     */
    @DELETE
    @Path("/{journalId}")
    @RolesAllowed({Roles.USER})
    public Map<String, Object> deleteJournal(@PathParam("journalId") String journalId) {
        LOG.infof("Deleting journal: %s", journalId);
        
        try {
            // Verify journal exists
            JournalEntity journal = journalPersistenceService.findJournalById(journalId)
                .orElseThrow(() -> new WebApplicationException("Journal not found: " + journalId, 404));

            // let the db do cascade deletion
            journalPersistenceService.deleteJournal(journalId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Journal deleted successfully");
            response.put("journalId", journalId);
            response.put("journalTitle", journal.getTitle());
            
            LOG.infof("Successfully deleted journal: %s", journalId);
            return response;
            
        } catch (WebApplicationException e) {
            throw e;
        } catch (Exception e) {
            LOG.error("Failed to delete journal", e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            throw new WebApplicationException(
                jakarta.ws.rs.core.Response.status(jakarta.ws.rs.core.Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(error)
                    .build()
            );
        }
    }
    
    /**
     * Creates a new journal with the provided metadata.
     * Only users with USER role can create journals.
     * 
     * @param request the journal creation request
     * @return the created journal metadata
     */
    @POST
    @Path("/create")
    @RolesAllowed({Roles.USER})
    public JournalDTO createJournal(CreateJournalRequest request) {
        LOG.infof("Creating new journal: %s", request.title());
        
        try {
            // Create journal entity
            JournalEntity journalEntity = new JournalEntity();
            journalEntity.setLogo(request.logo());
            journalEntity.setTitle(request.title());
            journalEntity.setSubtitle(request.subtitle());
            journalEntity.setCurrency(request.currency());
            journalEntity.setCommodities(request.commodities() != null ? request.commodities() : new HashMap<>());
            
            // Save to database
            JournalEntity savedJournal = journalPersistenceService.saveJournal(journalEntity);
            
            LOG.infof("Successfully created journal: %s with ID: %s", savedJournal.getTitle(), savedJournal.getId());
            
            return new JournalDTO(
                savedJournal.getId(),
                savedJournal.getTitle(),
                savedJournal.getSubtitle(),
                savedJournal.getCurrency(),
                savedJournal.getCommodities()
            );
            
        } catch (Exception e) {
            LOG.error("Failed to create journal", e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            throw new WebApplicationException(
                jakarta.ws.rs.core.Response.status(jakarta.ws.rs.core.Response.Status.BAD_REQUEST)
                    .entity(error)
                    .build()
            );
        }
    }
    
    /**
     * Uploads and persists a journal file.
     * Parses the journal content and stores all data (journal metadata, accounts, transactions) in the database.
     * 
     * @param journalContent the journal file content as a string
     * @return a summary of what was persisted
     */
    @POST
    @Path("/upload")
    @Consumes(MediaType.TEXT_PLAIN)
    @RolesAllowed({Roles.USER})
    public Map<String, Object> uploadJournal(String journalContent) {
        LOG.infof("Uploading journal, content length: %d", journalContent.length());
        
        try {
            // Parse the journal
            Journal journal = journalParser.parse(journalContent);
            
            // Persist to database
            String journalId = modelPersistenceService.persistJournalModel(journal);
            
            
            // Return summary
            Map<String, Object> summary = new HashMap<>();
            summary.put("title", journal.title());
            summary.put("accountCount", journal.accounts().size());
            summary.put("transactionCount", journal.transactions().size());
            summary.put("commodityCount", journal.commodities().size());
            summary.put("status", "success");
            summary.put("journalId", journalId);
            
            LOG.infof("Successfully uploaded journal: %s", journal.title());
            return summary;
            
        } catch (Exception e) {
            LOG.error("Failed to upload journal", e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            throw new WebApplicationException(
                jakarta.ws.rs.core.Response.status(jakarta.ws.rs.core.Response.Status.BAD_REQUEST)
                    .entity(error)
                    .build()
            );
        }
    }
}
