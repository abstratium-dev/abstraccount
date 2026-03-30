package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.jboss.logging.Logger;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.adapters.PartnerDataAdapter;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

/**
 * REST resource for entry search operations.
 * Provides endpoints for searching and viewing entries with comprehensive filtering.
 */
@Path("/api/entry-search")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class EntrySearchResource {
    
    private static final Logger LOG = Logger.getLogger(EntrySearchResource.class);
    
    @Inject
    JournalPersistenceService journalPersistenceService;
    
    @Inject
    PartnerDataAdapter partnerDataAdapter;
    
    /**
     * Gets all entries with comprehensive filtering options.
     * 
     * @param journalId optional journal ID filter
     * @param accountId optional account ID filter
     * @param transactionId optional transaction ID filter
     * @param startDate optional start date filter (YYYY-MM-DD)
     * @param endDate optional end date filter (YYYY-MM-DD)
     * @param partnerId optional partner ID filter
     * @param status optional transaction status filter
     * @param commodity optional commodity filter
     * @param minAmount optional minimum amount filter
     * @param maxAmount optional maximum amount filter
     * @param accountType optional account type filter
     * @return list of entry search DTOs
     */
    @GET
    @Path("/entries")
    public List<EntrySearchDTO> getAllEntries(
            @QueryParam("journalId") String journalId,
            @QueryParam("accountId") String accountId,
            @QueryParam("transactionId") String transactionId,
            @QueryParam("startDate") String startDate,
            @QueryParam("endDate") String endDate,
            @QueryParam("partnerId") String partnerId,
            @QueryParam("status") String status,
            @QueryParam("commodity") String commodity,
            @QueryParam("minAmount") BigDecimal minAmount,
            @QueryParam("maxAmount") BigDecimal maxAmount,
            @QueryParam("accountType") String accountType,
            @QueryParam("tagPattern") String tagPattern) {
        
        LOG.debugf("Getting entry search results with filters: journalId=%s, accountId=%s, transactionId=%s, accountType=%s, tagPattern=%s", 
                   journalId, accountId, transactionId, accountType, tagPattern);
        
        // Parse dates
        LocalDate startLocalDate = startDate != null && !startDate.isEmpty() ? LocalDate.parse(startDate) : null;
        LocalDate endLocalDate = endDate != null && !endDate.isEmpty() ? LocalDate.parse(endDate) : null;
        
        // Query entries from database
        List<String> accountIds = accountId != null && !accountId.isEmpty() 
            ? List.of(accountId) 
            : null;
        
        List<EntryEntity> entryEntities = journalPersistenceService.queryEntriesWithFilters(
            journalId,
            startLocalDate,
            endLocalDate,
            partnerId,
            status,
            accountIds,
            null, // tagKeys
            null, // tagKeyValuePairs
            null, // notTagKeys
            null  // notTagKeyValuePairs
        );
        
        LOG.infof("Fetched %d entries from database for journalId=%s", entryEntities.size(), journalId);
        
        // Load all accounts for all journals (or specific journal if filtered)
        Map<String, AccountEntity> accountMap = new HashMap<>();
        Map<String, JournalEntity> journalMap = new HashMap<>();
        
        if (journalId != null && !journalId.isEmpty()) {
            List<AccountEntity> accounts = journalPersistenceService.loadAllAccounts(journalId);
            accounts.forEach(acc -> accountMap.put(acc.getId(), acc));
            
            journalPersistenceService.findJournalById(journalId)
                .ifPresent(j -> journalMap.put(j.getId(), j));
        } else {
            // Load all journals and their accounts
            List<JournalEntity> journals = journalPersistenceService.findAllJournals();
            for (JournalEntity journal : journals) {
                journalMap.put(journal.getId(), journal);
                List<AccountEntity> accounts = journalPersistenceService.loadAllAccounts(journal.getId());
                accounts.forEach(acc -> accountMap.put(acc.getId(), acc));
            }
        }
        
        LOG.debugf("Loaded %d accounts into map", accountMap.size());
        
        // Convert to DTOs with filtering
        List<EntrySearchDTO> result = new ArrayList<>();
        int filteredOut = 0;
        
        for (EntryEntity entry : entryEntities) {
            TransactionEntity tx = entry.getTransaction();
            AccountEntity account = accountMap.get(entry.getAccountId());
            
            // Apply additional filters
            if (transactionId != null && !transactionId.isEmpty() && !tx.getTransactionId().equals(transactionId)) {
                continue;
            }
            
            if (commodity != null && !commodity.isEmpty() && !entry.getCommodity().equals(commodity)) {
                continue;
            }
            
            if (minAmount != null && entry.getAmount().compareTo(minAmount) < 0) {
                continue;
            }
            
            if (maxAmount != null && entry.getAmount().compareTo(maxAmount) > 0) {
                continue;
            }
            
            if (accountType != null && !accountType.isEmpty()) {
                if (account == null || !account.getType().name().equalsIgnoreCase(accountType)) {
                    continue;
                }
            }
            
            // Filter by tag pattern (regex on "key:value" format)
            if (tagPattern != null && !tagPattern.isEmpty()) {
                boolean tagMatches = tx.getTags().stream()
                    .anyMatch(tag -> {
                        String tagString = tag.getTagKey() + ":" + tag.getTagValue();
                        try {
                            return tagString.matches(tagPattern);
                        } catch (Exception e) {
                            // Invalid regex, try literal match
                            return tagString.contains(tagPattern);
                        }
                    });
                if (!tagMatches) {
                    continue;
                }
            }
            
            // Get journal info
            JournalEntity journal = journalMap.get(tx.getJournalId());
            
            // Convert tags
            List<TagDTO> tags = tx.getTags().stream()
                .map(tag -> new TagDTO(tag.getTagKey(), tag.getTagValue()))
                .collect(Collectors.toList());
            
            // Get partner name
            String partnerName = tx.getPartnerId() != null 
                ? partnerDataAdapter.getPartner(tx.getPartnerId())
                    .map(p -> p.name())
                    .orElse(null)
                : null;
            
            result.add(new EntrySearchDTO(
                entry.getId(),
                entry.getEntryOrder(),
                entry.getCommodity(),
                entry.getAmount(),
                entry.getNote(),
                
                account != null ? account.getId() : entry.getAccountId(),
                account != null ? account.getName() : "",
                account != null ? account.getType().name() : "",
                account != null ? account.getNote() : "",
                account != null ? account.getParentAccountId() : "",
                
                tx.getTransactionId(),
                tx.getTransactionDate(),
                tx.getStatus().name(),
                tx.getDescription(),
                tx.getPartnerId(),
                partnerName,
                tags,
                
                journal != null ? journal.getId() : tx.getJournalId(),
                journal != null ? journal.getTitle() : "",
                journal != null ? journal.getCurrency() : ""
            ));
        }
        
        LOG.infof("Returning %d entry search results (filtered out %d)", result.size(), filteredOut);
        return result;
    }
    
    /**
     * Get all unique tags from transactions in a journal for autocomplete.
     * Returns tags in "key:value" format.
     */
    @GET
    @Path("/tags")
    public List<String> getAllTags(@QueryParam("journalId") String journalId) {
        if (journalId == null || journalId.isEmpty()) {
            return List.of();
        }
        
        // Get all entries for the journal
        List<EntryEntity> entries = journalPersistenceService.queryEntriesWithFilters(
            journalId, null, null, null, null, null, null, null, null, null
        );
        
        // Collect unique tags in "key:value" format
        Set<String> uniqueTags = new java.util.HashSet<>();
        for (EntryEntity entry : entries) {
            TransactionEntity tx = entry.getTransaction();
            if (tx != null && tx.getTags() != null) {
                tx.getTags().forEach(tag -> 
                    uniqueTags.add(tag.getTagKey() + ":" + tag.getTagValue())
                );
            }
        }
        
        return uniqueTags.stream().sorted().collect(Collectors.toList());
    }
}
