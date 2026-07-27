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
import dev.abstratium.abstraccount.service.JournalCreationService;
import dev.abstratium.abstraccount.service.JournalParser;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import dev.abstratium.abstraccount.service.JournalSerializer;
import dev.abstratium.core.service.CurrentOrgContext;
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
    JournalCreationService journalCreationService;
    
    @Inject
    PartnerDataAdapter partnerDataAdapter;

    @Inject
    CurrentOrgContext currentOrgContext;

    @Inject
    EntryQueryParser entryQueryParser;

    @Inject
    JournalSerializer journalSerializer;
    
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

        String orgId = currentOrgContext.getOrgId();

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
            txPredicate = entryQueryParser.parse(filter, accountMap, orgId);
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
                ? partnerDataAdapter.getPartner(orgId, txPartnerId)
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
                j.getCommodities(),
                j.getPreviousJournalId()
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
            journal.getCommodities(),
            journal.getPreviousJournalId()
        );
    }
    
    /**
     * Returns KPI totals for a journal: balance-sheet account sums by type,
     * excluding transactions tagged with "Closing".
     *
     * @param journalId the journal ID
     * @return KPI DTO with asset, liability, equity, revenue and expense totals
     */
    @GET
    @Path("/{journalId}/kpi")
    public JournalKpiDTO getJournalKpi(@PathParam("journalId") String journalId) {
        LOG.debugf("Getting KPI for journal: %s", journalId);

        JournalEntity journal = journalPersistenceService.findJournalById(journalId)
            .orElseThrow(() -> new WebApplicationException("Journal not found: " + journalId, 404));

        java.math.BigDecimal assets      = journalPersistenceService.sumByAccountType(journalId, "ASSET")
                                    .add(journalPersistenceService.sumByAccountType(journalId, "CASH"));
        java.math.BigDecimal liabilities = journalPersistenceService.sumByAccountType(journalId, "LIABILITY");
        java.math.BigDecimal equity      = journalPersistenceService.sumByAccountType(journalId, "EQUITY");
        java.math.BigDecimal revenue     = journalPersistenceService.sumByAccountType(journalId, "REVENUE");
        java.math.BigDecimal expenses    = journalPersistenceService.sumByAccountType(journalId, "EXPENSE");

        return new JournalKpiDTO(assets, liabilities, equity, revenue, expenses, journal.getCurrency());
    }

    /**
     * Deletes a journal and all its related data (accounts, transactions, entries, tags).
     * 
     * @param journalId the ID of the journal to delete
     * @return confirmation message
     */
    @DELETE
    @Path("/{journalId}")
    public Map<String, Object> deleteJournal(@PathParam("journalId") String journalId) {
        LOG.infof("Deleting journal: %s", journalId);
        
        try {
            // Verify journal exists
            JournalEntity journal = journalPersistenceService.findJournalById(journalId)
                .orElseThrow(() -> new WebApplicationException("Journal not found: " + journalId, 404));

            // Delete the owned graph through managed JPA entities.
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
    public JournalDTO createJournal(CreateJournalRequest request) {
        LOG.infof("Creating new journal: %s", request.title());
        
        try {
            JournalEntity savedJournal = journalCreationService.createJournal(request);
            
            LOG.infof("Successfully created journal: %s with ID: %s", savedJournal.getTitle(), savedJournal.getId());
            
            return new JournalDTO(
                savedJournal.getId(),
                savedJournal.getLogo(),
                savedJournal.getTitle(),
                savedJournal.getSubtitle(),
                savedJournal.getCurrency(),
                savedJournal.getCommodities(),
                savedJournal.getPreviousJournalId()
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

    /**
     * Exports a journal as a plain-text journal file.
     * Loads journal metadata, accounts, and all transactions from the database,
     * reconstructs the Journal model, and serializes it.
     *
     * @param journalId the journal ID
     * @param includeTransactions if false, transactions are omitted (default true)
     * @return the journal file content as plain text
     */
    @GET
    @Path("/{journalId}/export")
    @Produces(MediaType.TEXT_PLAIN)
    public String exportJournal(@PathParam("journalId") String journalId,
                                @QueryParam("includeTransactions") Boolean includeTransactions) {
        boolean withTransactions = includeTransactions == null || includeTransactions;
        LOG.infof("Exporting journal: %s (includeTransactions=%s)", journalId, withTransactions);

        JournalEntity journalEntity = journalPersistenceService.findJournalById(journalId)
            .orElseThrow(() -> new WebApplicationException("Journal not found: " + journalId, 404));

        java.util.List<dev.abstratium.abstraccount.entity.AccountEntity> accountEntities =
            journalPersistenceService.loadAllAccounts(journalId);

        // Build account model objects, preserving hierarchy
        // Sort by depth to ensure parents are processed before children
        Map<String, Integer> accountDepthMap = new HashMap<>();
        for (dev.abstratium.abstraccount.entity.AccountEntity ae : accountEntities) {
            int depth = 0;
            String parentId = ae.getParentAccountId();
            while (parentId != null) {
                depth++;
                final String pid = parentId;
                dev.abstratium.abstraccount.entity.AccountEntity parent = accountEntities.stream()
                    .filter(a -> a.getId().equals(pid)).findFirst().orElse(null);
                parentId = parent != null ? parent.getParentAccountId() : null;
            }
            accountDepthMap.put(ae.getId(), depth);
        }
        Map<String, dev.abstratium.abstraccount.model.Account> accountModelMap = new HashMap<>();
        accountEntities.stream()
            .sorted((a, b) -> Integer.compare(
                accountDepthMap.getOrDefault(a.getId(), 0),
                accountDepthMap.getOrDefault(b.getId(), 0)))
            .forEach(ae -> {
                dev.abstratium.abstraccount.model.Account parent = null;
                if (ae.getParentAccountId() != null) {
                    parent = accountModelMap.get(ae.getParentAccountId());
                }
                dev.abstratium.abstraccount.model.Account accountModel = parent == null
                    ? dev.abstratium.abstraccount.model.Account.root(ae.getId(), ae.getName(), ae.getType(), ae.getNote())
                    : dev.abstratium.abstraccount.model.Account.child(ae.getId(), ae.getName(), ae.getType(), ae.getNote(), parent);
                accountModelMap.put(ae.getId(), accountModel);
            });

        // Load all transactions with entries and tags
        java.util.List<dev.abstratium.abstraccount.entity.EntryEntity> entryEntities =
            journalPersistenceService.queryEntriesWithFilters(journalId, null, null, null, null, null, null, null, null, null);

        // Deduplicate to get unique transactions, ordered by date and transactionOrder
        Map<String, dev.abstratium.abstraccount.entity.TransactionEntity> transactionMap = new java.util.LinkedHashMap<>();
        for (dev.abstratium.abstraccount.entity.EntryEntity entry : entryEntities) {
            transactionMap.putIfAbsent(entry.getTransaction().getId(), entry.getTransaction());
        }

        // Build transaction model objects
        List<dev.abstratium.abstraccount.model.Transaction> transactions = new ArrayList<>();
        for (dev.abstratium.abstraccount.entity.TransactionEntity txEntity : transactionMap.values()) {
            List<dev.abstratium.abstraccount.model.Tag> tags = txEntity.getTags().stream()
                .map(tag -> dev.abstratium.abstraccount.model.Tag.keyValue(tag.getTagKey(), tag.getTagValue()))
                .collect(Collectors.toList());

            List<dev.abstratium.abstraccount.model.Entry> entries = txEntity.getEntries().stream()
                .sorted((a, b) -> Integer.compare(a.getEntryOrder(), b.getEntryOrder()))
                .map(entry -> {
                    dev.abstratium.abstraccount.model.Account account = accountModelMap.get(entry.getAccountId());
                    if (account == null) {
                        // Fallback: create a minimal account if not found
                        account = dev.abstratium.abstraccount.model.Account.root(
                            entry.getAccountId(), "Unknown", dev.abstratium.abstraccount.model.AccountType.ASSET, null);
                    }
                    return dev.abstratium.abstraccount.model.Entry.simple(
                        account,
                        dev.abstratium.abstraccount.model.Amount.of(entry.getCommodity(), entry.getAmount()));
                })
                .collect(Collectors.toList());

            transactions.add(new dev.abstratium.abstraccount.model.Transaction(
                txEntity.getTransactionDate(),
                txEntity.getStatus(),
                txEntity.getDescription(),
                txEntity.getPartnerId(),
                txEntity.getId(),
                tags,
                entries
            ));
        }

        // Build commodities list from journal entity
        List<dev.abstratium.abstraccount.model.Commodity> commodities = new ArrayList<>();
        for (var entry : journalEntity.getCommodities().entrySet()) {
            commodities.add(new dev.abstratium.abstraccount.model.Commodity(
                entry.getKey(), new java.math.BigDecimal(entry.getValue())));
        }

        // Build account list preserving original order
        List<dev.abstratium.abstraccount.model.Account> accounts = accountEntities.stream()
            .sorted((a, b) -> Integer.compare(
                a.getAccountOrder() != null ? a.getAccountOrder() : 0,
                b.getAccountOrder() != null ? b.getAccountOrder() : 0))
            .map(ae -> accountModelMap.get(ae.getId()))
            .collect(Collectors.toList());

        Journal journal = new Journal(
            journalEntity.getLogo(),
            journalEntity.getTitle(),
            journalEntity.getSubtitle(),
            journalEntity.getCurrency(),
            commodities,
            accounts,
            withTransactions ? transactions : List.of()
        );

        String content = journalSerializer.serialize(journal);
        LOG.infof("Successfully exported journal: %s (%d accounts, %d transactions)",
            journalId, accounts.size(), withTransactions ? transactions.size() : 0);
        return content;
    }
}
