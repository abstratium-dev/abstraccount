package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TagEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.model.TransactionStatus;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Integration tests for JournalResource endpoints not covered elsewhere:
 * getTransactions, getTags, deleteJournal, uploadJournal.
 */
@QuarkusTest
class JournalTransactionResourceTest {

    @Inject
    EntityManager em;

    private String journalId;
    private String assetAccountId;
    private String expenseAccountId;

    @BeforeEach
    @Transactional
    void setUp() {
        em.createQuery("DELETE FROM EntryEntity").executeUpdate();
        em.createQuery("DELETE FROM TagEntity").executeUpdate();
        em.createQuery("DELETE FROM TransactionEntity").executeUpdate();
        em.createQuery("DELETE FROM AccountEntity").executeUpdate();
        em.createQuery("DELETE FROM JournalEntity").executeUpdate();

        JournalEntity journal = new JournalEntity();
        journal.setTitle("TX Resource Test Journal");
        journal.setCurrency("CHF");
        em.persist(journal);
        journalId = journal.getId();

        AccountEntity asset = new AccountEntity();
        asset.setJournalId(journalId);
        asset.setName("1000 Cash");
        asset.setType(AccountType.CASH);
        asset.setAccountOrder(1);
        em.persist(asset);
        assetAccountId = asset.getId();

        AccountEntity expense = new AccountEntity();
        expense.setJournalId(journalId);
        expense.setName("5000 Expenses");
        expense.setType(AccountType.EXPENSE);
        expense.setAccountOrder(2);
        em.persist(expense);
        expenseAccountId = expense.getId();

        // Transaction 1: 2025-01-10, CLEARED, with a tag
        TransactionEntity tx1 = new TransactionEntity();
        tx1.setJournalId(journalId);
        tx1.setTransactionDate(LocalDate.of(2025, 1, 10));
        tx1.setStatus(TransactionStatus.CLEARED);
        tx1.setDescription("January rent");
        em.persist(tx1);

        EntryEntity e1a = new EntryEntity();
        e1a.setTransaction(tx1); e1a.setAccountId(expenseAccountId);
        e1a.setCommodity("CHF"); e1a.setAmount(new BigDecimal("500.00")); e1a.setEntryOrder(0);
        em.persist(e1a);

        EntryEntity e1b = new EntryEntity();
        e1b.setTransaction(tx1); e1b.setAccountId(assetAccountId);
        e1b.setCommodity("CHF"); e1b.setAmount(new BigDecimal("-500.00")); e1b.setEntryOrder(1);
        em.persist(e1b);

        TagEntity tag1 = new TagEntity();
        tag1.setTransaction(tx1); tag1.setTagKey("category"); tag1.setTagValue("rent");
        em.persist(tag1);

        // Transaction 2: 2025-06-15, PENDING, no tags
        TransactionEntity tx2 = new TransactionEntity();
        tx2.setJournalId(journalId);
        tx2.setTransactionDate(LocalDate.of(2025, 6, 15));
        tx2.setStatus(TransactionStatus.PENDING);
        tx2.setDescription("June utilities");
        em.persist(tx2);

        EntryEntity e2a = new EntryEntity();
        e2a.setTransaction(tx2); e2a.setAccountId(expenseAccountId);
        e2a.setCommodity("CHF"); e2a.setAmount(new BigDecimal("120.00")); e2a.setEntryOrder(0);
        em.persist(e2a);

        EntryEntity e2b = new EntryEntity();
        e2b.setTransaction(tx2); e2b.setAccountId(assetAccountId);
        e2b.setCommodity("CHF"); e2b.setAmount(new BigDecimal("-120.00")); e2b.setEntryOrder(1);
        em.persist(e2b);

        em.flush();
    }

    // ── getTransactions ──────────────────────────────────────────────────────

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetTransactions_noFilters_returnsAll() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/journal/{journalId}/transactions", journalId)
        .then()
            .statusCode(200)
            .body("$", hasSize(2))
            .body("[0].description", notNullValue())
            .body("[0].entries", not(empty()));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetTransactions_filterByStartDate_returnsOnlyAfter() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("startDate", "2025-06-01")
        .when()
            .get("/api/journal/{journalId}/transactions", journalId)
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].description", equalTo("June utilities"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetTransactions_filterByEndDate_returnsOnlyBefore() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("endDate", "2025-03-01")
        .when()
            .get("/api/journal/{journalId}/transactions", journalId)
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].description", equalTo("January rent"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetTransactions_filterByStatus_returnsClearedOnly() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("status", "CLEARED")
        .when()
            .get("/api/journal/{journalId}/transactions", journalId)
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].status", equalTo("CLEARED"))
            .body("[0].description", equalTo("January rent"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetTransactions_transactionsIncludeTags() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("startDate", "2025-01-01")
            .queryParam("endDate", "2025-01-31")
        .when()
            .get("/api/journal/{journalId}/transactions", journalId)
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].tags", hasSize(1))
            .body("[0].tags[0].key", equalTo("category"))
            .body("[0].tags[0].value", equalTo("rent"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetTransactions_withEqlFilter_returnsMatching() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("filter", "tag:category:rent")
        .when()
            .get("/api/journal/{journalId}/transactions", journalId)
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].description", equalTo("January rent"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetTransactions_invalidEqlFilter_returns400() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("filter", "@@@@@")
        .when()
            .get("/api/journal/{journalId}/transactions", journalId)
        .then()
            .statusCode(400);
    }

    // ── getTags ───────────────────────────────────────────────────────────────

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetTags_returnsDistinctTags() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/journal/{journalId}/tags", journalId)
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].key", equalTo("category"))
            .body("[0].value", equalTo("rent"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetTags_journalWithNoTags_returnsEmpty() {
        String emptyJournalId = createEmptyJournal();

        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/journal/{journalId}/tags", emptyJournalId)
        .then()
            .statusCode(200)
            .body("$", empty());
    }

    // ── deleteJournal ─────────────────────────────────────────────────────────

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteJournal_existingJournal_deletesSuccessfully() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .delete("/api/journal/{journalId}", journalId)
        .then()
            .statusCode(200)
            .body("status", equalTo("success"))
            .body("journalId", equalTo(journalId));

        // Verify journal is gone
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/journal/{journalId}/metadata", journalId)
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteJournal_nonExistentJournal_returns404() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .delete("/api/journal/{journalId}", "nonexistent-journal-id")
        .then()
            .statusCode(404);
    }

    // ── uploadJournal ─────────────────────────────────────────────────────────

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUploadJournal_validContent_returnsSuccess() {
        String journalContent = """
            ; title: Upload Test Journal
            ; currency: CHF
            
            account 1 Assets
              ; type:Asset
            account 2 Equity
              ; type:Equity
            
            2025-03-01 * Test transaction
                1 Assets  CHF  100.00
                2 Equity  CHF  -100.00
            """;

        given()
            .contentType(ContentType.TEXT)
            .body(journalContent)
        .when()
            .post("/api/journal/upload")
        .then()
            .statusCode(200)
            .body("status", equalTo("success"))
            .body("journalId", notNullValue())
            .body("transactionCount", equalTo(1))
            .body("accountCount", greaterThanOrEqualTo(2));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetTransactions_nonExistentJournal_returnsEmpty() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/journal/{journalId}/transactions", "nonexistent-id")
        .then()
            .statusCode(200)
            .body("$", empty());
    }

    @Transactional
    String createEmptyJournal() {
        JournalEntity j = new JournalEntity();
        j.setTitle("Empty Journal");
        j.setCurrency("CHF");
        em.persist(j);
        em.flush();
        return j.getId();
    }
}
