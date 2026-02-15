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
            "SELECT p FROM EntryEntity p " +
            "JOIN FETCH p.transaction t " +
            "WHERE t.transactionDate >= :from AND t.transactionDate < :to " +
            "ORDER BY t.transactionDate, t.id, p.entryOrder",
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
     * @param partnerId partner ID filter (optional)
     * @param status transaction status filter (optional)
     * @param accountNumbers list of account numbers to filter by (optional)
     * @return list of matching entries with their transactions eagerly loaded
     */
    @Transactional
    public List<EntryEntity> queryEntriesWithFilters(
            String journalId,
            LocalDate startDate,
            LocalDate endDate,
            String partnerId,
            String status,
            List<String> accountNumbers) {
        
        StringBuilder jpql = new StringBuilder(
            "SELECT p FROM EntryEntity p " +
            "JOIN FETCH p.transaction t " +
            "WHERE t.journalId = :journalId"
        );
        
        if (startDate != null) {
            jpql.append(" AND t.transactionDate >= :startDate");
        }
        if (endDate != null) {
            jpql.append(" AND t.transactionDate < :endDate");
        }
        if (partnerId != null) {
            jpql.append(" AND t.partnerId = :partnerId");
        }
        if (status != null) {
            jpql.append(" AND t.status = :status");
        }
        if (accountNumbers != null && !accountNumbers.isEmpty()) {
            jpql.append(" AND p.accountNumber IN :accountNumbers");
        }

        // TODO extend with tag filters too
        
        jpql.append(" ORDER BY t.transactionDate DESC, t.id, p.entryOrder");
        
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
        if (accountNumbers != null && !accountNumbers.isEmpty()) {
            query.setParameter("accountNumbers", accountNumbers);
        }
        
        return query.getResultList();
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
