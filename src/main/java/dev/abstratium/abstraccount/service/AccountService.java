package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.AccountEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Service for managing accounts.
 */
@ApplicationScoped
public class AccountService {
    
    private static final Logger LOG = Logger.getLogger(AccountService.class);
    
    @PersistenceContext
    EntityManager em;
    
    /**
     * Loads all accounts for a given journal.
     * 
     * @param journalId the journal ID
     * @return list of all accounts
     */
    @Transactional
    public List<AccountEntity> loadAllAccounts(String journalId) {
        LOG.debugf("Loading all accounts for journal: %s", journalId);
        return em.createQuery(
            "SELECT a FROM AccountEntity a WHERE a.journalId = :journalId ORDER BY a.accountOrder",
            AccountEntity.class
        )
        .setParameter("journalId", journalId)
        .getResultList();
    }
    
    /**
     * Finds an account by its code path (e.g., "1:10:100:1020").
     * The code path is built from the account hierarchy where each level's code
     * is the first word of the account name.
     * 
     * @param journalId the journal ID
     * @param codePath the code path to search for
     * @param filterRegex optional regex filter that the code path must match
     * @return the matching account entity
     * @throws IllegalArgumentException if no account or multiple accounts match
     */
    @Transactional
    public AccountEntity findAccountByCodePath(String journalId, String codePath, String filterRegex) {
        LOG.debugf("Finding account by code path: %s in journal: %s", codePath, journalId);
        
        // Validate filter if provided
        if (filterRegex != null && !filterRegex.isEmpty()) {
            try {
                Pattern pattern = Pattern.compile(filterRegex);
                if (!pattern.matcher(codePath).matches()) {
                    throw new IllegalArgumentException(
                        String.format("Code path '%s' does not match required filter '%s'", codePath, filterRegex)
                    );
                }
            } catch (java.util.regex.PatternSyntaxException e) {
                throw new IllegalArgumentException("Invalid filter regex: " + filterRegex, e);
            }
        }
        
        // Load all accounts and build code paths
        List<AccountEntity> allAccounts = loadAllAccounts(journalId);
        List<AccountEntity> matches = new ArrayList<>();
        
        for (AccountEntity account : allAccounts) {
            String accountCodePath = buildCodePath(account, allAccounts);
            if (accountCodePath.equals(codePath)) {
                matches.add(account);
            }
        }
        
        if (matches.isEmpty()) {
            throw new IllegalArgumentException(
                String.format("No account found with code path '%s' in journal %s", codePath, journalId)
            );
        }
        
        if (matches.size() > 1) {
            throw new IllegalArgumentException(
                String.format("Multiple accounts (%d) found with code path '%s' in journal %s", 
                    matches.size(), codePath, journalId)
            );
        }
        
        LOG.debugf("Found account: %s (%s)", matches.get(0).getId(), matches.get(0).getName());
        return matches.get(0);
    }
    
    /**
     * Builds the code path for an account by traversing up the hierarchy.
     * Each level's code is the first word of the account name.
     */
    private String buildCodePath(AccountEntity account, List<AccountEntity> allAccounts) {
        List<String> codes = new ArrayList<>();
        AccountEntity current = account;
        
        while (current != null) {
            // Extract code (first word) from account name
            String name = current.getName();
            String code = name.indexOf(' ') > -1 ? name.substring(0, name.indexOf(' ')) : name;
            codes.add(0, code); // Add to beginning
            
            // Find parent
            String parentId = current.getParentAccountId();
            current = null;
            if (parentId != null) {
                for (AccountEntity acc : allAccounts) {
                    if (acc.getId().equals(parentId)) {
                        current = acc;
                        break;
                    }
                }
            }
        }
        
        return String.join(":", codes);
    }
    
    /**
     * Creates a new account.
     * 
     * @param account the account entity to create
     * @return the created account entity
     */
    @Transactional
    public AccountEntity createAccount(AccountEntity account) {
        LOG.debugf("Creating account: %s in journal: %s", account.getName(), account.getJournalId());
        em.persist(account);
        em.flush();
        return account;
    }
    
    /**
     * Updates an existing account.
     * 
     * @param accountId the account ID
     * @param updatedAccount the updated account data
     * @return the updated account entity
     */
    @Transactional
    public AccountEntity updateAccount(String accountId, AccountEntity updatedAccount) {
        LOG.debugf("Updating account: %s", accountId);
        
        AccountEntity account = em.find(AccountEntity.class, accountId);
        if (account == null) {
            throw new IllegalArgumentException("Account not found: " + accountId);
        }
        
        account.setName(updatedAccount.getName());
        account.setType(updatedAccount.getType());
        account.setNote(updatedAccount.getNote());
        account.setParentAccountId(updatedAccount.getParentAccountId());
        account.setAccountOrder(updatedAccount.getAccountOrder());
        
        em.merge(account);
        em.flush();
        return account;
    }
    
    /**
     * Deletes an account. Only leaf accounts (accounts without children) can be deleted.
     * 
     * @param accountId the account ID
     * @param journalId the journal ID (for validation)
     * @throws IllegalArgumentException if account has children or doesn't exist
     */
    @Transactional
    public void deleteAccount(String accountId, String journalId) {
        LOG.debugf("Deleting account: %s from journal: %s", accountId, journalId);
        
        AccountEntity account = em.find(AccountEntity.class, accountId);
        if (account == null) {
            throw new IllegalArgumentException("Account not found: " + accountId);
        }
        
        if (!account.getJournalId().equals(journalId)) {
            throw new IllegalArgumentException("Account does not belong to the specified journal");
        }
        
        // Check if account has children
        List<AccountEntity> children = em.createQuery(
            "SELECT a FROM AccountEntity a WHERE a.parentAccountId = :accountId",
            AccountEntity.class
        )
        .setParameter("accountId", accountId)
        .getResultList();
        
        if (!children.isEmpty()) {
            throw new IllegalArgumentException(
                "Cannot delete account with children. Account has " + children.size() + " child account(s)."
            );
        }
        
        em.remove(account);
        em.flush();
    }
    
    /**
     * Checks if an account is a leaf account (has no children).
     * 
     * @param accountId the account ID
     * @return true if the account has no children, false otherwise
     */
    @Transactional
    public boolean isLeafAccount(String accountId) {
        long childCount = em.createQuery(
            "SELECT COUNT(a) FROM AccountEntity a WHERE a.parentAccountId = :accountId",
            Long.class
        )
        .setParameter("accountId", accountId)
        .getSingleResult();
        
        return childCount == 0;
    }
}
