package dev.abstratium.abstraccount.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import com.google.common.annotations.VisibleForTesting;

import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.transaction.Transactional;

/**
 * Service for persisting and loading journal data.
 * Provides methods to load journal metadata, accounts, and transactions with date filtering.
 */
@ApplicationScoped
public class JournalPersistenceService {
    
    @Inject
    EntityManager entityManager;
    
    /**
     * Finds all journals in the database.
     * 
     * @return List of all journals
     */
    @Transactional
    public List<JournalEntity> findAllJournals() {
        TypedQuery<JournalEntity> query = entityManager.createQuery(
            "SELECT j FROM JournalEntity j ORDER BY j.title", JournalEntity.class);
        return query.getResultList();
    }
    
    /**
     * Finds a journal by its ID.
     * 
     * @param journalId the journal ID
     * @return Optional containing the journal, or empty if not found
     */
    @Transactional
    public Optional<JournalEntity> findJournalById(String journalId) {
        JournalEntity journal = entityManager.find(JournalEntity.class, journalId);
        return Optional.ofNullable(journal);
    }
    
    /**
     * Loads all accounts for a specific journal.
     * Accounts are loaded without their transactions/entries.
     * 
     * @return List of all accounts
     */
    @Transactional
    public List<AccountEntity> loadAllAccounts(String journalId) {
        return entityManager.createQuery(
            "SELECT a FROM AccountEntity a WHERE a.journalId = :journalId ORDER BY a.name", 
            AccountEntity.class)
            .setParameter("journalId", journalId)
            .getResultList();
    }
    
    /**
     * Loads entries within a date range.
     * The from date is inclusive, the to date is exclusive.
     * Transactions, entries, and tags are all eagerly loaded.
     * 
     * @param from the start date (inclusive)
     * @param to the end date (exclusive)
     * @return List of entries within the date range
     */
    @Transactional
    public List<EntryEntity> loadEntriesBetweenDates(String journalId, LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("From and to dates must not be null");
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("From date must not be after to date");
        }
        
        return entityManager.createQuery(
            "SELECT e FROM EntryEntity e " +
            "JOIN FETCH e.transaction t " +
            "WHERE t.transactionDate >= :from AND t.transactionDate < :to " +
            "ORDER BY t.transactionDate, t.id, e.entryOrder",
            EntryEntity.class)
            .setParameter("from", from)
            .setParameter("to", to)
            .getResultList();
    }
    
    /**
     * Saves or updates a journal entity.
     * 
     * @param journal the journal to save
     * @return the persisted journal
     */
    @Transactional
    public JournalEntity saveJournal(JournalEntity journal) {
        if (journal.getId() == null) {
            entityManager.persist(journal);
            return journal;
        } else {
            return entityManager.merge(journal);
        }
    }
    
    /**
     * Saves or updates an account entity.
     * 
     * @param account the account to save
     * @return the persisted account
     */
    @Transactional
    public AccountEntity saveAccount(AccountEntity account) {
        if (account.getId() == null) {
            entityManager.persist(account);
            return account;
        } else {
            return entityManager.merge(account);
        }
    }
    
    /**
     * Saves or updates a transaction entity.
     * 
     * @param transaction the transaction to save
     * @return the persisted transaction
     */
    @Transactional
    public TransactionEntity saveTransaction(TransactionEntity transaction) {
        if (transaction.getId() == null) {
            entityManager.persist(transaction);
            return transaction;
        } else {
            return entityManager.merge(transaction);
        }
    }
    
    /**
     * Queries entries with optional filters.
     * Can also be used to search for transactions, by simply deduplicating the accounts that are in the result!
     * 
     * @param journalId the journal ID (required)
     * @param startDate inclusive start date filter (optional)
     * @param endDate exclusive end date filter (optional)
     * @param partnerId partner ID filter (optional, can contain SQL wildcards)
     * @param status transaction status filter (optional)
     * @param accountNumbers list of account numbers to filter by (optional)
     * @param tagKeys list of tag keys to filter by (optional, matches if transaction has any of these keys)
     * @param tagKeyValuePairs map of tag key-value pairs to filter by (optional, value can contain SQL wildcards)
     * @param notTagKeys list of tag keys to exclude (optional, matches if transaction does NOT have these keys)
     * @param notTagKeyValuePairs map of tag key-value pairs to exclude (optional, value can contain SQL wildcards)
     * @return list of matching entries with their transactions eagerly loaded
     */
    @Transactional
    public List<EntryEntity> queryEntriesWithFilters(
            String journalId,
            LocalDate startDate,
            LocalDate endDate,
            String partnerId,
            String status,
            List<String> accountIds,
            List<String> tagKeys,
            java.util.Map<String, String> tagKeyValuePairs,
            List<String> notTagKeys,
            java.util.Map<String, String> notTagKeyValuePairs) {
        
        StringBuilder jpql = new StringBuilder(
            "SELECT e FROM EntryEntity e " +
            "JOIN FETCH e.transaction t " +
            "WHERE t.journalId = :journalId"
        );
        
        if (startDate != null) {
            jpql.append(" AND t.transactionDate >= :startDate");
        }
        if (endDate != null) {
            jpql.append(" AND t.transactionDate < :endDate");
        }
        if (partnerId != null) {
            jpql.append(" AND t.partnerId LIKE :partnerId");
        }
        if (status != null) {
            jpql.append(" AND t.status = :status");
        }
        if (accountIds != null && !accountIds.isEmpty()) {
            jpql.append(" AND e.accountId IN :accountIds");
        }
        
        // Positive tag filtering: transaction must have tags matching the criteria
        if ((tagKeys != null && !tagKeys.isEmpty()) || (tagKeyValuePairs != null && !tagKeyValuePairs.isEmpty())) {
            jpql.append(" AND EXISTS (SELECT tag FROM TagEntity tag WHERE tag.transaction = t");
            
            if (tagKeys != null && !tagKeys.isEmpty()) {
                jpql.append(" AND tag.tagKey IN :tagKeys");
            }
            
            if (tagKeyValuePairs != null && !tagKeyValuePairs.isEmpty()) {
                int idx = 0;
                for (var entry : tagKeyValuePairs.entrySet()) {
                    jpql.append(" AND EXISTS (SELECT tag2 FROM TagEntity tag2 WHERE tag2.transaction = t");
                    jpql.append(" AND tag2.tagKey = :tagKey").append(idx);
                    jpql.append(" AND tag2.tagValue LIKE :tagValue").append(idx).append(")");
                    idx++;
                }
            }
            
            jpql.append(")");
        }
        
        // Negative tag filtering: transaction must NOT have tags matching the criteria
        if (notTagKeys != null && !notTagKeys.isEmpty()) {
            jpql.append(" AND NOT EXISTS (SELECT tag FROM TagEntity tag WHERE tag.transaction = t");
            jpql.append(" AND tag.tagKey IN :notTagKeys)");
        }
        
        if (notTagKeyValuePairs != null && !notTagKeyValuePairs.isEmpty()) {
            int idx = 0;
            for (var entry : notTagKeyValuePairs.entrySet()) {
                jpql.append(" AND NOT EXISTS (SELECT tag FROM TagEntity tag WHERE tag.transaction = t");
                jpql.append(" AND tag.tagKey = :notTagKey").append(idx);
                jpql.append(" AND tag.tagValue LIKE :notTagValue").append(idx).append(")");
                idx++;
            }
        }
        
        jpql.append(" ORDER BY t.transactionDate DESC, t.id, e.entryOrder");
        
        var query = entityManager.createQuery(jpql.toString(), EntryEntity.class)
            .setParameter("journalId", journalId);
        
        if (startDate != null) {
            query.setParameter("startDate", startDate);
        }
        if (endDate != null) {
            query.setParameter("endDate", endDate);
        }
        if (partnerId != null) {
            query.setParameter("partnerId", partnerId);
        }
        if (status != null) {
            query.setParameter("status", dev.abstratium.abstraccount.model.TransactionStatus.valueOf(status));
        }
        if (accountIds != null && !accountIds.isEmpty()) {
            query.setParameter("accountIds", accountIds);
        }
        if (tagKeys != null && !tagKeys.isEmpty()) {
            query.setParameter("tagKeys", tagKeys);
        }
        if (tagKeyValuePairs != null && !tagKeyValuePairs.isEmpty()) {
            int idx = 0;
            for (var entry : tagKeyValuePairs.entrySet()) {
                query.setParameter("tagKey" + idx, entry.getKey());
                query.setParameter("tagValue" + idx, entry.getValue());
                idx++;
            }
        }
        if (notTagKeys != null && !notTagKeys.isEmpty()) {
            query.setParameter("notTagKeys", notTagKeys);
        }
        if (notTagKeyValuePairs != null && !notTagKeyValuePairs.isEmpty()) {
            int idx = 0;
            for (var entry : notTagKeyValuePairs.entrySet()) {
                query.setParameter("notTagKey" + idx, entry.getKey());
                query.setParameter("notTagValue" + idx, entry.getValue());
                idx++;
            }
        }
        
        return query.getResultList();
    }
    
    /**
     * Gets all distinct tag keys and values for a journal.
     * 
     * @param journalId the journal ID
     * @return list of distinct tag key-value pairs
     */
    @Transactional
    public List<Object[]> getDistinctTags(String journalId) {
        return entityManager.createQuery(
            "SELECT DISTINCT tag.tagKey, tag.tagValue FROM TagEntity tag " +
            "WHERE tag.transaction.journalId = :journalId " +
            "ORDER BY tag.tagKey, tag.tagValue",
            Object[].class)
            .setParameter("journalId", journalId)
            .getResultList();
    }
    
    /**
     * Gets all distinct tag keys across all journals.
     * Returns only the unique tag keys, regardless of their values.
     * 
     * @return list of distinct tag keys
     */
    @Transactional
    public List<String> getAllDistinctTagKeys() {
        return entityManager.createQuery(
            "SELECT DISTINCT tag.tagKey FROM TagEntity tag " +
            "ORDER BY tag.tagKey",
            String.class)
            .getResultList();
    }
    
    /**
     * Deletes a specific journal and all its related data (accounts, transactions, entries, tags).
     * Uses cascade deletion to delete all related data.
     * 
     * @param journalId the ID of the journal to delete
     */
    @Transactional
    public void deleteJournal(String journalId) {
        JournalEntity journal = entityManager.find(JournalEntity.class, journalId);
        entityManager.remove(journal);
    }
    
    /**
     * Deletes all data from the database using cascade deletion.
     * Useful for testing.
     */
    @Transactional
    @VisibleForTesting
    public void deleteAll() {
        entityManager.createQuery("DELETE FROM JournalEntity").executeUpdate();
    }
}
