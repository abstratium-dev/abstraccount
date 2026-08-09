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
        // Use native SQL so we bypass Hibernate's @TenantId filter and clean up data
        // that may have been created under any tenant / orgId.
        entityManager.createNativeQuery("DELETE FROM T_attachment_content").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM T_attachment").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM T_tag").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM T_entry").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM T_transaction").executeUpdate();
        entityManager.createNativeQuery("UPDATE T_account SET parent_account_id = NULL").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM T_account").executeUpdate();
        entityManager.createNativeQuery("UPDATE T_journal SET previous_journal_id = NULL").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM T_journal_commodity").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM T_journal").executeUpdate();
    }
}
