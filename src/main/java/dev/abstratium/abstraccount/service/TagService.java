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
     * Search for distinct tag values by key and optional prefix or pattern.
     * Returns values in descending order (newest invoice numbers first).
     * Supports both simple prefix matching and regex patterns.
     *
     * @param journalId the journal ID
     * @param tagKey the tag key to search for
     * @param prefix optional prefix or regex pattern filter for tag values
     * @return list of distinct tag values
     */
    @Transactional
    public List<String> searchTagValues(String journalId, String tagKey, String prefix) {
        LOG.debugf("Searching tag values for key: %s, prefix: %s in journal: %s", tagKey, prefix, journalId);

        boolean isRegex = false;
        if (prefix != null && !prefix.isEmpty()) {
            // Check if the prefix contains regex metacharacters
            isRegex = prefix.contains(".*") || prefix.contains(".+") || prefix.contains("[") || 
                     prefix.contains("(") || prefix.contains("^") || prefix.contains("$");
        }
        
        List<String> results;
        
        if (isRegex) {
            // Use native SQL query for regex support (JPQL doesn't support REGEXP)
            String sql = "SELECT DISTINCT t.tag_value FROM T_tag t " +
                        "JOIN T_transaction tx ON t.transaction_id = tx.id " +
                        "WHERE tx.journal_id = :journalId " +
                        "AND t.tag_key = :tagKey " +
                        "AND t.tag_value REGEXP :pattern " +
                        "ORDER BY t.tag_value DESC";
            
            results = em.createNativeQuery(sql, String.class)
                .setParameter("journalId", journalId)
                .setParameter("tagKey", tagKey)
                .setParameter("pattern", prefix)
                .getResultList();
            
            LOG.debugf("Using regex pattern: %s", prefix);
        } else {
            // Use JPQL for simple prefix matching
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
                LOG.debugf("Using prefix match: %s%%", prefix);
            }
            
            results = typedQuery.getResultList();
        }

        LOG.debugf("Found %d tag values", results.size());
        
        return results;
    }
}
