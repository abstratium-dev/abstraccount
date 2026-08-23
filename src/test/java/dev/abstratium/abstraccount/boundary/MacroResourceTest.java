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
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteMacro_notFound_returns404() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .delete("/api/macro/nonexistent-macro-id")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testCreateMacro_withoutValidation_succeeds() {
        String requestBody = """
            {
                "name": "NoValidationMacro",
                "description": "Macro without validation",
                "parameters": [
                    {"name": "date", "type": "date", "prompt": "Date", "required": true}
                ],
                "template": "Simple template",
                "validation": null,
                "notes": null
            }
            """;

        String macroId = given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/macro")
        .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("name", equalTo("NoValidationMacro"))
            .extract().jsonPath().getString("id");

        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + macroId)
        .then()
            .statusCode(200)
            .body("validation", nullValue());
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

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecuteMacro_withDifferentCurrency() {
        // This test verifies that the CHF placeholder in the minimal journal wrapper
        // does not force the created transaction to use CHF. The journal and macro
        // template both use USD, and the persisted entries must keep USD.
        String[] ids = setupTestDataForDifferentCurrency();
        String macroId = ids[0];
        String journalId = ids[1];

        String requestBody = String.format("""
            {
                "macroId": "%s",
                "journalId": "%s",
                "parameters": {
                    "date": "2026-01-15",
                    "amount": "123.45"
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

        dev.abstratium.abstraccount.entity.TransactionEntity transaction = em.find(
            dev.abstratium.abstraccount.entity.TransactionEntity.class,
            transactionId.replace("\"", "")
        );

        assertNotNull(transaction);
        assertEquals("USD transaction", transaction.getDescription());
        assertEquals(2, transaction.getEntries().size());
        assertTrue(
            transaction.getEntries().stream().allMatch(entry -> "USD".equals(entry.getCommodity())),
            "Entries should use the currency from the macro template, not the placeholder CHF header"
        );
    }

    @Transactional
    String[] setupTestDataForDifferentCurrency() {
        // Create a test journal whose actual currency is not CHF
        dev.abstratium.abstraccount.entity.JournalEntity journal = new dev.abstratium.abstraccount.entity.JournalEntity();
        journal.setTitle("USD Test Journal");
        journal.setCurrency("USD");
        em.persist(journal);
        em.flush();

        String journalId = journal.getId();

        // Create simple accounts
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

        // Create a macro whose template uses USD instead of CHF
        dev.abstratium.abstraccount.entity.MacroEntity macro = new dev.abstratium.abstraccount.entity.MacroEntity();
        macro.setName("UsdMacro");
        macro.setDescription("Test macro using USD currency");
        macro.setParameters("[{\"name\":\"date\",\"type\":\"date\",\"required\":true},{\"name\":\"amount\",\"type\":\"amount\",\"required\":true}]");
        macro.setTemplate("{date} * | USD transaction\n    Assets:Cash  USD {amount}\n    Expenses:Test  USD -{amount}");
        macro.setValidation("{\"balanceCheck\":true,\"minPostings\":2}");
        em.persist(macro);

        em.flush();

        return new String[] { macro.getId(), journalId };
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecuteMacro_withNumericCodePathAndDifferentCurrency() {
        // This test verifies that non-CHF commodities work together with numeric account
        // code paths, which requires extractAccountCodePaths to be currency-agnostic.
        String[] ids = setupTestDataForNumericCodePathDifferentCurrency();
        String macroId = ids[0];
        String journalId = ids[1];

        String requestBody = String.format("""
            {
                "macroId": "%s",
                "journalId": "%s",
                "parameters": {
                    "date": "2026-01-15",
                    "amount": "250.00"
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

        dev.abstratium.abstraccount.entity.TransactionEntity transaction = em.find(
            dev.abstratium.abstraccount.entity.TransactionEntity.class,
            transactionId.replace("\"", "")
        );

        assertNotNull(transaction);
        assertEquals("USD payment", transaction.getDescription());
        assertEquals(2, transaction.getEntries().size());
        assertTrue(
            transaction.getEntries().stream().allMatch(entry -> "USD".equals(entry.getCommodity())),
            "Entries should use the currency from the macro template, not the placeholder CHF header"
        );
    }

    @Transactional
    String[] setupTestDataForNumericCodePathDifferentCurrency() {
        // Create a test journal whose actual currency is not CHF
        dev.abstratium.abstraccount.entity.JournalEntity journal = new dev.abstratium.abstraccount.entity.JournalEntity();
        journal.setTitle("USD Numeric Code Path Journal");
        journal.setCurrency("USD");
        em.persist(journal);
        em.flush();

        String journalId = journal.getId();

        // Build account hierarchy for code path 1:10:100
        dev.abstratium.abstraccount.entity.AccountEntity assets = new dev.abstratium.abstraccount.entity.AccountEntity();
        assets.setJournalId(journalId);
        assets.setName("1 Assets");
        assets.setType(AccountType.ASSET);
        em.persist(assets);
        em.flush();

        dev.abstratium.abstraccount.entity.AccountEntity cash = new dev.abstratium.abstraccount.entity.AccountEntity();
        cash.setJournalId(journalId);
        cash.setName("10 Cash");
        cash.setParentAccountId(assets.getId());
        cash.setType(AccountType.ASSET);
        em.persist(cash);
        em.flush();

        dev.abstratium.abstraccount.entity.AccountEntity bank = new dev.abstratium.abstraccount.entity.AccountEntity();
        bank.setJournalId(journalId);
        bank.setName("100 Bank");
        bank.setParentAccountId(cash.getId());
        bank.setType(AccountType.ASSET);
        em.persist(bank);
        em.flush();

        // Build account hierarchy for code path 2:20:200
        dev.abstratium.abstraccount.entity.AccountEntity liabilities = new dev.abstratium.abstraccount.entity.AccountEntity();
        liabilities.setJournalId(journalId);
        liabilities.setName("2 Liabilities");
        liabilities.setType(AccountType.LIABILITY);
        em.persist(liabilities);
        em.flush();

        dev.abstratium.abstraccount.entity.AccountEntity payables = new dev.abstratium.abstraccount.entity.AccountEntity();
        payables.setJournalId(journalId);
        payables.setName("20 Payables");
        payables.setParentAccountId(liabilities.getId());
        payables.setType(AccountType.LIABILITY);
        em.persist(payables);
        em.flush();

        dev.abstratium.abstraccount.entity.AccountEntity vendor = new dev.abstratium.abstraccount.entity.AccountEntity();
        vendor.setJournalId(journalId);
        vendor.setName("200 Vendor");
        vendor.setParentAccountId(payables.getId());
        vendor.setType(AccountType.LIABILITY);
        em.persist(vendor);
        em.flush();

        // Create a macro whose template uses USD with numeric code paths
        dev.abstratium.abstraccount.entity.MacroEntity macro = new dev.abstratium.abstraccount.entity.MacroEntity();
        macro.setName("UsdNumericCodePathMacro");
        macro.setDescription("Test macro using USD and numeric code paths");
        macro.setParameters("[{\"name\":\"date\",\"type\":\"date\",\"required\":true},{\"name\":\"amount\",\"type\":\"amount\",\"required\":true}]");
        macro.setTemplate("{date} * | USD payment\n    1:10:100  USD -{amount}\n    2:20:200  USD {amount}");
        macro.setValidation("{\"balanceCheck\":true,\"minPostings\":2}");
        em.persist(macro);

        em.flush();

        return new String[] { macro.getId(), journalId };
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecuteMacro_withDefaultCurrencyPlaceholder() {
        // This test verifies that the {default_currency} placeholder is replaced
        // with the target journal's currency when the macro is executed.
        String[] ids = setupTestDataForDefaultCurrencyPlaceholder();
        String macroId = ids[0];
        String journalId = ids[1];

        String requestBody = String.format("""
            {
                "macroId": "%s",
                "journalId": "%s",
                "parameters": {
                    "date": "2026-01-15",
                    "amount": "75.00"
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

        dev.abstratium.abstraccount.entity.TransactionEntity transaction = em.find(
            dev.abstratium.abstraccount.entity.TransactionEntity.class,
            transactionId.replace("\"", "")
        );

        assertNotNull(transaction);
        assertEquals(2, transaction.getEntries().size());
        assertTrue(
            transaction.getEntries().stream().allMatch(entry -> "EUR".equals(entry.getCommodity())),
            "Entries should use the journal currency resolved from {default_currency}"
        );
    }

    @Transactional
    String[] setupTestDataForDefaultCurrencyPlaceholder() {
        // Create a test journal with EUR as its currency
        dev.abstratium.abstraccount.entity.JournalEntity journal = new dev.abstratium.abstraccount.entity.JournalEntity();
        journal.setTitle("EUR Test Journal");
        journal.setCurrency("EUR");
        em.persist(journal);
        em.flush();

        String journalId = journal.getId();

        // Create simple accounts
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

        // Create a macro whose template uses the {default_currency} placeholder
        dev.abstratium.abstraccount.entity.MacroEntity macro = new dev.abstratium.abstraccount.entity.MacroEntity();
        macro.setName("DefaultCurrencyMacro");
        macro.setDescription("Test macro using the default currency placeholder");
        macro.setParameters("[{\"name\":\"date\",\"type\":\"date\",\"required\":true},{\"name\":\"amount\",\"type\":\"amount\",\"required\":true}]");
        macro.setTemplate("{date} * | Default currency transaction\n    Assets:Cash  {default_currency} {amount}\n    Expenses:Test  {default_currency} -{amount}");
        macro.setValidation("{\"balanceCheck\":true,\"minPostings\":2}");
        em.persist(macro);

        em.flush();

        return new String[] { macro.getId(), journalId };
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecuteMacroBatch_success() {
        String[] ids = setupTestDataForBatchExecution();
        String macroId = ids[0];
        String journalId = ids[1];
        String revenueCode = ids[2];
        String feeExpenseCode = ids[3];
        String processorCode = ids[4];

        String requestBody = String.format("""
            {
                "macroId": "%s",
                "journalId": "%s",
                "sharedParameters": {
                    "revenue_account": "%s",
                    "fee_expense_account": "%s",
                    "processor_account": "%s"
                },
                "csv": "2026-01-10,,Widget sale,100.00,5.00,pi_aaa,C-1\\n2026-01-11,,Gadget sale,50.00,2.00,pi_bbb,C-2"
            }
            """, macroId, journalId, revenueCode, feeExpenseCode, processorCode);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/macro/execute-batch")
        .then()
            .statusCode(200)
            .body("totalRows", equalTo(2))
            .body("successCount", equalTo(2))
            .body("failureCount", equalTo(0))
            .body("results", hasSize(2))
            .body("results[0].success", equalTo(true))
            .body("results[0].transactionId", notNullValue())
            .body("results[1].success", equalTo(true))
            .body("results[1].transactionId", notNullValue());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecuteMacroBatch_skipsMatchingHeaderRow() {
        String[] ids = setupTestDataForBatchExecution();
        String macroId = ids[0];
        String journalId = ids[1];
        String revenueCode = ids[2];
        String feeExpenseCode = ids[3];
        String processorCode = ids[4];

        String requestBody = String.format("""
            {
                "macroId": "%s",
                "journalId": "%s",
                "sharedParameters": {
                    "revenue_account": "%s",
                    "fee_expense_account": "%s",
                    "processor_account": "%s"
                },
                "csv": "date,partner,description,gross_amount,fee_amount,stripe_txn,contract_id\\n2026-01-10,,Widget sale,100.00,5.00,pi_aaa,C-1"
            }
            """, macroId, journalId, revenueCode, feeExpenseCode, processorCode);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/macro/execute-batch")
        .then()
            .statusCode(200)
            .body("totalRows", equalTo(1))
            .body("successCount", equalTo(1))
            .body("failureCount", equalTo(0));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecuteMacroBatch_partialFailureReportsWarningForInvalidRow() {
        String[] ids = setupTestDataForBatchExecution();
        String macroId = ids[0];
        String journalId = ids[1];
        String revenueCode = ids[2];
        String feeExpenseCode = ids[3];
        String processorCode = ids[4];

        // Second row is missing a column (only 6 fields instead of 7)
        String requestBody = String.format("""
            {
                "macroId": "%s",
                "journalId": "%s",
                "sharedParameters": {
                    "revenue_account": "%s",
                    "fee_expense_account": "%s",
                    "processor_account": "%s"
                },
                "csv": "2026-01-10,,Widget sale,100.00,5.00,pi_aaa,C-1\\n2026-01-11,,Gadget sale,50.00,pi_bbb,C-2"
            }
            """, macroId, journalId, revenueCode, feeExpenseCode, processorCode);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/macro/execute-batch")
        .then()
            .statusCode(200)
            .body("totalRows", equalTo(2))
            .body("successCount", equalTo(1))
            .body("failureCount", equalTo(1))
            .body("results[0].success", equalTo(true))
            .body("results[1].success", equalTo(false))
            .body("results[1].error", notNullValue());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecuteMacroBatch_macroNotFound_returns404() {
        String requestBody = """
            {
                "macroId": "nonexistent",
                "journalId": "some-journal",
                "sharedParameters": {},
                "csv": "2026-01-10,,desc,1.00,0.00,pi,C-1"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/macro/execute-batch")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecuteMacroBatch_lockedJournal_returns423() {
        String[] ids = setupTestDataForBatchExecution();
        String macroId = ids[0];
        String journalId = ids[1];
        String revenueCode = ids[2];
        String feeExpenseCode = ids[3];
        String processorCode = ids[4];

        lockJournal(journalId);

        String requestBody = String.format("""
            {
                "macroId": "%s",
                "journalId": "%s",
                "sharedParameters": {
                    "revenue_account": "%s",
                    "fee_expense_account": "%s",
                    "processor_account": "%s"
                },
                "csv": "2026-01-10,,Widget sale,100.00,5.00,pi_aaa,C-1"
            }
            """, macroId, journalId, revenueCode, feeExpenseCode, processorCode);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/macro/execute-batch")
        .then()
            .statusCode(423);
    }

    @Transactional
    void lockJournal(String journalId) {
        dev.abstratium.abstraccount.entity.JournalEntity journal = em.find(
            dev.abstratium.abstraccount.entity.JournalEntity.class, journalId);
        journal.setLocked(true);
    }

    /**
     * Sets up a journal with revenue, fee-expense and payment-processor-balance accounts,
     * plus a macro mirroring the PaymentProcessorSale macro's shape (account parameters as
     * shared parameters, the remaining parameters coming from CSV rows).
     *
     * @return {macroId, journalId, revenueAccountCode, feeExpenseAccountCode, processorAccountCode}
     */
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecuteMacro_multiTransaction_createsBothTransactions() {
        // This test verifies that a macro template containing two transactions
        // separated by a blank line (like PayInvoiceFromBank) creates BOTH
        // transactions, not just the first one.
        String[] ids = setupTestDataForMultiTransactionMacro();
        String macroId = ids[0];
        String journalId = ids[1];
        String expenseCode = ids[2];
        String liabilityCode = ids[3];
        String bankCode = ids[4];

        String requestBody = String.format("""
            {
                "macroId": "%s",
                "journalId": "%s",
                "parameters": {
                    "invoice_date": "2026-01-10",
                    "payment_date": "2026-01-15",
                    "partner": "P00000001",
                    "description": "Office supplies",
                    "invoice_number": "PI00000042",
                    "amount": "150.00",
                    "expense_account": "%s",
                    "liability_account": "%s",
                    "bank_account": "%s"
                }
            }
            """, macroId, journalId, expenseCode, liabilityCode, bankCode);

        String transactionIds = given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/macro/execute")
        .then()
            .statusCode(200)
            .extract()
            .asString();

        // The response should contain two comma-separated transaction IDs
        String[] idsArray = transactionIds.replace("\"", "").split(",");
        assertEquals(2, idsArray.length, "Macro should create exactly 2 transactions");

        // Verify the first transaction (record the invoice)
        dev.abstratium.abstraccount.entity.TransactionEntity tx1 = em.find(
            dev.abstratium.abstraccount.entity.TransactionEntity.class, idsArray[0]);
        assertNotNull(tx1);
        assertEquals("Office supplies", tx1.getDescription());
        assertEquals(2, tx1.getEntries().size(), "First transaction should have 2 entries");

        // Verify the second transaction (pay the invoice)
        dev.abstratium.abstraccount.entity.TransactionEntity tx2 = em.find(
            dev.abstratium.abstraccount.entity.TransactionEntity.class, idsArray[1]);
        assertNotNull(tx2);
        assertEquals("Payment of invoice", tx2.getDescription());
        assertEquals(2, tx2.getEntries().size(), "Second transaction should have 2 entries");
    }

    @Transactional
    String[] setupTestDataForMultiTransactionMacro() {
        dev.abstratium.abstraccount.entity.JournalEntity journal = new dev.abstratium.abstraccount.entity.JournalEntity();
        journal.setTitle("Multi-Transaction Journal");
        journal.setCurrency("CHF");
        em.persist(journal);
        em.flush();

        String journalId = journal.getId();

        // Build expense account hierarchy (6:6570)
        dev.abstratium.abstraccount.entity.AccountEntity expenses = new dev.abstratium.abstraccount.entity.AccountEntity();
        expenses.setJournalId(journalId);
        expenses.setName("6 Expenses");
        expenses.setType(AccountType.EXPENSE);
        em.persist(expenses);
        em.flush();

        dev.abstratium.abstraccount.entity.AccountEntity expense = new dev.abstratium.abstraccount.entity.AccountEntity();
        expense.setJournalId(journalId);
        expense.setName("6570 Office supplies");
        expense.setParentAccountId(expenses.getId());
        expense.setType(AccountType.EXPENSE);
        em.persist(expense);
        em.flush();

        // Build liability account (2:20:200:2000)
        dev.abstratium.abstraccount.entity.AccountEntity liabilities = new dev.abstratium.abstraccount.entity.AccountEntity();
        liabilities.setJournalId(journalId);
        liabilities.setName("2 Liabilities");
        liabilities.setType(AccountType.LIABILITY);
        em.persist(liabilities);
        em.flush();

        dev.abstratium.abstraccount.entity.AccountEntity payables = new dev.abstratium.abstraccount.entity.AccountEntity();
        payables.setJournalId(journalId);
        payables.setName("20 Accounts payable");
        payables.setParentAccountId(liabilities.getId());
        payables.setType(AccountType.LIABILITY);
        em.persist(payables);
        em.flush();

        dev.abstratium.abstraccount.entity.AccountEntity apDetail = new dev.abstratium.abstraccount.entity.AccountEntity();
        apDetail.setJournalId(journalId);
        apDetail.setName("200 AP detail");
        apDetail.setParentAccountId(payables.getId());
        apDetail.setType(AccountType.LIABILITY);
        em.persist(apDetail);
        em.flush();

        dev.abstratium.abstraccount.entity.AccountEntity ap = new dev.abstratium.abstraccount.entity.AccountEntity();
        ap.setJournalId(journalId);
        ap.setName("2000 Trade creditors");
        ap.setParentAccountId(apDetail.getId());
        ap.setType(AccountType.LIABILITY);
        em.persist(ap);
        em.flush();

        // Build bank account (1:10:100:1020)
        dev.abstratium.abstraccount.entity.AccountEntity assets = new dev.abstratium.abstraccount.entity.AccountEntity();
        assets.setJournalId(journalId);
        assets.setName("1 Assets");
        assets.setType(AccountType.ASSET);
        em.persist(assets);
        em.flush();

        dev.abstratium.abstraccount.entity.AccountEntity cash = new dev.abstratium.abstraccount.entity.AccountEntity();
        cash.setJournalId(journalId);
        cash.setName("10 Cash");
        cash.setParentAccountId(assets.getId());
        cash.setType(AccountType.ASSET);
        em.persist(cash);
        em.flush();

        dev.abstratium.abstraccount.entity.AccountEntity bank = new dev.abstratium.abstraccount.entity.AccountEntity();
        bank.setJournalId(journalId);
        bank.setName("100 Bank");
        bank.setParentAccountId(cash.getId());
        bank.setType(AccountType.ASSET);
        em.persist(bank);
        em.flush();

        dev.abstratium.abstraccount.entity.AccountEntity bankAcc = new dev.abstratium.abstraccount.entity.AccountEntity();
        bankAcc.setJournalId(journalId);
        bankAcc.setName("1020 Bank Account");
        bankAcc.setParentAccountId(bank.getId());
        bankAcc.setType(AccountType.ASSET);
        em.persist(bankAcc);
        em.flush();

        // Create a two-transaction macro mirroring PayInvoiceFromBank
        dev.abstratium.abstraccount.entity.MacroEntity macro = new dev.abstratium.abstraccount.entity.MacroEntity();
        macro.setName("TestPayInvoiceFromBank");
        macro.setDescription("Test two-transaction macro");
        macro.setParameters(
            "[{\"name\":\"invoice_date\",\"type\":\"date\",\"required\":true},"
            + "{\"name\":\"payment_date\",\"type\":\"date\",\"required\":true},"
            + "{\"name\":\"partner\",\"type\":\"partner\",\"required\":true},"
            + "{\"name\":\"description\",\"type\":\"text\",\"required\":true},"
            + "{\"name\":\"invoice_number\",\"type\":\"code\",\"required\":true},"
            + "{\"name\":\"amount\",\"type\":\"amount\",\"required\":true},"
            + "{\"name\":\"expense_account\",\"type\":\"account\",\"filter\":\"^6.*:.*$\",\"required\":true},"
            + "{\"name\":\"liability_account\",\"type\":\"account\",\"filter\":\"^2.*:20.*:200.*:2000.*$\",\"required\":true},"
            + "{\"name\":\"bank_account\",\"type\":\"account\",\"filter\":\"^1.*:10.*:100.*:1020.*$\",\"required\":true}]");
        macro.setTemplate(
            "{invoice_date} * {partner} | {description}\n"
            + "    ; invoice:{invoice_number}\n"
            + "    {expense_account}        {default_currency} {amount}\n"
            + "    {liability_account}      {default_currency} -{amount}\n"
            + "\n"
            + "{payment_date} * {partner} | Payment of invoice\n"
            + "    ; Payment:, invoice:{invoice_number}\n"
            + "    {liability_account}      {default_currency} {amount}\n"
            + "    {bank_account}           {default_currency} -{amount}");
        macro.setValidation("{\"balanceCheck\":true,\"minPostings\":2}");
        em.persist(macro);
        em.flush();

        return new String[] {
            macro.getId(), journalId,
            "6:6570", "2:20:200:2000", "1:10:100:1020"
        };
    }

    @Transactional
    String[] setupTestDataForBatchExecution() {
        dev.abstratium.abstraccount.entity.JournalEntity journal = new dev.abstratium.abstraccount.entity.JournalEntity();
        journal.setTitle("Batch Execution Journal");
        journal.setCurrency("CHF");
        em.persist(journal);
        em.flush();

        String journalId = journal.getId();

        dev.abstratium.abstraccount.entity.AccountEntity revenue = new dev.abstratium.abstraccount.entity.AccountEntity();
        revenue.setJournalId(journalId);
        revenue.setName("3400 Services revenue");
        revenue.setType(AccountType.REVENUE);
        em.persist(revenue);

        dev.abstratium.abstraccount.entity.AccountEntity feeExpense = new dev.abstratium.abstraccount.entity.AccountEntity();
        feeExpense.setJournalId(journalId);
        feeExpense.setName("6901 Payment processing fees");
        feeExpense.setType(AccountType.EXPENSE);
        em.persist(feeExpense);

        dev.abstratium.abstraccount.entity.AccountEntity processor = new dev.abstratium.abstraccount.entity.AccountEntity();
        processor.setJournalId(journalId);
        processor.setName("1021 Payment processor");
        processor.setType(AccountType.CASH);
        em.persist(processor);

        dev.abstratium.abstraccount.entity.MacroEntity macro = new dev.abstratium.abstraccount.entity.MacroEntity();
        macro.setName("TestPaymentProcessorSale");
        macro.setDescription("Test macro mirroring PaymentProcessorSale");
        macro.setParameters(
            "[{\"name\":\"date\",\"type\":\"date\",\"required\":true},"
            + "{\"name\":\"partner\",\"type\":\"partner\",\"required\":false},"
            + "{\"name\":\"description\",\"type\":\"text\",\"required\":true},"
            + "{\"name\":\"gross_amount\",\"type\":\"amount\",\"required\":true},"
            + "{\"name\":\"fee_amount\",\"type\":\"amount\",\"required\":true},"
            + "{\"name\":\"stripe_txn\",\"type\":\"code\",\"required\":true},"
            + "{\"name\":\"contract_id\",\"type\":\"code\",\"required\":true},"
            + "{\"name\":\"revenue_account\",\"type\":\"account\",\"required\":true},"
            + "{\"name\":\"fee_expense_account\",\"type\":\"account\",\"required\":true},"
            + "{\"name\":\"processor_account\",\"type\":\"account\",\"required\":true}]");
        macro.setTemplate("{date} * {partner} | {description}\n"
            + "    ; stripe_txn:{stripe_txn}, contract_id:{contract_id}\n"
            + "    {processor_account}       {default_currency} {gross_amount - fee_amount}\n"
            + "    {fee_expense_account}     {default_currency} {fee_amount}\n"
            + "    {revenue_account}         {default_currency} -{gross_amount}");
        macro.setValidation("{\"balanceCheck\":true,\"minPostings\":3}");
        em.persist(macro);

        em.flush();

        return new String[] { macro.getId(), journalId, revenue.getName().split(" ")[0],
            feeExpense.getName().split(" ")[0], processor.getName().split(" ")[0] };
    }
}
