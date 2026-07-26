package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.service.JournalParser;
import dev.abstratium.abstraccount.service.JournalSerializer;
import dev.abstratium.abstraccount.model.Journal;
import dev.abstratium.abstraccount.model.Transaction;
import dev.abstratium.abstraccount.model.TransactionStatus;
import dev.abstratium.abstraccount.model.Account;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.model.Amount;
import dev.abstratium.abstraccount.model.Commodity;
import dev.abstratium.abstraccount.model.Entry;
import dev.abstratium.abstraccount.model.Tag;
import dev.abstratium.core.util.TestTransactionHelper;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test for journal export via REST API.
 * Tests the complete flow: upload journal → export → verify content matches.
 * Also tests round-trip: upload → export → parse exported content → verify data integrity.
 */
@QuarkusTest
class JournalExportIntegrationTest {

    @Inject
    JournalParser journalParser;

    @Inject
    JournalSerializer journalSerializer;

    @Inject
    TestTransactionHelper testTransactionHelper;

    @BeforeEach
    @Transactional
    void setUp() {
        testTransactionHelper.deleteAllData();
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExportJournalReturnsTextContent() throws IOException {
        String journalContent = Files.readString(
            Paths.get("src/test/resources/test-export-journal.txt")
        );

        // Upload the journal first
        String journalId = given()
            .contentType(io.restassured.http.ContentType.TEXT)
            .body(journalContent)
        .when()
            .post("/api/journal/upload")
        .then()
            .statusCode(200)
            .extract().jsonPath().getString("journalId");

        // Export the journal
        String exportedContent = given()
            .accept(io.restassured.http.ContentType.TEXT)
        .when()
            .get("/api/journal/" + journalId + "/export")
        .then()
            .statusCode(200)
            .extract().asString();

        assertNotNull(exportedContent);
        assertFalse(exportedContent.isBlank());

        // Verify metadata is present
        assertTrue(exportedContent.contains("; title: Export Test Journal"));
        assertTrue(exportedContent.contains("; Currency: EUR"));

        // Verify commodity declaration
        assertTrue(exportedContent.contains("commodity EUR 1000.00"));

        // Verify accounts are present
        assertTrue(exportedContent.contains("account 1 Assets"));
        assertTrue(exportedContent.contains("account 1 Assets:10 Cash"));
        assertTrue(exportedContent.contains("account 2 Equity"));
        assertTrue(exportedContent.contains("account 3 Revenue"));
        assertTrue(exportedContent.contains("account 4 Expenses"));

        // Verify account types
        assertTrue(exportedContent.contains("; type:Asset"));
        assertTrue(exportedContent.contains("; type:Cash"));
        assertTrue(exportedContent.contains("; type:Equity"));
        assertTrue(exportedContent.contains("; type:Revenue"));
        assertTrue(exportedContent.contains("; type:Expense"));

        // Verify account note
        assertTrue(exportedContent.contains("; note:All assets"));

        // Verify transactions are present (with and without partner IDs)
        assertTrue(exportedContent.contains("2025-01-01 * Opening Balance"));
        assertTrue(exportedContent.contains("2025-02-15 * CUST-001 | First Sale"));
        assertTrue(exportedContent.contains("2025-03-10 ! SUPP-001 | Office Supplies"));
        assertTrue(exportedContent.contains("2025-04-05 * Bank Fee"));

        // Verify tags
        assertTrue(exportedContent.contains("; OpeningBalances:"));
        assertTrue(exportedContent.contains("; invoice:INV-TEST-001"));

        // Verify amounts
        assertTrue(exportedContent.contains("EUR 5000.00"));
        assertTrue(exportedContent.contains("EUR -5000.00"));
        assertTrue(exportedContent.contains("EUR 800.00"));
        assertTrue(exportedContent.contains("EUR -800.00"));
        assertTrue(exportedContent.contains("EUR 120.50"));
        assertTrue(exportedContent.contains("EUR -120.50"));
        assertTrue(exportedContent.contains("EUR 15.00"));
        assertTrue(exportedContent.contains("EUR -15.00"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExportJournalRoundTrip() throws IOException {
        String journalContent = Files.readString(
            Paths.get("src/test/resources/test-export-journal.txt")
        );

        // Upload the journal
        String journalId = given()
            .contentType(io.restassured.http.ContentType.TEXT)
            .body(journalContent)
        .when()
            .post("/api/journal/upload")
        .then()
            .statusCode(200)
            .extract().jsonPath().getString("journalId");

        // Export the journal
        String exportedContent = given()
            .accept(io.restassured.http.ContentType.TEXT)
        .when()
            .get("/api/journal/" + journalId + "/export")
        .then()
            .statusCode(200)
            .extract().asString();

        // Parse the exported content back
        Journal reparsed = journalParser.parse(exportedContent);

        // Verify metadata
        assertEquals("Export Test Journal", reparsed.title());
        assertEquals("EUR", reparsed.currency());

        // Verify accounts
        assertEquals(5, reparsed.accounts().size());

        // Verify transactions (DB query returns them in descending date order)
        assertEquals(4, reparsed.transactions().size());

        Transaction tx4 = reparsed.transactions().get(0);
        assertEquals("2025-04-05", tx4.date().toString());
        assertEquals(TransactionStatus.CLEARED, tx4.status());
        assertEquals("Bank Fee", tx4.description());
        assertNull(tx4.partnerId(), "Bank Fee should not have a partner ID");
        assertEquals(2, tx4.entries().size());
        assertTrue(tx4.isBalanced(), "Bank Fee should be balanced");

        Transaction tx3 = reparsed.transactions().get(1);
        assertEquals("2025-03-10", tx3.date().toString());
        assertEquals(TransactionStatus.PENDING, tx3.status());
        assertEquals("Office Supplies", tx3.description());
        assertEquals("SUPP-001", tx3.partnerId(), "Office Supplies should have partner ID");
        assertEquals(2, tx3.entries().size());
        assertTrue(tx3.isBalanced(), "Office Supplies should be balanced");

        Transaction tx2 = reparsed.transactions().get(2);
        assertEquals("2025-02-15", tx2.date().toString());
        assertEquals(TransactionStatus.CLEARED, tx2.status());
        assertEquals("First Sale", tx2.description());
        assertEquals("CUST-001", tx2.partnerId(), "First Sale should have partner ID");
        assertEquals(2, tx2.entries().size());
        assertTrue(tx2.isBalanced(), "First Sale should be balanced");
        assertEquals("INV-TEST-001", tx2.getTagValue("invoice"));

        Transaction tx1 = reparsed.transactions().get(3);
        assertEquals("2025-01-01", tx1.date().toString());
        assertEquals(TransactionStatus.CLEARED, tx1.status());
        assertEquals("Opening Balance", tx1.description());
        assertNull(tx1.partnerId(), "Opening Balance should not have a partner ID");
        assertEquals(2, tx1.entries().size());
        assertTrue(tx1.isBalanced(), "Opening Balance should be balanced");
        assertTrue(tx1.hasTag("OpeningBalances"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExportNonExistentJournalReturns404() {
        given()
            .accept(io.restassured.http.ContentType.TEXT)
        .when()
            .get("/api/journal/non-existent-id/export")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExportJournalWithPartnerId() throws IOException {
        String journalContent = """
            ; title: Partner Export Test
            ; Currency: USD

            commodity USD 1000.00

            account 1 Assets
              ; type:Asset

            account 2 Liabilities
              ; type:Liability

            2025-04-01 * SUPP-001 | Purchase from supplier
                1 Assets    USD 300.00
                2 Liabilities    USD -300.00
            """;

        // Upload
        String journalId = given()
            .contentType(io.restassured.http.ContentType.TEXT)
            .body(journalContent)
        .when()
            .post("/api/journal/upload")
        .then()
            .statusCode(200)
            .extract().jsonPath().getString("journalId");

        // Export
        String exportedContent = given()
            .accept(io.restassured.http.ContentType.TEXT)
        .when()
            .get("/api/journal/" + journalId + "/export")
        .then()
            .statusCode(200)
            .extract().asString();

        // Verify partner ID is in the exported content
        assertTrue(exportedContent.contains("SUPP-001 | Purchase from supplier"),
            "Exported content should contain partner ID and description");

        // Parse back and verify partnerId is preserved
        Journal reparsed = journalParser.parse(exportedContent);
        assertEquals(1, reparsed.transactions().size());
        assertEquals("SUPP-001", reparsed.transactions().get(0).partnerId());
        assertEquals("Purchase from supplier", reparsed.transactions().get(0).description());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExportEmptyJournal() {
        // Create a journal with no accounts or transactions via the create endpoint
        String journalId = given()
            .contentType(io.restassured.http.ContentType.JSON)
            .body("""
                {
                  "title": "Empty Export Test",
                  "currency": "USD"
                }
                """)
        .when()
            .post("/api/journal/create")
        .then()
            .statusCode(200)
            .extract().jsonPath().getString("id");

        // Export the empty journal
        String exportedContent = given()
            .accept(io.restassured.http.ContentType.TEXT)
        .when()
            .get("/api/journal/" + journalId + "/export")
        .then()
            .statusCode(200)
            .extract().asString();

        // Should contain at least the title and currency
        assertTrue(exportedContent.contains("; title: Empty Export Test"));
        assertTrue(exportedContent.contains("; Currency: USD"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExportImportedJournalIsIdentical() {
        // Build a Journal model programmatically, with transactions in descending date order
        // (matching the DB query ORDER BY transactionDate DESC)
        Account assets = Account.root("acc-1", "1 Assets", AccountType.ASSET, "All assets");
        Account cash = Account.child("acc-2", "10 Cash", AccountType.CASH, null, assets);
        Account equity = Account.root("acc-3", "2 Equity", AccountType.EQUITY, null);
        Account revenue = Account.root("acc-4", "3 Revenue", AccountType.REVENUE, null);
        Account expenses = Account.root("acc-5", "4 Expenses", AccountType.EXPENSE, null);

        Commodity eur = new Commodity("EUR", new java.math.BigDecimal("1000.00"));

        // Transactions in descending date order (matching DB output)
        Transaction tx1 = new Transaction(
            java.time.LocalDate.of(2025, 4, 5),
            TransactionStatus.CLEARED,
            "Bank Fee",
            null, null,
            java.util.List.of(),
            java.util.List.of(
                Entry.simple(expenses, Amount.of("EUR", "15.00")),
                Entry.simple(cash, Amount.of("EUR", "-15.00"))
            )
        );

        Transaction tx2 = new Transaction(
            java.time.LocalDate.of(2025, 3, 10),
            TransactionStatus.PENDING,
            "Office Supplies",
            "SUPP-001", null,
            java.util.List.of(),
            java.util.List.of(
                Entry.simple(expenses, Amount.of("EUR", "120.50")),
                Entry.simple(cash, Amount.of("EUR", "-120.50"))
            )
        );

        Transaction tx3 = new Transaction(
            java.time.LocalDate.of(2025, 2, 15),
            TransactionStatus.CLEARED,
            "First Sale",
            "CUST-001", null,
            java.util.List.of(Tag.keyValue("invoice", "INV-TEST-001")),
            java.util.List.of(
                Entry.simple(cash, Amount.of("EUR", "800.00")),
                Entry.simple(revenue, Amount.of("EUR", "-800.00"))
            )
        );

        Transaction tx4 = new Transaction(
            java.time.LocalDate.of(2025, 1, 1),
            TransactionStatus.CLEARED,
            "Opening Balance",
            null, null,
            java.util.List.of(Tag.simple("OpeningBalances")),
            java.util.List.of(
                Entry.simple(cash, Amount.of("EUR", "5000.00")),
                Entry.simple(equity, Amount.of("EUR", "-5000.00"))
            )
        );

        Journal journal = new Journal(
            null,
            "Export Identity Test",
            "Synthetic data for identity test",
            "EUR",
            java.util.List.of(eur),
            java.util.List.of(assets, cash, equity, revenue, expenses),
            java.util.List.of(tx1, tx2, tx3, tx4)
        );

        // Serialize the model to get the expected file content
        String expectedContent = journalSerializer.serialize(journal);

        // Upload the serialized content (this is the "imported file")
        String journalId = given()
            .contentType(io.restassured.http.ContentType.TEXT)
            .body(expectedContent)
        .when()
            .post("/api/journal/upload")
        .then()
            .statusCode(200)
            .extract().jsonPath().getString("journalId");

        // Export from DB (this is the "exported file")
        String exportedContent = given()
            .accept(io.restassured.http.ContentType.TEXT)
        .when()
            .get("/api/journal/" + journalId + "/export")
        .then()
            .statusCode(200)
            .extract().asString();

        // The exported file must be identical to the imported file
        assertEquals(expectedContent, exportedContent,
            "Exported journal content must be identical to the imported file content");
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExportWithoutTransactions() throws IOException {
        String journalContent = Files.readString(
            Paths.get("src/test/resources/test-export-journal.txt")
        );

        // Upload the journal
        String journalId = given()
            .contentType(io.restassured.http.ContentType.TEXT)
            .body(journalContent)
        .when()
            .post("/api/journal/upload")
        .then()
            .statusCode(200)
            .extract().jsonPath().getString("journalId");

        // Export without transactions
        String exportedContent = given()
            .accept(io.restassured.http.ContentType.TEXT)
            .queryParam("includeTransactions", false)
        .when()
            .get("/api/journal/" + journalId + "/export")
        .then()
            .statusCode(200)
            .extract().asString();

        // Verify metadata is present
        assertTrue(exportedContent.contains("; title: Export Test Journal"));
        assertTrue(exportedContent.contains("; Currency: EUR"));

        // Verify commodity declaration
        assertTrue(exportedContent.contains("commodity EUR 1000.00"));

        // Verify accounts are present
        assertTrue(exportedContent.contains("account 1 Assets"));
        assertTrue(exportedContent.contains("account 1 Assets:10 Cash"));
        assertTrue(exportedContent.contains("account 2 Equity"));
        assertTrue(exportedContent.contains("account 3 Revenue"));
        assertTrue(exportedContent.contains("account 4 Expenses"));

        // Verify account types and notes
        assertTrue(exportedContent.contains("; type:Asset"));
        assertTrue(exportedContent.contains("; note:All assets"));

        // Verify NO transactions are present
        assertFalse(exportedContent.contains("TRANSACTIONS"), "Transactions section should be absent");
        assertFalse(exportedContent.contains("2025-01-01"), "No transaction dates should be present");
        assertFalse(exportedContent.contains("Opening Balance"), "No transaction descriptions should be present");
        assertFalse(exportedContent.contains("First Sale"), "No transaction descriptions should be present");
        assertFalse(exportedContent.contains("Office Supplies"), "No transaction descriptions should be present");
        assertFalse(exportedContent.contains("Bank Fee"), "No transaction descriptions should be present");
        assertFalse(exportedContent.contains("EUR 5000.00"), "No transaction amounts should be present");
        assertFalse(exportedContent.contains("EUR 800.00"), "No transaction amounts should be present");
        assertFalse(exportedContent.contains("EUR 15.00"), "No transaction amounts should be present");

        // Parse back and verify structure
        Journal reparsed = journalParser.parse(exportedContent);
        assertEquals("Export Test Journal", reparsed.title());
        assertEquals("EUR", reparsed.currency());
        assertEquals(5, reparsed.accounts().size());
        assertTrue(reparsed.transactions().isEmpty(), "Parsed journal should have no transactions");
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExportWithoutTransactionsCanBeReimported() throws IOException {
        String journalContent = Files.readString(
            Paths.get("src/test/resources/test-export-journal.txt")
        );

        // Upload the journal
        String journalId = given()
            .contentType(io.restassured.http.ContentType.TEXT)
            .body(journalContent)
        .when()
            .post("/api/journal/upload")
        .then()
            .statusCode(200)
            .extract().jsonPath().getString("journalId");

        // Export without transactions
        String exportedContent = given()
            .accept(io.restassured.http.ContentType.TEXT)
            .queryParam("includeTransactions", false)
        .when()
            .get("/api/journal/" + journalId + "/export")
        .then()
            .statusCode(200)
            .extract().asString();

        // Re-import the exported content (without transactions) as a new journal
        String newJournalId = given()
            .contentType(io.restassured.http.ContentType.TEXT)
            .body(exportedContent)
        .when()
            .post("/api/journal/upload")
        .then()
            .statusCode(200)
            .extract().jsonPath().getString("journalId");

        // Verify the new journal has accounts but no transactions
        String reExportedContent = given()
            .accept(io.restassured.http.ContentType.TEXT)
        .when()
            .get("/api/journal/" + newJournalId + "/export")
        .then()
            .statusCode(200)
            .extract().asString();

        Journal reparsed = journalParser.parse(reExportedContent);
        assertEquals(5, reparsed.accounts().size(), "Re-imported journal should have 5 accounts");
        assertTrue(reparsed.transactions().isEmpty(), "Re-imported journal should have no transactions");
    }
}
