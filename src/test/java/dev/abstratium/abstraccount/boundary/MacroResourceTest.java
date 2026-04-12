package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.MacroEntity;
import dev.abstratium.abstraccount.model.AccountType;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class MacroResourceTest {
    
    @Inject
    EntityManager em;
    
    private String testMacroId;
    
    @BeforeEach
    @Transactional
    public void setup() {
        // Clean up existing macros
        em.createQuery("DELETE FROM MacroEntity").executeUpdate();
        
        // Create test macro
        MacroEntity macro = new MacroEntity();
        macro.setName("PayBill");
        macro.setDescription("Pay a bill from the bank account");
        macro.setParameters("[{\"name\":\"date\",\"type\":\"date\",\"prompt\":\"Transaction date\",\"required\":true},{\"name\":\"amount\",\"type\":\"amount\",\"prompt\":\"Amount\",\"required\":true}]");
        macro.setTemplate("Test template");
        macro.setValidation("{\"balanceCheck\":true,\"minPostings\":2}");
        macro.setNotes("Test notes");
        em.persist(macro);
        em.flush();
        testMacroId = macro.getId();
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetAllMacros() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro")
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].name", equalTo("PayBill"))
            .body("[0].description", equalTo("Pay a bill from the bank account"))
            .body("[0].parameters", hasSize(2));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetMacro() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testMacroId)
        .then()
            .statusCode(200)
            .body("id", equalTo(testMacroId))
            .body("name", equalTo("PayBill"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetMacro_notFound() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/nonexistent")
        .then()
            .statusCode(404);
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testCreateMacro() {
        String requestBody = """
            {
                "name": "RecordIncome",
                "description": "Record income received",
                "parameters": [
                    {"name": "date", "type": "date", "prompt": "Date", "required": true},
                    {"name": "amount", "type": "amount", "prompt": "Amount", "required": true}
                ],
                "template": "Income template",
                "validation": {"balanceCheck": true, "minPostings": 2},
                "notes": "Income notes"
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/macro")
        .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("name", equalTo("RecordIncome"))
            .body("description", equalTo("Record income received"))
            .body("parameters", hasSize(2));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateMacro() {
        String requestBody = """
            {
                "name": "UpdatedPayBill",
                "description": "Updated description",
                "parameters": [
                    {"name": "date", "type": "date", "prompt": "Date", "required": true}
                ],
                "template": "Updated template",
                "validation": {"balanceCheck": false, "minPostings": 1},
                "notes": "Updated notes"
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .put("/api/macro/" + testMacroId)
        .then()
            .statusCode(200)
            .body("id", equalTo(testMacroId))
            .body("name", equalTo("UpdatedPayBill"))
            .body("description", equalTo("Updated description"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateMacro_notFound() {
        String requestBody = """
            {
                "name": "UpdatedMacro",
                "description": "Description",
                "parameters": [],
                "template": "Template",
                "validation": null,
                "notes": null
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .put("/api/macro/nonexistent")
        .then()
            .statusCode(404);
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteMacro() {
        // First verify macro exists
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testMacroId)
        .then()
            .statusCode(200);
        
        // Delete it
        given()
            .contentType(ContentType.JSON)
        .when()
            .delete("/api/macro/" + testMacroId)
        .then()
            .statusCode(204);
        
        // Verify it's gone
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testMacroId)
        .then()
            .statusCode(404);
    }
    
    @Test
    void testUnauthorized() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro")
        .then()
            .statusCode(anyOf(equalTo(400), equalTo(401)));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecuteMacro_withInvoiceNumbers() {
        // This test verifies that when a macro template includes comma-separated invoice numbers
        // in the tag line (e.g., "; Payment:, {invoice_numbers}"), each invoice number
        // should be created as a separate tag with key "invoice"
        
        // Setup test data - use helper method with @Transactional to ensure commit
        String[] ids = setupTestDataForInvoiceTest();
        String macroId = ids[0];
        String journalId = ids[1];
        
        // Execute the macro with comma-separated invoice numbers
        String requestBody = String.format("""
            {
                "macroId": "%s",
                "journalId": "%s",
                "parameters": {
                    "date": "2026-08-03",
                    "description": "Test repayment",
                    "invoice_numbers": "PI00000002,PI00000003",
                    "amount": "38.50"
                }
            }
            """, macroId, journalId);
        
        String transactionId = given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/macro/execute")
        .then()
            .statusCode(200)
            .extract()
            .asString();
        
        // Verify the transaction was created
        dev.abstratium.abstraccount.entity.TransactionEntity transaction = em.find(
            dev.abstratium.abstraccount.entity.TransactionEntity.class, 
            transactionId.replace("\"", "")
        );
        
        assertNotNull(transaction);
        assertEquals("Test repayment", transaction.getDescription());
        
        // Verify tags - should have Payment: tag plus two invoice tags
        // Expected: 3 tags total
        // 1. Payment (key="Payment", value=null)
        // 2. invoice:PI00000002 (key="invoice", value="PI00000002")
        // 3. invoice:PI00000003 (key="invoice", value="PI00000003")
        assertEquals(3, transaction.getTags().size(), "Should have 3 tags: Payment + 2 invoice tags");
        
        // Check for Payment tag
        boolean hasPaymentTag = transaction.getTags().stream()
            .anyMatch(tag -> "Payment".equals(tag.getTagKey()) && tag.getTagValue() == null);
        assertTrue(hasPaymentTag, "Should have Payment: tag");
        
        // Check for invoice tags
        long invoiceTagCount = transaction.getTags().stream()
            .filter(tag -> "invoice".equals(tag.getTagKey()))
            .count();
        assertEquals(2, invoiceTagCount, "Should have 2 invoice tags");
        
        // Verify specific invoice numbers
        boolean hasPI00000002 = transaction.getTags().stream()
            .anyMatch(tag -> "invoice".equals(tag.getTagKey()) && "PI00000002".equals(tag.getTagValue()));
        boolean hasPI00000003 = transaction.getTags().stream()
            .anyMatch(tag -> "invoice".equals(tag.getTagKey()) && "PI00000003".equals(tag.getTagValue()));
        
        assertTrue(hasPI00000002, "Should have invoice tag for PI00000002");
        assertTrue(hasPI00000003, "Should have invoice tag for PI00000003");
    }
    
    @Transactional
    String[] setupTestDataForInvoiceTest() {
        // Create a test journal
        dev.abstratium.abstraccount.entity.JournalEntity journal = new dev.abstratium.abstraccount.entity.JournalEntity();
        journal.setTitle("Test Journal");
        journal.setCurrency("CHF");
        em.persist(journal);
        em.flush();
        
        String journalId = journal.getId();
        
        // Create test accounts
        dev.abstratium.abstraccount.entity.AccountEntity cashAccount = new dev.abstratium.abstraccount.entity.AccountEntity();
        cashAccount.setJournalId(journalId);
        cashAccount.setName("Cash");
        cashAccount.setType(AccountType.ASSET);
        em.persist(cashAccount);
        
        dev.abstratium.abstraccount.entity.AccountEntity expenseAccount = new dev.abstratium.abstraccount.entity.AccountEntity();
        expenseAccount.setJournalId(journalId);
        expenseAccount.setName("Test");
        expenseAccount.setType(AccountType.EXPENSE);
        em.persist(expenseAccount);
        
        // Create a test macro with invoice numbers in the template
        dev.abstratium.abstraccount.entity.MacroEntity macro = new dev.abstratium.abstraccount.entity.MacroEntity();
        macro.setName("TestInvoiceMacro");
        macro.setDescription("Test macro with invoice numbers");
        macro.setParameters("[{\"name\":\"date\",\"type\":\"date\",\"required\":true},{\"name\":\"description\",\"type\":\"text\",\"required\":true},{\"name\":\"invoice_numbers\",\"type\":\"text\",\"required\":true},{\"name\":\"amount\",\"type\":\"amount\",\"required\":true}]");
        // Template includes {invoice_numbers} in the tag line
        macro.setTemplate("{date} * | {description}\n    ; Payment:, {invoice_numbers}\n    Assets:Cash  CHF -{amount}\n    Expenses:Test  CHF {amount}");
        macro.setValidation("{\"balanceCheck\":true,\"minPostings\":2}");
        em.persist(macro);
        
        em.flush();
        
        return new String[] { macro.getId(), journalId };
    }
}
