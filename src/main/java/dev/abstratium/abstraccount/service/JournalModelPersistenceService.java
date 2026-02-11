package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.*;
import dev.abstratium.abstraccount.model.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.util.HashMap;
import java.util.LinkedHashMap;
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
        
        // Deduplicate accounts by account number (keep first occurrence)
        Map<String, Account> uniqueAccounts = new LinkedHashMap<>();
        for (Account account : journal.accounts()) {
            uniqueAccounts.putIfAbsent(account.accountNumber(), account);
        }
        
        // Save all unique accounts
        for (Account account : uniqueAccounts.values()) {
            AccountEntity accountEntity = new AccountEntity();
            accountEntity.setAccountNumber(account.accountNumber());
            accountEntity.setFullName(account.fullName());
            accountEntity.setType(account.type());
            accountEntity.setNote(account.note());
            accountEntity.setParentAccountNumber(account.parent() != null ? account.parent().accountNumber() : null);
            accountEntity.setJournalId(journalId);
            
            persistenceService.saveAccount(accountEntity);
        }
        LOG.infof("Saving %d accounts (from %d total including duplicates)", uniqueAccounts.size(), journal.accounts().size());
        
        // Save all transactions with postings and tags
        for (Transaction transaction : journal.transactions()) {
            TransactionEntity transactionEntity = new TransactionEntity();
            transactionEntity.setTransactionDate(transaction.transactionDate());
            transactionEntity.setStatus(transaction.status());
            transactionEntity.setDescription(transaction.description());
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
}
