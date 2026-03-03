package dev.abstratium.abstraccount.service;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.util.List;

/**
 * Service for managing tags.
 */
@ApplicationScoped
public class TagService {

    private static final Logger LOG = Logger.getLogger(TagService.class);

    @PersistenceContext
    EntityManager em;

    /**
     * Search for distinct tag values by key and optional prefix.
     * Returns values in descending order (newest invoice numbers first).
     *
     * @param journalId the journal ID
     * @param tagKey the tag key to search for
     * @param prefix optional prefix filter for tag values
     * @return list of distinct tag values
     */
    @Transactional
    public List<String> searchTagValues(String journalId, String tagKey, String prefix) {
        LOG.debugf("Searching tag values for key: %s, prefix: %s in journal: %s", tagKey, prefix, journalId);

        String query = "SELECT DISTINCT t.tagValue FROM TagEntity t " +
                      "JOIN t.transaction tx " +
                      "WHERE tx.journalId = :journalId " +
                      "AND t.tagKey = :tagKey ";
        
        if (prefix != null && !prefix.isEmpty()) {
            query += "AND t.tagValue LIKE :prefix ";
        }
        
        query += "ORDER BY t.tagValue DESC";

        var typedQuery = em.createQuery(query, String.class)
            .setParameter("journalId", journalId)
            .setParameter("tagKey", tagKey);

        if (prefix != null && !prefix.isEmpty()) {
            typedQuery.setParameter("prefix", prefix + "%");
        }

        List<String> results = typedQuery.getResultList();
        LOG.debugf("Found %d tag values", results.size());
        
        return results;
    }
}
