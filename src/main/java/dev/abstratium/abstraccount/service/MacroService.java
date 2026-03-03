package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.MacroEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for managing macros.
 */
@ApplicationScoped
public class MacroService {
    
    private static final Logger LOG = Logger.getLogger(MacroService.class);
    
    @PersistenceContext
    EntityManager em;
    
    /**
     * Loads all macros.
     * Macros are independent of journals.
     * 
     * @return list of all macros
     */
    @Transactional
    public List<MacroEntity> loadAllMacros() {
        LOG.debug("Loading all macros");
        return em.createQuery(
            "SELECT m FROM MacroEntity m ORDER BY m.name",
            MacroEntity.class
        )
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
    
    /**
     * Executes a macro by replacing placeholders in the template with provided parameter values.
     * Handles special placeholders like {today} and {next_invoice_PI}.
     * 
     * @param macro the macro to execute
     * @param parameterValues map of parameter names to values
     * @param journalId the journal ID for finding next invoice numbers
     * @return the generated transaction text with all placeholders replaced
     */
    @Transactional
    public String executeMacro(MacroEntity macro, Map<String, String> parameterValues, String journalId) {
        LOG.debugf("Executing macro: %s", macro.getName());
        
        String result = macro.getTemplate();
        
        // Replace user-provided parameter values
        for (Map.Entry<String, String> entry : parameterValues.entrySet()) {
            String placeholder = "{" + entry.getKey() + "}";
            result = result.replace(placeholder, entry.getValue());
        }
        
        // Replace {today} with current date
        Pattern todayPattern = Pattern.compile("\\{today\\}");
        Matcher todayMatcher = todayPattern.matcher(result);
        if (todayMatcher.find()) {
            String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
            result = todayMatcher.replaceAll(today);
        }
        
        // Replace {next_invoice_*} patterns with next invoice number
        Pattern invoicePattern = Pattern.compile("\\{next_invoice_([A-Z]+)\\}");
        Matcher invoiceMatcher = invoicePattern.matcher(result);
        StringBuffer sb = new StringBuffer();
        while (invoiceMatcher.find()) {
            String prefix = invoiceMatcher.group(1);
            String nextInvoice = getNextInvoiceNumber(journalId, prefix);
            invoiceMatcher.appendReplacement(sb, Matcher.quoteReplacement(nextInvoice));
        }
        invoiceMatcher.appendTail(sb);
        result = sb.toString();
        
        LOG.debugf("Macro execution result:\n%s", result);
        return result;
    }
    
    /**
     * Finds the next invoice number for a given prefix by querying existing invoice tags.
     * Format: PREFIX + 8-digit number (e.g., PI00000001, PI00000002, etc.)
     * 
     * @param journalId the journal ID
     * @param prefix the invoice prefix (e.g., "PI" for purchase invoices)
     * @return the next invoice number
     */
    private String getNextInvoiceNumber(String journalId, String prefix) {
        LOG.debugf("Getting next invoice number for prefix: %s in journal: %s", prefix, journalId);
        
        // Query for the highest invoice number with this prefix
        String queryStr = "SELECT t.tagValue FROM TagEntity t " +
                         "JOIN t.transaction tx " +
                         "WHERE tx.journalId = :journalId " +
                         "AND t.tagKey = 'invoice' " +
                         "AND t.tagValue LIKE :prefix " +
                         "ORDER BY t.tagValue DESC";
        
        List<String> results = em.createQuery(queryStr, String.class)
            .setParameter("journalId", journalId)
            .setParameter("prefix", prefix + "%")
            .setMaxResults(1)
            .getResultList();
        
        LOG.debugf("Found %d existing invoices with prefix %s", results.size(), prefix);
        
        if (results.isEmpty()) {
            // No existing invoices, start with 00000001
            String nextInvoice = prefix + "00000001";
            LOG.debugf("No existing invoices, returning: %s", nextInvoice);
            return nextInvoice;
        }
        
        String lastInvoice = results.get(0);
        LOG.debugf("Last invoice found: %s", lastInvoice);
        
        // Extract the number part after the prefix
        String numberPart = lastInvoice.substring(prefix.length());
        try {
            // Parse the numeric part (can be any number of digits)
            int number = Integer.parseInt(numberPart);
            int nextNumber = number + 1;
            
            // Preserve the number of digits from the last invoice
            int digitCount = numberPart.length();
            String formatString = "%0" + digitCount + "d";
            String nextInvoice = prefix + String.format(formatString, nextNumber);
            
            LOG.debugf("Next invoice: %s (incremented %d to %d, preserving %d digits)", 
                nextInvoice, number, nextNumber, digitCount);
            return nextInvoice;
        } catch (NumberFormatException e) {
            LOG.warnf("Could not parse invoice number from: %s (number part: %s), starting from 00000001", lastInvoice, numberPart);
            return prefix + "00000001";
        }
    }
}
