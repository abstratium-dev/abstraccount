package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.MacroEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for managing macros.
 */
@ApplicationScoped
public class MacroService {
    
    private static final Logger LOG = Logger.getLogger(MacroService.class);
    
    @PersistenceContext
    EntityManager em;
    
    /**
     * Loads all macros for a given journal.
     * 
     * @param journalId the journal ID
     * @return list of all macros
     */
    @Transactional
    public List<MacroEntity> loadAllMacros(String journalId) {
        LOG.debugf("Loading all macros for journal: %s", journalId);
        return em.createQuery(
            "SELECT m FROM MacroEntity m WHERE m.journalId = :journalId ORDER BY m.name",
            MacroEntity.class
        )
        .setParameter("journalId", journalId)
        .getResultList();
    }
    
    /**
     * Loads a single macro by ID.
     * 
     * @param macroId the macro ID
     * @return the macro entity, or null if not found
     */
    @Transactional
    public MacroEntity loadMacro(String macroId) {
        LOG.debugf("Loading macro: %s", macroId);
        return em.find(MacroEntity.class, macroId);
    }
    
    /**
     * Creates a new macro.
     * 
     * @param macro the macro to create
     * @return the created macro
     */
    @Transactional
    public MacroEntity createMacro(MacroEntity macro) {
        LOG.debugf("Creating macro: %s", macro.getName());
        LocalDateTime now = LocalDateTime.now();
        macro.setCreatedDate(now);
        macro.setModifiedDate(now);
        em.persist(macro);
        return macro;
    }
    
    /**
     * Updates an existing macro.
     * 
     * @param macro the macro to update
     * @return the updated macro
     */
    @Transactional
    public MacroEntity updateMacro(MacroEntity macro) {
        LOG.debugf("Updating macro: %s", macro.getId());
        macro.setModifiedDate(LocalDateTime.now());
        return em.merge(macro);
    }
    
    /**
     * Deletes a macro by ID.
     * 
     * @param macroId the macro ID
     */
    @Transactional
    public void deleteMacro(String macroId) {
        LOG.debugf("Deleting macro: %s", macroId);
        MacroEntity macro = em.find(MacroEntity.class, macroId);
        if (macro != null) {
            em.remove(macro);
        }
    }
}
