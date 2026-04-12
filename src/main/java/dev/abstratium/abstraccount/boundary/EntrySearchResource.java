package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
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
            @QueryParam("tagList") List<String> tagList) {
        
        LOG.debugf("Getting entry search results with filters: journalId=%s, accountId=%s, transactionId=%s, accountType=%s, tagList=%s", 
                   journalId, accountId, transactionId, accountType, tagList);
        
        // Parse dates
        LocalDate startLocalDate = startDate != null && !startDate.isEmpty() ? LocalDate.parse(startDate) : null;
        LocalDate endLocalDate = endDate != null && !endDate.isEmpty() ? LocalDate.parse(endDate) : null;
        
        // Parse tag filters
        TagFilter tagFilter = parseTagFilters(tagList);
        
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
            tagFilter.tagKeys,
            tagFilter.tagKeyValuePairs,
            tagFilter.notTagKeys,
            tagFilter.notTagKeyValuePairs
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
            
            // Apply regex tag filtering in memory
            if (!matchesRegexTagFilters(tx, tagFilter)) {
                filteredOut++;
                continue;
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
     * Record to hold parsed tag filter parameters.
     * Supports both exact matching (for DB query) and regex patterns (for in-memory filtering).
     */
    private record TagFilter(
        List<String> tagKeys,
        Map<String, String> tagKeyValuePairs,
        List<String> notTagKeys,
        Map<String, String> notTagKeyValuePairs,
        List<RegexTagFilter> regexTagFilters,         // Positive regex patterns
        List<RegexTagFilter> notRegexTagFilters        // Negative regex patterns (exclusions)
    ) {
        TagFilter {
            tagKeys = tagKeys != null ? new ArrayList<>(tagKeys) : new ArrayList<>();
            tagKeyValuePairs = tagKeyValuePairs != null ? new HashMap<>(tagKeyValuePairs) : new HashMap<>();
            notTagKeys = notTagKeys != null ? new ArrayList<>(notTagKeys) : new ArrayList<>();
            notTagKeyValuePairs = notTagKeyValuePairs != null ? new HashMap<>(notTagKeyValuePairs) : new HashMap<>();
            regexTagFilters = regexTagFilters != null ? new ArrayList<>(regexTagFilters) : new ArrayList<>();
            notRegexTagFilters = notRegexTagFilters != null ? new ArrayList<>(notRegexTagFilters) : new ArrayList<>();
        }
    }
    
    /**
     * Record for regex-based tag filtering.
     * @param keyPattern regex pattern for the tag key (null means match any key)
     * @param valuePattern regex pattern for the tag value (null means match any value)
     */
    private record RegexTagFilter(String keyPattern, String valuePattern) {}
    
    /**
     * Parse tag filters from a list of tag specifications.
     * Supports:
     * - "key:value" - matches transactions with this specific tag key-value pair
     * - "key" - matches transactions with this tag key (any value)
     * - "not:key:value" - excludes transactions with this specific tag key-value pair
     * - "not:key" - excludes transactions with this tag key (any value)
     * - Regex patterns like "YearEnd:.*", ".*:Reserve", etc.
     * 
     * @param tagList list of tag specifications (can be null or empty)
     * @return TagFilter containing parsed positive and negative filters
     */
    private TagFilter parseTagFilters(List<String> tagList) {
        List<String> tagKeys = new ArrayList<>();
        Map<String, String> tagKeyValuePairs = new HashMap<>();
        List<String> notTagKeys = new ArrayList<>();
        Map<String, String> notTagKeyValuePairs = new HashMap<>();
        List<RegexTagFilter> regexTagFilters = new ArrayList<>();
        List<RegexTagFilter> notRegexTagFilters = new ArrayList<>();
        
        if (tagList == null || tagList.isEmpty()) {
            return new TagFilter(tagKeys, tagKeyValuePairs, notTagKeys, notTagKeyValuePairs, regexTagFilters, notRegexTagFilters);
        }
        
        for (String tagSpec : tagList) {
            if (tagSpec == null || tagSpec.isEmpty()) {
                continue;
            }
            
            boolean isNegation = tagSpec.startsWith("not:");
            String actualSpec = isNegation ? tagSpec.substring(4) : tagSpec;
            
            if (actualSpec.isEmpty()) {
                continue;
            }
            
            // Check if this is a regex pattern (contains regex metacharacters)
            boolean isRegex = isRegexPattern(actualSpec);
            
            // Split on first colon to separate key from value
            int colonIndex = actualSpec.indexOf(':');
            
            if (colonIndex < 0) {
                // No colon - key only
                if (isRegex) {
                    // Key is a regex pattern
                    if (isNegation) {
                        notRegexTagFilters.add(new RegexTagFilter(actualSpec, null));
                    } else {
                        regexTagFilters.add(new RegexTagFilter(actualSpec, null));
                    }
                } else {
                    // Exact key match
                    if (isNegation) {
                        notTagKeys.add(actualSpec);
                    } else {
                        tagKeys.add(actualSpec);
                    }
                }
            } else {
                // Has key:value format
                String key = actualSpec.substring(0, colonIndex);
                String value = actualSpec.substring(colonIndex + 1);
                
                if (isRegex) {
                    // Either key or value contains regex
                    String keyPattern = isRegexPattern(key) ? key : null;
                    String valuePattern = isRegexPattern(value) ? value : null;
                    // If one part is not regex, treat it as exact match by escaping
                    if (keyPattern == null) keyPattern = "^" + Pattern.quote(key) + "$";
                    if (valuePattern == null) valuePattern = "^" + Pattern.quote(value) + "$";
                    
                    if (isNegation) {
                        notRegexTagFilters.add(new RegexTagFilter(keyPattern, valuePattern));
                    } else {
                        regexTagFilters.add(new RegexTagFilter(keyPattern, valuePattern));
                    }
                } else {
                    // Exact key:value match
                    if (isNegation) {
                        notTagKeyValuePairs.put(key, value);
                    } else {
                        tagKeyValuePairs.put(key, value);
                    }
                }
            }
        }
        
        return new TagFilter(tagKeys, tagKeyValuePairs, notTagKeys, notTagKeyValuePairs, regexTagFilters, notRegexTagFilters);
    }
    
    /**
     * Check if a string contains regex metacharacters.
     */
    private boolean isRegexPattern(String str) {
        if (str == null || str.isEmpty()) {
            return false;
        }
        // Check for common regex metacharacters
        return str.matches(".*[.*+?^${}()|\\[\\]\\\\].*");
    }
    
    /**
     * Check if a transaction matches all regex tag filters.
     * @return true if transaction matches all positive filters and none of the negative filters
     */
    private boolean matchesRegexTagFilters(TransactionEntity tx, TagFilter tagFilter) {
        if (tagFilter == null) {
            return true;
        }
        
        // Check positive regex filters (must match at least one of each)
        for (RegexTagFilter filter : tagFilter.regexTagFilters()) {
            boolean matches = tx.getTags().stream().anyMatch(tag -> {
                boolean keyMatches = filter.keyPattern() == null || 
                    tag.getTagKey().matches(filter.keyPattern());
                boolean valueMatches = filter.valuePattern() == null || 
                    tag.getTagValue().matches(filter.valuePattern());
                return keyMatches && valueMatches;
            });
            if (!matches) {
                return false; // Must match all positive filters
            }
        }
        
        // Check negative regex filters (must NOT match any)
        for (RegexTagFilter filter : tagFilter.notRegexTagFilters()) {
            boolean matches = tx.getTags().stream().anyMatch(tag -> {
                boolean keyMatches = filter.keyPattern() == null || 
                    tag.getTagKey().matches(filter.keyPattern());
                boolean valueMatches = filter.valuePattern() == null || 
                    tag.getTagValue().matches(filter.valuePattern());
                return keyMatches && valueMatches;
            });
            if (matches) {
                return false; // Must not match any negative filter
            }
        }
        
        return true;
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
        
        // Collect unique tags in "key:value" or "key" format for simple tags
        Set<String> uniqueTags = new java.util.HashSet<>();
        for (EntryEntity entry : entries) {
            TransactionEntity tx = entry.getTransaction();
            if (tx != null && tx.getTags() != null) {
                tx.getTags().forEach(tag -> {
                    String tagValue = tag.getTagValue();
                    // Simple tag: show just key (value is null, empty, or literal "null"/"undefined")
                    boolean isSimple = tagValue == null || tagValue.isEmpty() ||
                                       "null".equals(tagValue) || "undefined".equals(tagValue);
                    if (isSimple) {
                        uniqueTags.add(tag.getTagKey());
                    } else {
                        uniqueTags.add(tag.getTagKey() + ":" + tagValue);
                    }
                });
            }
        }
        
        return uniqueTags.stream().sorted().collect(Collectors.toList());
    }
}
