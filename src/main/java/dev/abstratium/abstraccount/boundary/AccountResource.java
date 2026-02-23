package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.adapters.PartnerDataAdapter;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.service.AccountService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST resource for account operations.
 */
@Path("/api/account")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class AccountResource {
    
    private static final Logger LOG = Logger.getLogger(AccountResource.class);
    
    @Inject
    AccountService accountService;
    
    @Inject
    dev.abstratium.abstraccount.service.JournalPersistenceService persistenceService;
    
    @Inject
    jakarta.persistence.EntityManager em;
    
    @Inject
    PartnerDataAdapter partnerDataAdapter;
    
    /**
     * Gets the account tree for a given journal.
     * 
     * @param journalId the journal ID
     * @return tree of accounts
     */
    @GET
    @Path("/{journalId}/tree")
    public List<AccountTreeDTO> getAccountTree(@PathParam("journalId") String journalId) {
        LOG.debugf("Getting account tree for journal: %s", journalId);
        
        List<AccountEntity> accounts = accountService.loadAllAccounts(journalId);
        
        // Build a map of accounts by ID
        Map<String, AccountEntity> accountMap = new HashMap<>();
        for (AccountEntity account : accounts) {
            accountMap.put(account.getId(), account);
        }
        
        // Build the tree
        List<AccountTreeDTO> roots = new ArrayList<>();
        for (AccountEntity account : accounts) {
            if (account.getParentAccountId() == null) {
                roots.add(buildTree(account, accountMap));
            }
        }
        
        return roots;
    }
    
    private AccountTreeDTO buildTree(AccountEntity account, Map<String, AccountEntity> accountMap) {
        List<AccountTreeDTO> children = new ArrayList<>();
        
        // Find all children of this account
        for (AccountEntity potential : accountMap.values()) {
            if (account.getId().equals(potential.getParentAccountId())) {
                children.add(buildTree(potential, accountMap));
            }
        }
        
        return new AccountTreeDTO(
            account.getId(),
            account.getName(),
            account.getType().name(),
            account.getNote(),
            account.getParentAccountId(),
            children
        );
    }
    
    /**
     * Gets account details by ID.
     * 
     * @param journalId the journal ID
     * @param accountId the account ID
     * @return account details
     */
    @GET
    @Path("/{journalId}/account/{accountId}")
    public AccountTreeDTO getAccountDetails(
            @PathParam("journalId") String journalId,
            @PathParam("accountId") String accountId) {
        LOG.debugf("Getting account details for: %s in journal: %s", accountId, journalId);
        
        AccountEntity account = em.find(AccountEntity.class, accountId);
        if (account == null || !account.getJournalId().equals(journalId)) {
            throw new jakarta.ws.rs.NotFoundException("Account not found");
        }
        
        return new AccountTreeDTO(
            account.getId(),
            account.getName(),
            account.getType().name(),
            account.getNote(),
            account.getParentAccountId(),
            List.of() // No children needed for single account view
        );
    }
    
    /**
     * Gets entries for a specific account with running balance.
     * 
     * @param journalId the journal ID
     * @param accountId the account ID
     * @return list of entries with running balance
     */
    @GET
    @Path("/{journalId}/account/{accountId}/entries")
    public List<AccountEntryDTO> getAccountEntries(
            @PathParam("journalId") String journalId,
            @PathParam("accountId") String accountId,
            @QueryParam("includeChildren") @DefaultValue("false") boolean includeChildren) {
        LOG.debugf("Getting entries for account: %s in journal: %s (includeChildren: %s)", accountId, journalId, includeChildren);
        
        // Determine which account IDs to query
        List<String> accountIds;
        if (includeChildren) {
            // Get all descendant account IDs
            accountIds = getAllDescendantAccountIds(journalId, accountId);
        } else {
            accountIds = List.of(accountId);
        }
        
        // Load all entries for these accounts using persistence service
        List<EntryEntity> entries = persistenceService.queryEntriesWithFilters(
            journalId,
            null, // startDate
            null, // endDate
            null, // partnerId
            null, // status
            accountIds,
            null, // no tag key filter
            null, // no tag key-value filter
            null, // no negated tag key filter
            null  // no negated tag key-value filter
        );
        
        // Calculate running balance
        List<AccountEntryDTO> result = new ArrayList<>();
        BigDecimal runningBalance = BigDecimal.ZERO;
        
        for (EntryEntity entry : entries) {
            TransactionEntity tx = entry.getTransaction();
            String partnerId = tx.getPartnerId();
            String partnerName = partnerId != null 
                ? partnerDataAdapter.getPartner(partnerId)
                    .map(p -> p.name())
                    .orElse(null)
                : null;
            
            result.add(new AccountEntryDTO(
                entry.getId(),
                tx.getTransactionId(),
                tx.getTransactionDate().toString(),
                tx.getDescription(),
                entry.getCommodity(),
                entry.getAmount(),
                runningBalance,
                entry.getNote(),
                entry.getAccountId(),
                partnerId,
                partnerName,
                tx.getStatus()
            ));
        }
        
        return result;
    }
    
    /**
     * Gets all descendant account IDs for a given account (children, grandchildren, etc.)
     */
    private List<String> getAllDescendantAccountIds(String journalId, String accountId) {
        List<String> result = new ArrayList<>();
        result.add(accountId); // Include the account itself
        
        // Load all accounts for this journal
        List<AccountEntity> allAccounts = accountService.loadAllAccounts(journalId);
        
        // Find all descendants recursively
        addDescendants(accountId, allAccounts, result);
        
        return result;
    }
    
    private void addDescendants(String parentId, List<AccountEntity> allAccounts, List<String> result) {
        for (AccountEntity account : allAccounts) {
            if (parentId.equals(account.getParentAccountId())) {
                result.add(account.getId());
                // Recursively add this account's descendants
                addDescendants(account.getId(), allAccounts, result);
            }
        }
    }
}
