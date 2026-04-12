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
import dev.abstratium.abstraccount.service.EntryQueryParser;
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

    @Inject
    EntryQueryParser entryQueryParser;
    
    /**
     * Gets transactions with their entries and tags.
     * Queries directly from database.
     * 
     * @param journalId the journal ID (required)
     * @param startDate optional inclusive start date filter (YYYY-MM-DD)
     * @param endDate optional exclusive end date filter (YYYY-MM-DD)
     * @param partnerId optional partner ID filter
     * @param status optional transaction status filter
     * @param filter optional EQL filter expression (see docs/QUERY_LANGUAGE.md)
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

        // Load all accounts eagerly so the parser can resolve account names / types
        List<dev.abstratium.abstraccount.entity.AccountEntity> accounts =
            journalPersistenceService.loadAllAccounts(journalId);
        Map<String, dev.abstratium.abstraccount.entity.AccountEntity> accountMap = accounts.stream()
            .collect(Collectors.toMap(
                dev.abstratium.abstraccount.entity.AccountEntity::getId,
                acc -> acc
            ));

        // Parse the EQL expression into a predicate
        java.util.function.Predicate<dev.abstratium.abstraccount.entity.TransactionEntity> txPredicate;
        try {
            txPredicate = entryQueryParser.parse(filter, accountMap);
        } catch (EntryQueryParser.QueryParseException e) {
            throw new WebApplicationException(
                jakarta.ws.rs.core.Response.status(400)
                    .entity(new QueryErrorDTO("query_parse_error", e.getMessage(), e.getPosition()))
                    .type(MediaType.APPLICATION_JSON)
                    .build());
        }

        // Broad DB query: only use the simple indexed filters for the SQL query;
        // the EQL predicate will post-filter in memory.
        LocalDate startLocalDate = startDate != null ? LocalDate.parse(startDate) : null;
        LocalDate endLocalDate = endDate != null ? LocalDate.parse(endDate) : null;

        List<dev.abstratium.abstraccount.entity.EntryEntity> entryEntities =
            journalPersistenceService.queryEntriesWithFilters(
                journalId,
                startLocalDate,
                endLocalDate,
                partnerId,
                status,
                null,
                null,
                null,
                null,
                null
            );

        // Deduplicate to get unique transactions while preserving order from database
        Map<String, dev.abstratium.abstraccount.entity.TransactionEntity> transactionMap = new java.util.LinkedHashMap<>();
        for (dev.abstratium.abstraccount.entity.EntryEntity entry : entryEntities) {
            transactionMap.putIfAbsent(entry.getTransaction().getId(), entry.getTransaction());
        }

        // Apply EQL post-filter
        transactionMap.values().removeIf(tx -> !txPredicate.test(tx));
        
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
        
        return transactionDTOs;
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
                j.getLogo(),
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
            journal.getLogo(),
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
                savedJournal.getLogo(),
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
