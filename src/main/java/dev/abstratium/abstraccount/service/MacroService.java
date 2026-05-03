package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.MacroEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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
    
    @Inject
    JournalPersistenceService journalPersistenceService;
    
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
     * Also evaluates arithmetic expressions like {a + b}, {a - b}, {a * b}, {a / b}.
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
        
        // Evaluate arithmetic expressions like {actual_amount - provision_amount}
        // Must happen BEFORE simple placeholder substitution so that parameter names are still intact
        result = evaluateArithmeticExpressions(result, parameterValues);
        
        // Replace user-provided parameter values
        for (Map.Entry<String, String> entry : parameterValues.entrySet()) {
            String placeholder = "{" + entry.getKey() + "}";
            result = result.replace(placeholder, entry.getValue());
        }
        
        // Replace built-in date variables
        LocalDate now = LocalDate.now();
        result = result.replace("{today}", now.format(DateTimeFormatter.ISO_LOCAL_DATE));
        result = result.replace("{year}", String.valueOf(now.getYear()));
        result = result.replace("{month}", String.format("%02d", now.getMonthValue()));
        result = result.replace("{day}", String.format("%02d", now.getDayOfMonth()));
        
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
     * Evaluates arithmetic expressions within {braces} in the template.
     * Supports +, -, *, / operators between parameter names and numeric literals.
     * Examples: {actual_amount - provision_amount}, {amount * 1.077}, {a + b + c}
     * 
     * @param template the template string containing expressions
     * @param parameterValues map of parameter names to values
     * @return the template with arithmetic expressions replaced by their computed results
     */
    String evaluateArithmeticExpressions(String template, Map<String, String> parameterValues) {
        // Match {expressions that contain at least one arithmetic operator between tokens}
        Pattern exprPattern = Pattern.compile("\\{([^}]*[+\\-*/][^}]*)\\}");
        Matcher matcher = exprPattern.matcher(template);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String expression = matcher.group(1).trim();
            try {
                BigDecimal result = evaluateExpression(expression, parameterValues);
                // Format: strip trailing zeros but keep at least plain decimal form
                String formatted = result.stripTrailingZeros().toPlainString();
                matcher.appendReplacement(sb, Matcher.quoteReplacement(formatted));
            } catch (IllegalArgumentException e) {
                LOG.debugf("Could not evaluate expression: {%s} - %s, leaving as-is", expression, e.getMessage());
                // Leave the expression as-is if it cannot be evaluated
                matcher.appendReplacement(sb, Matcher.quoteReplacement(matcher.group(0)));
            }
        }
        matcher.appendTail(sb);
        return sb.toString();
    }
    
    /**
     * Evaluates a simple arithmetic expression with +, -, *, / operators.
     * Respects standard operator precedence (* and / before + and -).
     * Operands can be parameter names (resolved from parameterValues) or numeric literals.
     * 
     * @param expression the expression to evaluate, e.g. "actual_amount - provision_amount"
     * @param parameterValues map of parameter names to numeric string values
     * @return the computed result
     * @throws IllegalArgumentException if the expression cannot be evaluated
     */
    BigDecimal evaluateExpression(String expression, Map<String, String> parameterValues) {
        List<BigDecimal> operands = new ArrayList<>();
        List<Character> operators = new ArrayList<>();
        
        // Scan for operator-separated tokens
        // Pattern: optional whitespace, operand, then repeated (operator, operand)
        Pattern tokenPattern = Pattern.compile(
            "\\s*([A-Za-z_][A-Za-z0-9_]*|-?\\d+\\.?\\d*)\\s*(?:([+\\-*/])\\s*)?");
        Matcher tokenMatcher = tokenPattern.matcher(expression);
        
        while (tokenMatcher.find()) {
            String operand = tokenMatcher.group(1);
            String operator = tokenMatcher.group(2);
            
            if (operand != null && !operand.isEmpty()) {
                BigDecimal value = resolveOperand(operand, parameterValues);
                operands.add(value);
            }
            if (operator != null && !operator.isEmpty()) {
                operators.add(operator.charAt(0));
            }
        }
        
        if (operands.isEmpty()) {
            throw new IllegalArgumentException("No operands found in expression: " + expression);
        }
        if (operands.size() != operators.size() + 1) {
            throw new IllegalArgumentException("Mismatched operands and operators in expression: " + expression);
        }
        
        // Apply operator precedence: first pass for * and /
        List<BigDecimal> addOperands = new ArrayList<>();
        List<Character> addOperators = new ArrayList<>();
        
        BigDecimal current = operands.get(0);
        for (int i = 0; i < operators.size(); i++) {
            char op = operators.get(i);
            BigDecimal next = operands.get(i + 1);
            if (op == '*') {
                current = current.multiply(next);
            } else if (op == '/') {
                current = current.divide(next, 10, RoundingMode.HALF_UP);
            } else {
                addOperands.add(current);
                addOperators.add(op);
                current = next;
            }
        }
        addOperands.add(current);
        
        // Second pass for + and -
        BigDecimal result = addOperands.get(0);
        for (int i = 0; i < addOperators.size(); i++) {
            char op = addOperators.get(i);
            BigDecimal next = addOperands.get(i + 1);
            if (op == '+') {
                result = result.add(next);
            } else if (op == '-') {
                result = result.subtract(next);
            }
        }
        
        return result;
    }
    
    /**
     * Resolves an operand to a BigDecimal value. The operand can be a parameter name
     * (looked up in parameterValues) or a numeric literal.
     */
    private BigDecimal resolveOperand(String operand, Map<String, String> parameterValues) {
        // Try as a parameter name first
        if (parameterValues.containsKey(operand)) {
            String value = parameterValues.get(operand);
            try {
                return new BigDecimal(value);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException(
                    "Parameter '" + operand + "' has non-numeric value: " + value);
            }
        }
        // Try as a numeric literal
        try {
            return new BigDecimal(operand);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(
                "Unknown parameter or invalid number: " + operand);
        }
    }
    
    /**
     * Finds the next invoice number for a given prefix by querying existing invoice tags.
     * Searches across all journals in the chain (following previousJournalId links).
     * Format: PREFIX + 8-digit number (e.g., PI00000001, PI00000002, etc.)
     *
     * @param journalId the journal ID
     * @param prefix the invoice prefix (e.g., "PI" for purchase invoices)
     * @return the next invoice number
     */
    private String getNextInvoiceNumber(String journalId, String prefix) {
        LOG.debugf("Getting next invoice number for prefix: %s in journal chain starting at: %s", prefix, journalId);

        // Collect all journal IDs in the chain
        List<String> journalIds = journalPersistenceService.getJournalChainIds(journalId);
        LOG.debugf("Journal chain contains %d journals: %s", journalIds.size(), journalIds);

        // Query for the highest invoice number with this prefix across all journals in the chain
        String queryStr = "SELECT t.tagValue FROM TagEntity t " +
                         "JOIN t.transaction tx " +
                         "WHERE tx.journalId IN :journalIds " +
                         "AND t.tagKey = 'invoice' " +
                         "AND t.tagValue LIKE :prefix " +
                         "ORDER BY t.tagValue DESC";

        List<String> results = em.createQuery(queryStr, String.class)
            .setParameter("journalIds", journalIds)
            .setParameter("prefix", prefix + "%")
            .setMaxResults(1)
            .getResultList();

        LOG.debugf("Found %d existing invoices with prefix %s across journal chain", results.size(), prefix);

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
