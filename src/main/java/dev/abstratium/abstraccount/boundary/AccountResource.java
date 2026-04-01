package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.adapters.PartnerDataAdapter;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.service.AccountService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
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
    
    /**
     * Creates a new account.
     * 
     * @param request the account creation request
     * @return the created account
     */
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response createAccount(CreateAccountRequestDTO request) {
        LOG.debugf("Creating account: %s in journal: %s", request.name(), request.journalId());
        
        try {
            // Validate journal exists
            if (!journalExists(request.journalId())) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity("Journal not found")
                    .build();
            }
            
            // Validate parent account if specified
            if (request.parentAccountId() != null && !request.parentAccountId().isEmpty()) {
                AccountEntity parent = em.find(AccountEntity.class, request.parentAccountId());
                if (parent == null || !parent.getJournalId().equals(request.journalId())) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Parent account not found or does not belong to the specified journal")
                        .build();
                }
            }
            
            // Create account entity
            AccountEntity account = new AccountEntity();
            account.setName(request.name());
            account.setType(AccountType.valueOf(request.type()));
            account.setNote(request.note());
            account.setParentAccountId(request.parentAccountId());
            account.setJournalId(request.journalId());
            account.setAccountOrder(request.accountOrder());
            
            AccountEntity created = accountService.createAccount(account);
            
            // Convert to DTO
            AccountTreeDTO dto = new AccountTreeDTO(
                created.getId(),
                created.getName(),
                created.getType().name(),
                created.getNote(),
                created.getParentAccountId(),
                List.of()
            );
            
            return Response.status(Response.Status.CREATED).entity(dto).build();
        } catch (IllegalArgumentException e) {
            LOG.error("Error creating account", e);
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(e.getMessage())
                .build();
        } catch (Exception e) {
            LOG.error("Error creating account", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity("Failed to create account")
                .build();
        }
    }
    
    /**
     * Updates an existing account.
     * 
     * @param accountId the account ID
     * @param request the account update request
     * @return the updated account
     */
    @PUT
    @Path("/{accountId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response updateAccount(
            @PathParam("accountId") String accountId,
            UpdateAccountRequestDTO request) {
        LOG.debugf("Updating account: %s", accountId);
        
        try {
            // Find existing account
            AccountEntity existing = em.find(AccountEntity.class, accountId);
            if (existing == null) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity("Account not found")
                    .build();
            }
            
            // Validate parent account if specified
            if (request.parentAccountId() != null && !request.parentAccountId().isEmpty()) {
                // Prevent setting self as parent
                if (request.parentAccountId().equals(accountId)) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Account cannot be its own parent")
                        .build();
                }
                
                AccountEntity parent = em.find(AccountEntity.class, request.parentAccountId());
                if (parent == null || !parent.getJournalId().equals(existing.getJournalId())) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Parent account not found or does not belong to the same journal")
                        .build();
                }
                
                // Prevent circular references (parent cannot be a descendant)
                if (isDescendant(accountId, request.parentAccountId())) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity("Cannot set a descendant account as parent (would create circular reference)")
                        .build();
                }
            }
            
            // Update account entity
            AccountEntity updated = new AccountEntity();
            updated.setName(request.name());
            updated.setType(AccountType.valueOf(request.type()));
            updated.setNote(request.note());
            updated.setParentAccountId(request.parentAccountId());
            updated.setAccountOrder(request.accountOrder());
            
            AccountEntity result = accountService.updateAccount(accountId, updated);
            
            // Convert to DTO
            AccountTreeDTO dto = new AccountTreeDTO(
                result.getId(),
                result.getName(),
                result.getType().name(),
                result.getNote(),
                result.getParentAccountId(),
                List.of()
            );
            
            return Response.ok(dto).build();
        } catch (IllegalArgumentException e) {
            LOG.error("Error updating account", e);
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(e.getMessage())
                .build();
        } catch (Exception e) {
            LOG.error("Error updating account", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity("Failed to update account")
                .build();
        }
    }
    
    /**
     * Deletes an account. Only leaf accounts (accounts without children) can be deleted.
     * 
     * @param journalId the journal ID
     * @param accountId the account ID
     * @return response indicating success or failure
     */
    @DELETE
    @Path("/{journalId}/account/{accountId}")
    public Response deleteAccount(
            @PathParam("journalId") String journalId,
            @PathParam("accountId") String accountId) {
        LOG.debugf("Deleting account: %s from journal: %s", accountId, journalId);
        
        try {
            accountService.deleteAccount(accountId, journalId);
            return Response.noContent().build();
        } catch (IllegalArgumentException e) {
            LOG.error("Error deleting account", e);
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(e.getMessage())
                .build();
        } catch (Exception e) {
            LOG.error("Error deleting account", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity("Failed to delete account")
                .build();
        }
    }
    
    /**
     * Checks if an account is a leaf account (has no children).
     * 
     * @param accountId the account ID
     * @return true if the account is a leaf, false otherwise
     */
    @GET
    @Path("/{accountId}/is-leaf")
    public Response isLeafAccount(@PathParam("accountId") String accountId) {
        try {
            boolean isLeaf = accountService.isLeafAccount(accountId);
            return Response.ok(Map.of("isLeaf", isLeaf)).build();
        } catch (Exception e) {
            LOG.error("Error checking if account is leaf", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity("Failed to check account status")
                .build();
        }
    }
    
    /**
     * Checks if a journal exists.
     */
    private boolean journalExists(String journalId) {
        return em.find(dev.abstratium.abstraccount.entity.JournalEntity.class, journalId) != null;
    }
    
    /**
     * Checks if potentialDescendant is a descendant of accountId.
     * Used to prevent circular references when updating parent relationships.
     */
    private boolean isDescendant(String accountId, String potentialDescendantId) {
        AccountEntity current = em.find(AccountEntity.class, potentialDescendantId);
        
        while (current != null) {
            if (current.getId().equals(accountId)) {
                return true;
            }
            
            String parentId = current.getParentAccountId();
            if (parentId == null) {
                break;
            }
            
            current = em.find(AccountEntity.class, parentId);
        }
        
        return false;
    }
}
