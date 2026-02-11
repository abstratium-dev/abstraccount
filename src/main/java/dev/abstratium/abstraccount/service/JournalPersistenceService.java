package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.TypedQuery;
import jakarta.transaction.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Service for persisting and loading journal data.
 * Provides methods to load journal metadata, accounts, and transactions with date filtering.
 */
@ApplicationScoped
public class JournalPersistenceService {
    
    @Inject
    EntityManager entityManager;
    
    /**
     * Loads the journal metadata.
     * Returns the first journal found, or empty if none exists.
     * 
     * @return Optional containing the journal, or empty if not found
     */
    @Transactional
    public Optional<JournalEntity> loadJournal() {
        TypedQuery<JournalEntity> query = entityManager.createQuery(
            "SELECT j FROM JournalEntity j", JournalEntity.class);
        query.setMaxResults(1);
        
        try {
            return Optional.of(query.getSingleResult());
        } catch (NoResultException e) {
            return Optional.empty();
        }
    }
    
    /**
     * Loads all accounts.
     * Accounts are loaded without their transactions/postings.
     * 
     * @return List of all accounts
     */
    @Transactional
    public List<AccountEntity> loadAllAccounts() {
        return entityManager.createQuery(
            "SELECT a FROM AccountEntity a ORDER BY a.accountNumber", 
            AccountEntity.class)
            .getResultList();
    }
    
    /**
     * Loads an account by its account number.
     * 
     * @param accountNumber the account number
     * @return Optional containing the account, or empty if not found
     */
    @Transactional
    public Optional<AccountEntity> loadAccountByNumber(String accountNumber) {
        TypedQuery<AccountEntity> query = entityManager.createQuery(
            "SELECT a FROM AccountEntity a WHERE a.accountNumber = :accountNumber",
            AccountEntity.class);
        query.setParameter("accountNumber", accountNumber);
        
        try {
            return Optional.of(query.getSingleResult());
        } catch (NoResultException e) {
            return Optional.empty();
        }
    }
    
    /**
     * Loads an account by its full name.
     * 
     * @param fullName the full account name
     * @return Optional containing the account, or empty if not found
     */
    @Transactional
    public Optional<AccountEntity> loadAccountByFullName(String fullName) {
        TypedQuery<AccountEntity> query = entityManager.createQuery(
            "SELECT a FROM AccountEntity a WHERE a.fullName = :fullName",
            AccountEntity.class);
        query.setParameter("fullName", fullName);
        
        try {
            return Optional.of(query.getSingleResult());
        } catch (NoResultException e) {
            return Optional.empty();
        }
    }
    
    /**
     * Loads postings within a date range.
     * The from date is inclusive, the to date is exclusive.
     * Transactions, postings, and tags are all eagerly loaded.
     * 
     * @param from the start date (inclusive)
     * @param to the end date (exclusive)
     * @return List of postings within the date range
     */
    @Transactional
    public List<PostingEntity> loadPostingsBetweenDates(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("From and to dates must not be null");
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("From date must not be after to date");
        }
        
        return entityManager.createQuery(
            "SELECT p FROM PostingEntity p " +
            "JOIN FETCH p.transaction t " +
            "WHERE t.transactionDate >= :from AND t.transactionDate < :to " +
            "ORDER BY t.transactionDate, t.id, p.postingOrder",
            PostingEntity.class)
            .setParameter("from", from)
            .setParameter("to", to)
            .getResultList();
    }
    
    /**
     * Loads all transactions within a date range.
     * The from date is inclusive, the to date is exclusive.
     * Transactions, postings, and tags are all eagerly loaded.
     * 
     * @param from the start date (inclusive)
     * @param to the end date (exclusive)
     * @return List of transactions within the date range
     */
    @Transactional
    public List<TransactionEntity> loadTransactionsBetweenDates(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("From and to dates must not be null");
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("From date must not be after to date");
        }
        
        // First fetch transactions with postings
        List<TransactionEntity> transactions = entityManager.createQuery(
            "SELECT DISTINCT t FROM TransactionEntity t " +
            "LEFT JOIN FETCH t.postings " +
            "WHERE t.transactionDate >= :from AND t.transactionDate < :to " +
            "ORDER BY t.transactionDate, t.id",
            TransactionEntity.class)
            .setParameter("from", from)
            .setParameter("to", to)
            .getResultList();
        
        // Then fetch tags for those transactions (if any exist)
        if (!transactions.isEmpty()) {
            entityManager.createQuery(
                "SELECT DISTINCT t FROM TransactionEntity t " +
                "LEFT JOIN FETCH t.tags " +
                "WHERE t IN :transactions",
                TransactionEntity.class)
                .setParameter("transactions", transactions)
                .getResultList();
        }
        
        return transactions;
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
     * Deletes all data from the database.
     * Useful for testing.
     */
    @Transactional
    public void deleteAll() {
        entityManager.createQuery("DELETE FROM PostingEntity").executeUpdate();
        entityManager.createQuery("DELETE FROM TagEntity").executeUpdate();
        entityManager.createQuery("DELETE FROM TransactionEntity").executeUpdate();
        entityManager.createQuery("DELETE FROM AccountEntity").executeUpdate();
        entityManager.createQuery("DELETE FROM JournalEntity").executeUpdate();
    }
}
