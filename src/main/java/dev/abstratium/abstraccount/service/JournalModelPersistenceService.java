package dev.abstratium.abstraccount.service;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.jboss.logging.Logger;

import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TagEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.Account;
import dev.abstratium.abstraccount.model.Commodity;
import dev.abstratium.abstraccount.model.Entry;
import dev.abstratium.abstraccount.model.Journal;
import dev.abstratium.abstraccount.model.Tag;
import dev.abstratium.abstraccount.model.Transaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

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
     * in a single transaction.
     * 
     * @param journal the journal model to persist
     */
    @Transactional
    public void persistJournalModel(Journal journal) {
        LOG.infof("Persisting journal model: %s", journal.title());
        
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
        
        LOG.infof("Saving %d accounts", journal.accounts().size());

        // Deduplicate accounts by ID, keeping first occurrence
        Map<String, Account> uniqueAccounts = new LinkedHashMap<>();
        for (Account account : journal.accounts()) {
            uniqueAccounts.putIfAbsent(account.id(), account);
        }
        
        // Sort accounts by depth to ensure parents are saved before children
        List<Account> sortedAccounts = uniqueAccounts.values().stream()
            .sorted((a1, a2) -> Integer.compare(a1.getDepth(), a2.getDepth()))
            .toList();
        
        // Map to track accounts -> entity ID for parent lookups
        Map<String, AccountEntity> accountIdMap = new HashMap<>();
        
        // Save all unique accounts in depth order
        for (Account account : sortedAccounts) {
            AccountEntity accountEntity = new AccountEntity();
            accountEntity.setId(account.id());
            accountEntity.setJournalId(journalId);
            accountEntity.setName(account.name());
            accountEntity.setParentAccountId(account.parent() == null ? null : account.parent().id());
            accountEntity.setType(account.type());
            accountEntity.setNote(account.note());
            AccountEntity saved = persistenceService.saveAccount(accountEntity);
            accountIdMap.put(account.id(), saved);
        }
        
        // Save all transactions with entries and tags
        for (Transaction transaction : journal.transactions()) {
            TransactionEntity transactionEntity = new TransactionEntity();
            transactionEntity.setTransactionDate(transaction.date());
            transactionEntity.setStatus(transaction.status());
            transactionEntity.setDescription(transaction.description());
            transactionEntity.setPartnerId(transaction.partnerId());
            transactionEntity.setTransactionId(transaction.id());
            transactionEntity.setJournalId(journalId);
            
            // Add entries
            int entryOrder = 0;
            for (Entry entry : transaction.entries()) {
                EntryEntity entryEntity = new EntryEntity();
                entryEntity.setAccountId(entry.account().id());
                entryEntity.setCommodity(entry.amount().commodity());
                entryEntity.setAmount(entry.amount().quantity());
                entryEntity.setNote(entry.note());
                entryEntity.setEntryOrder(entryOrder++);
                
                transactionEntity.addEntry(entryEntity);
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
