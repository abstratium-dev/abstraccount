package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.*;
import dev.abstratium.abstraccount.model.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for persisting entire Journal models (from the model package) into JPA entities.
 * Handles conversion from immutable model objects to mutable entities.
 */
@ApplicationScoped
public class JournalModelPersistenceService {
    
    private static final Logger LOG = Logger.getLogger(JournalModelPersistenceService.class);
    
    @Inject
    JournalPersistenceService persistenceService;
    
    /**
     * Persists an entire journal model (journal metadata, accounts, and transactions)
     * in a single transaction. This will delete all existing data first.
     * 
     * @param journal the journal model to persist
     */
    @Transactional
    public void persistJournalModel(Journal journal) {
        LOG.infof("Persisting journal model: %s", journal.title());
        
        // Delete all existing data
        persistenceService.deleteAll();
        
        // Create and save journal entity
        JournalEntity journalEntity = new JournalEntity();
        journalEntity.setLogo(journal.logo());
        journalEntity.setTitle(journal.title());
        journalEntity.setSubtitle(journal.subtitle());
        journalEntity.setCurrency(journal.currency());
        
        // Convert commodities
        Map<String, String> commodities = new HashMap<>();
        for (Commodity commodity : journal.commodities()) {
            commodities.put(commodity.code(), commodity.displayPrecision().toPlainString());
        }
        journalEntity.setCommodities(commodities);
        
        JournalEntity savedJournal = persistenceService.saveJournal(journalEntity);
        String journalId = savedJournal.getId();
        LOG.infof("Saving journal metadata with ID: %s", journalId);
        
        // Deduplicate accounts by full name (keep first occurrence)
        Map<String, Account> uniqueAccounts = new LinkedHashMap<>();
        for (Account account : journal.accounts()) {
            uniqueAccounts.putIfAbsent(account.fullName(), account);
        }
        
        LOG.infof("Saving %d accounts (from %d total including duplicates)", uniqueAccounts.size(), journal.accounts().size());
        
        // Sort accounts by depth to ensure parents are saved before children
        List<Account> sortedAccounts = uniqueAccounts.values().stream()
            .sorted((a1, a2) -> Integer.compare(a1.getDepth(), a2.getDepth()))
            .toList();
        
        // Map to track account full name -> entity ID for parent lookups
        Map<String, String> accountIdMap = new HashMap<>();
        
        // Save all unique accounts in depth order
        for (Account account : sortedAccounts) {
            AccountEntity accountEntity = new AccountEntity();
            // Store as "accountNumber leafName" so getAccountNumber() returns the number
            String leafName = extractAccountName(account.fullName());
            // If leafName doesn't start with the account number, prepend it
            String accountName = leafName.startsWith(account.accountNumber() + " ") ? 
                leafName : account.accountNumber() + " " + leafName;
            accountEntity.setAccountName(accountName);
            accountEntity.setType(account.type());
            accountEntity.setNote(account.note());
            accountEntity.setJournalId(journalId);
            
            // Set parent account ID (foreign key to parent account)
            if (account.parent() != null) {
                String parentId = accountIdMap.get(account.parent().fullName());
                if (parentId == null) {
                    LOG.warnf("Parent account not found for '%s', parent='%s'", 
                        account.fullName(), account.parent().fullName());
                }
                accountEntity.setParentAccountId(parentId);
            }
            
            if (LOG.isDebugEnabled()) {
                String parentInfo = account.parent() != null ? 
                    String.format("parent='%s' (id=%s)", account.parent().fullName(), accountEntity.getParentAccountId()) : 
                    "parent=null";
                LOG.debugf("  Account: num=%s, name='%s', fullName='%s', type=%s, depth=%d, %s", 
                    account.accountNumber(), accountEntity.getAccountName(), account.fullName(), 
                    account.type(), account.getDepth(), parentInfo);
            }
            
            AccountEntity saved = persistenceService.saveAccount(accountEntity);
            accountIdMap.put(account.fullName(), saved.getId());
        }
        
        // Save all transactions with postings and tags
        for (Transaction transaction : journal.transactions()) {
            TransactionEntity transactionEntity = new TransactionEntity();
            transactionEntity.setTransactionDate(transaction.transactionDate());
            transactionEntity.setStatus(transaction.status());
            transactionEntity.setDescription(transaction.description());
            transactionEntity.setPartnerId(transaction.partnerId());
            transactionEntity.setTransactionId(transaction.id());
            transactionEntity.setJournalId(journalId);
            
            // Add postings
            int postingOrder = 0;
            for (Posting posting : transaction.postings()) {
                PostingEntity postingEntity = new PostingEntity();
                postingEntity.setAccountNumber(posting.account().accountNumber());
                postingEntity.setCommodity(posting.amount().commodity());
                postingEntity.setAmount(posting.amount().quantity());
                postingEntity.setNote(posting.note());
                postingEntity.setPostingOrder(postingOrder++);
                
                transactionEntity.addPosting(postingEntity);
            }
            
            // Add tags
            for (Tag tag : transaction.tags()) {
                TagEntity tagEntity = new TagEntity();
                tagEntity.setTagKey(tag.key());
                tagEntity.setTagValue(tag.value());
                
                transactionEntity.addTag(tagEntity);
            }
            
            persistenceService.saveTransaction(transactionEntity);
        }
        LOG.infof("Saving %d transactions", journal.transactions().size());
        
        LOG.infof("Ready to persisted journal model");
    }
    
    /**
     * Extract just the account's own name (last segment) from the full hierarchical name.
     * For example: "1 Assets:10 Cash:100 Bank" returns "100 Bank"
     */
    private String extractAccountName(String fullName) {
        int lastColon = fullName.lastIndexOf(':');
        return lastColon > 0 ? fullName.substring(lastColon + 1) : fullName;
    }
}
