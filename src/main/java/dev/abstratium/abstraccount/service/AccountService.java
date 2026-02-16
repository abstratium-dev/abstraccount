package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.AccountEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.util.List;

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
}
