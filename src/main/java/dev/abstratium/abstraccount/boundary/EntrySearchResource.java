package dev.abstratium.abstraccount.boundary;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import org.jboss.logging.Logger;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.adapters.PartnerDataAdapter;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.service.EntryQueryParser;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.WebApplicationException;
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

    @Inject
    EntryQueryParser entryQueryParser;
    
    /**
     * Gets all entries with EQL filtering.
     *
     * @param journalId required journal ID
     * @param accountId optional account ID pre-filter (applied at DB level)
     * @param filter    optional EQL filter expression (see docs/QUERY_LANGUAGE.md)
     * @return list of entry search DTOs
     */
    @GET
    @Path("/entries")
    public List<EntrySearchDTO> getAllEntries(
            @QueryParam("journalId") String journalId,
            @QueryParam("accountId") String accountId,
            @QueryParam("filter") String filter) {

        LOG.debugf("Getting entry search results: journalId=%s, accountId=%s, filter=%s",
                   journalId, accountId, filter);

        if (journalId == null || journalId.isBlank()) {
            throw new WebApplicationException(
                jakarta.ws.rs.core.Response.status(400)
                    .entity(new QueryErrorDTO("missing_parameter", "journalId is required", 0))
                    .type(MediaType.APPLICATION_JSON)
                    .build());
        }

        // Load accounts (needed both for DB query and for EQL predicate resolution)
        Map<String, AccountEntity> accountMap = new HashMap<>();
        Map<String, JournalEntity> journalMap = new HashMap<>();

        List<AccountEntity> accounts = journalPersistenceService.loadAllAccounts(journalId);
        accounts.forEach(acc -> accountMap.put(acc.getId(), acc));
        journalPersistenceService.findJournalById(journalId)
            .ifPresent(j -> journalMap.put(j.getId(), j));

        // Parse EQL filter into a predicate
        Predicate<TransactionEntity> txPredicate;
        try {
            txPredicate = entryQueryParser.parse(filter, accountMap);
        } catch (EntryQueryParser.QueryParseException e) {
            throw new WebApplicationException(
                jakarta.ws.rs.core.Response.status(400)
                    .entity(new QueryErrorDTO("query_parse_error", e.getMessage(), e.getPosition()))
                    .type(MediaType.APPLICATION_JSON)
                    .build());
        }

        // Broad DB query: journal + optional account pre-filter only
        List<String> accountIds = accountId != null && !accountId.isEmpty()
            ? List.of(accountId)
            : null;

        List<EntryEntity> entryEntities = journalPersistenceService.queryEntriesWithFilters(
            journalId, null, null, null, null, accountIds,
            null, null, null, null
        );

        LOG.debugf("Loaded %d accounts into map", accountMap.size());
        LOG.infof("Fetched %d entries from database for journalId=%s", entryEntities.size(), journalId);

        // Apply the EQL predicate per individual entry using a synthetic single-entry
        // transaction. This ensures that entry-level predicates (accountname, accounttype,
        // commodity, amount, note) filter to matching entries only — not all sibling entries
        // of a matching transaction. Transaction-level predicates (date, description, partner,
        // status, tag) still work correctly because the synthetic tx carries all those fields.
        List<EntrySearchDTO> result = new ArrayList<>();
        for (EntryEntity entry : entryEntities) {
            TransactionEntity tx = entry.getTransaction();

            // Build a synthetic transaction containing only this one entry
            TransactionEntity synthetic = new TransactionEntity();
            synthetic.setId(tx.getId());
            synthetic.setTransactionDate(tx.getTransactionDate());
            synthetic.setStatus(tx.getStatus());
            synthetic.setDescription(tx.getDescription());
            synthetic.setPartnerId(tx.getPartnerId());
            synthetic.setTransactionId(tx.getTransactionId());
            synthetic.setJournalId(tx.getJournalId());
            synthetic.setTags(tx.getTags());
            synthetic.getEntries().add(entry);

            if (!txPredicate.test(synthetic)) {
                continue;
            }
            AccountEntity account = accountMap.get(entry.getAccountId());
            JournalEntity journal = journalMap.get(tx.getJournalId());

            List<TagDTO> tags = tx.getTags().stream()
                .map(tag -> new TagDTO(tag.getTagKey(), tag.getTagValue()))
                .collect(Collectors.toList());

            String partnerName = tx.getPartnerId() != null
                ? partnerDataAdapter.getPartner(tx.getPartnerId()).map(p -> p.name()).orElse(null)
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

        LOG.infof("Returning %d entry search results for journalId=%s", result.size(), journalId);
        return result;
    }
}
