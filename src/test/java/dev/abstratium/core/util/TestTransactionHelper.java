package dev.abstratium.core.util;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.transaction.UserTransaction;

/**
 * Utility helper for managing transactions in tests.
 * Provides safe begin/commit/rollback operations that handle leaked transactions.
 */
@ApplicationScoped
public class TestTransactionHelper {

    @Inject
    UserTransaction userTransaction;

    @Inject
    EntityManager entityManager;

    public void beginTransaction() throws Exception {
        int status = userTransaction.getStatus();
        if (status != jakarta.transaction.Status.STATUS_NO_TRANSACTION) {
            userTransaction.rollback();
        }
        userTransaction.begin();
    }

    public void commitTransaction() throws Exception {
        int status = userTransaction.getStatus();
        if (status == jakarta.transaction.Status.STATUS_ACTIVE) {
            userTransaction.commit();
        } else if (status != jakarta.transaction.Status.STATUS_NO_TRANSACTION) {
            userTransaction.rollback();
        }
    }

    public void rollback() throws Exception {
        int status = userTransaction.getStatus();
        if (status != jakarta.transaction.Status.STATUS_NO_TRANSACTION) {
            userTransaction.rollback();
        }
    }

    public int getStatus() throws Exception {
        return userTransaction.getStatus();
    }

    @Transactional
    public void deleteAllData() {
        entityManager.createQuery("DELETE FROM TagEntity").executeUpdate();
        entityManager.createQuery("DELETE FROM EntryEntity").executeUpdate();
        entityManager.createQuery("DELETE FROM TransactionEntity").executeUpdate();
        entityManager.createQuery("UPDATE AccountEntity SET parentAccountId = NULL").executeUpdate();
        entityManager.createQuery("DELETE FROM AccountEntity").executeUpdate();
        entityManager.createQuery("UPDATE JournalEntity SET previousJournalId = NULL").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM T_journal_commodity").executeUpdate();
        entityManager.createQuery("DELETE FROM JournalEntity").executeUpdate();
    }
}
