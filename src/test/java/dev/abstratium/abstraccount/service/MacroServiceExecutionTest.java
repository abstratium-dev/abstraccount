package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.MacroEntity;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class MacroServiceExecutionTest {

    @Inject
    MacroService macroService;

    @Inject
    EntityManager em;

    private String testJournalId;
    private String testMacroId;
    
    @BeforeEach
    @Transactional
    public void setup() {
        testJournalId = UUID.randomUUID().toString();
        testMacroId = UUID.randomUUID().toString();
        
        // Create a test macro
        MacroEntity macro = new MacroEntity();
        macro.setId(testMacroId);
        macro.setName("TestMacro");
        macro.setDescription("Test macro for execution");
        macro.setParameters("[]");
        macro.setTemplate("{date} * {partner} | {description}\n    Assets:Bank  CHF {amount}\n    Expenses:Test  CHF -{amount}");
        macro.setCreatedDate(LocalDateTime.now());
        macro.setModifiedDate(LocalDateTime.now());
        
        macroService.createMacro(macro);
    }
    
    @Test
    public void testExecuteMacro_replacesUserParameters() {
        MacroEntity macro = macroService.loadMacro(testMacroId);
        
        Map<String, String> parameters = new HashMap<>();
        parameters.put("date", "2024-01-15");
        parameters.put("partner", "TestPartner");
        parameters.put("description", "Test transaction");
        parameters.put("amount", "100.00");
        
        String result = macroService.executeMacro(macro, parameters, testJournalId);
        
        assertTrue(result.contains("2024-01-15"));
        assertTrue(result.contains("TestPartner"));
        assertTrue(result.contains("Test transaction"));
        assertTrue(result.contains("100.00"));
    }
    
    @Test
    @Transactional
    public void testExecuteMacro_replacesToday() {
        MacroEntity macro = new MacroEntity();
        macro.setId(UUID.randomUUID().toString());
        macro.setName("TodayMacro");
        macro.setDescription("Test today replacement");
        macro.setTemplate("{today} * Partner | Description");
        macro.setParameters("[]");
        
        MacroEntity created = macroService.createMacro(macro);
        
        String result = macroService.executeMacro(created, new HashMap<>(), testJournalId);
        
        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        assertTrue(result.contains(today));
    }
    
    @Test
    @Transactional
    public void testExecuteMacro_replacesNextInvoiceNumber() {
        MacroEntity macro = new MacroEntity();
        macro.setId(UUID.randomUUID().toString());
        macro.setName("InvoiceMacro");
        macro.setDescription("Test invoice number replacement");
        macro.setTemplate("{date} * Partner | Invoice {next_invoice_PI}");
        macro.setParameters("[]");
        
        MacroEntity created = macroService.createMacro(macro);
        
        Map<String, String> parameters = new HashMap<>();
        parameters.put("date", "2024-01-15");
        
        String result = macroService.executeMacro(created, parameters, testJournalId);
        
        // Should generate PI00000001 since no invoices exist
        assertTrue(result.contains("PI00000001"));
    }
    
    @Test
    public void testEvaluateArithmeticExpressions_subtraction() {
        Map<String, String> params = Map.of("a", "380", "b", "350");
        String result = macroService.evaluateArithmeticExpressions("CHF {a - b}", params);
        assertEquals("CHF 30", result);
    }
    
    @Test
    public void testEvaluateArithmeticExpressions_addition() {
        Map<String, String> params = Map.of("a", "100.50", "b", "200.25");
        String result = macroService.evaluateArithmeticExpressions("CHF {a + b}", params);
        assertEquals("CHF 300.75", result);
    }
    
    @Test
    public void testEvaluateArithmeticExpressions_multiplication() {
        Map<String, String> params = Map.of("amount", "100");
        String result = macroService.evaluateArithmeticExpressions("CHF {amount * 1.077}", params);
        assertEquals("CHF 107.7", result);
    }
    
    @Test
    public void testEvaluateArithmeticExpressions_division() {
        Map<String, String> params = Map.of("total", "100");
        String result = macroService.evaluateArithmeticExpressions("CHF {total / 2}", params);
        assertEquals("CHF 50", result);
    }
    
    @Test
    public void testEvaluateArithmeticExpressions_operatorPrecedence() {
        // a + b * c should compute b*c first, then add a
        Map<String, String> params = Map.of("a", "10", "b", "5", "c", "3");
        String result = macroService.evaluateArithmeticExpressions("{a + b * c}", params);
        assertEquals("25", result);
    }
    
    @Test
    public void testEvaluateArithmeticExpressions_noExpressionLeftAlone() {
        Map<String, String> params = Map.of("amount", "100");
        String result = macroService.evaluateArithmeticExpressions("CHF {amount}", params);
        // Simple placeholder should NOT be touched by expression evaluator
        assertEquals("CHF {amount}", result);
    }
    
    @Test
    public void testEvaluateArithmeticExpressions_unknownParamLeftAsIs() {
        Map<String, String> params = Map.of("a", "100");
        String result = macroService.evaluateArithmeticExpressions("CHF {a - unknown_param}", params);
        // Cannot evaluate because unknown_param is not in params, left as-is
        assertEquals("CHF {a - unknown_param}", result);
    }
    
    @Test
    @Transactional
    public void testExecuteMacro_taxPaymentScenario() {
        // Simulates the TaxPayment macro template
        MacroEntity macro = new MacroEntity();
        macro.setId(UUID.randomUUID().toString());
        macro.setName("TaxPaymentTest");
        macro.setDescription("Test tax payment arithmetic");
        macro.setParameters("[]");
        macro.setTemplate("{date} * {partner} | {description}\n" +
            "    2:20:220:2208    CHF {provision_amount}\n" +
            "    8:8900    CHF {actual_amount - provision_amount}\n" +
            "    1:10:100:1020    CHF -{actual_amount}");
        
        MacroEntity created = macroService.createMacro(macro);
        
        Map<String, String> parameters = new HashMap<>();
        parameters.put("date", "2025-12-31");
        parameters.put("partner", "Canton Vaud");
        parameters.put("description", "Tax payment 2025");
        parameters.put("provision_amount", "350");
        parameters.put("actual_amount", "380");
        
        String result = macroService.executeMacro(created, parameters, testJournalId);
        
        assertTrue(result.contains("CHF 350"), "provision_amount should be 350");
        assertTrue(result.contains("CHF 30"), "actual_amount - provision_amount should be 30");
        assertTrue(result.contains("CHF -380"), "negated actual_amount should be -380");
        assertFalse(result.contains("{"), "No unresolved placeholders should remain");
    }
    
    @Test
    public void testEvaluateExpression_decimalPrecision() {
        Map<String, String> params = Map.of("a", "10.50", "b", "3.25");
        BigDecimal result = macroService.evaluateExpression("a - b", params);
        assertEquals(new BigDecimal("7.25"), result);
    }
    
    @Test
    public void testEvaluateExpression_zeroResult() {
        Map<String, String> params = Map.of("a", "100", "b", "100");
        BigDecimal result = macroService.evaluateExpression("a - b", params);
        assertEquals(BigDecimal.ZERO.compareTo(result), 0);
    }
    
    @Test
    public void testEvaluateExpression_negativeResult() {
        Map<String, String> params = Map.of("a", "100", "b", "150");
        BigDecimal result = macroService.evaluateExpression("a - b", params);
        assertTrue(result.compareTo(BigDecimal.ZERO) < 0);
        assertEquals(new BigDecimal("-50"), result);
    }

    @Test
    @Transactional
    public void testExecuteMacro_nextInvoiceNumberContinuesAcrossJournalChain() {
        // Create parent journal
        String parentJournalId = UUID.randomUUID().toString();
        createJournal(parentJournalId, null);

        // Create child journal linked to parent
        String childJournalId = UUID.randomUUID().toString();
        createJournal(childJournalId, parentJournalId);

        // Create a transaction with an invoice in the parent journal
        createTransactionWithInvoice(parentJournalId, "PI00000005");

        // Create a macro that uses {next_invoice_PI}
        MacroEntity macro = new MacroEntity();
        macro.setId(UUID.randomUUID().toString());
        macro.setName("InvoiceChainTest");
        macro.setDescription("Test invoice number continuation across chain");
        macro.setTemplate("{date} * Partner | Invoice {next_invoice_PI}");
        macro.setParameters("[]");
        macro.setCreatedDate(LocalDateTime.now());
        macro.setModifiedDate(LocalDateTime.now());

        MacroEntity created = macroService.createMacro(macro);

        // Execute macro in child journal - should get PI00000006 (continuing from parent)
        Map<String, String> parameters = new HashMap<>();
        parameters.put("date", "2024-01-15");

        String result = macroService.executeMacro(created, parameters, childJournalId);

        // Should generate PI00000006 since parent journal has PI00000005
        assertTrue(result.contains("PI00000006"),
            "Next invoice number should continue from parent journal's highest invoice (PI00000005 -> PI00000006)");
    }

    @Test
    @Transactional
    public void testExecuteMacro_nextInvoiceNumberFindsHighestAcrossChain() {
        // Create parent journal with high invoice number
        String parentJournalId = UUID.randomUUID().toString();
        createJournal(parentJournalId, null);

        // Create child journal linked to parent
        String childJournalId = UUID.randomUUID().toString();
        createJournal(childJournalId, parentJournalId);

        // Create a transaction with invoice in parent (high number)
        createTransactionWithInvoice(parentJournalId, "SI00000999");

        // Create a transaction with invoice in child (lower number)
        createTransactionWithInvoice(childJournalId, "SI00000001");

        // Create a macro that uses {next_invoice_SI}
        MacroEntity macro = new MacroEntity();
        macro.setId(UUID.randomUUID().toString());
        macro.setName("InvoiceHighestTest");
        macro.setDescription("Test that highest invoice is found across chain");
        macro.setTemplate("{date} * Partner | Invoice {next_invoice_SI}");
        macro.setParameters("[]");
        macro.setCreatedDate(LocalDateTime.now());
        macro.setModifiedDate(LocalDateTime.now());

        MacroEntity created = macroService.createMacro(macro);

        // Execute macro in child journal - should get SI00001000 (continuing from parent's 999)
        Map<String, String> parameters = new HashMap<>();
        parameters.put("date", "2024-01-15");

        String result = macroService.executeMacro(created, parameters, childJournalId);

        // Should generate SI00001000 since parent has SI00000999 (highest across chain)
        assertTrue(result.contains("SI00001000"),
            "Next invoice number should be based on highest across chain (SI00000999 -> SI00001000)");
    }

    private void createJournal(String journalId, String previousJournalId) {
        JournalEntity journal = new JournalEntity();
        journal.setId(journalId);
        journal.setTitle("Test Journal");
        journal.setCurrency("CHF");
        journal.setPreviousJournalId(previousJournalId);
        em.persist(journal);
        em.flush();
    }

    private void createTransactionWithInvoice(String journalId, String invoiceNumber) {
        String transactionId = UUID.randomUUID().toString();

        // Insert transaction
        em.createNativeQuery(
            "INSERT INTO T_transaction (id, journal_id, transaction_date, description, status) " +
            "VALUES (:id, :journalId, :date, :description, :status)")
            .setParameter("id", transactionId)
            .setParameter("journalId", journalId)
            .setParameter("date", java.sql.Date.valueOf(LocalDate.now()))
            .setParameter("description", "Test transaction")
            .setParameter("status", "*")
            .executeUpdate();

        // Insert invoice tag
        em.createNativeQuery(
            "INSERT INTO T_tag (id, transaction_id, tag_key, tag_value) " +
            "VALUES (:id, :transactionId, :tagKey, :tagValue)")
            .setParameter("id", UUID.randomUUID().toString())
            .setParameter("transactionId", transactionId)
            .setParameter("tagKey", "invoice")
            .setParameter("tagValue", invoiceNumber)
            .executeUpdate();
    }
}
