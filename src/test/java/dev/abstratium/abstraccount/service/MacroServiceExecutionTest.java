package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.MacroEntity;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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
}
