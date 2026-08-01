package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.model.TransactionStatus;
import dev.abstratium.core.util.TestTransactionHelper;
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
import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for {@link NewYearResource}, covering both the preview and
 * execute endpoints, validation errors, and the profit/loss transfer flow.
 */
@QuarkusTest
public class NewYearResourceTest {

    @Inject
    EntityManager em;

    @Inject
    TestTransactionHelper testTransactionHelper;

    private String journalId;
    private String assetAccountId;
    private String liabilityAccountId;
    private String retainedEarningsAccountId;
    private String annualProfitLossAccountId;

    @BeforeEach
    @Transactional
    public void setup() {
        testTransactionHelper.deleteAllData();

        JournalEntity journal = new JournalEntity();
        journal.setTitle("Source Journal " + System.currentTimeMillis());
        journal.setCurrency("CHF");
        em.persist(journal);
        journalId = journal.getId();

        // Asset parent: "1 Assets"
        AccountEntity assetParent = new AccountEntity();
        assetParent.setJournalId(journalId);
        assetParent.setName("1 Assets");
        assetParent.setType(AccountType.ASSET);
        assetParent.setAccountOrder(1);
        em.persist(assetParent);

        // Asset leaf: "1020 Cash" — child of assetParent
        AccountEntity asset = new AccountEntity();
        asset.setJournalId(journalId);
        asset.setName("1020 Cash");
        asset.setType(AccountType.ASSET);
        asset.setParentAccountId(assetParent.getId());
        asset.setAccountOrder(2);
        em.persist(asset);
        assetAccountId = asset.getId();

        // Liability parent: "2 Passif"
        AccountEntity liabilityParent = new AccountEntity();
        liabilityParent.setJournalId(journalId);
        liabilityParent.setName("2 Passif");
        liabilityParent.setType(AccountType.LIABILITY);
        liabilityParent.setAccountOrder(3);
        em.persist(liabilityParent);

        // Liability leaf: "2100 Payables" — child of liabilityParent
        AccountEntity liability = new AccountEntity();
        liability.setJournalId(journalId);
        liability.setName("2100 Payables");
        liability.setType(AccountType.LIABILITY);
        liability.setParentAccountId(liabilityParent.getId());
        liability.setAccountOrder(4);
        em.persist(liability);
        liabilityAccountId = liability.getId();

        // Equity leaf: "2970 Retained Earnings" — child of liabilityParent
        AccountEntity retainedEarnings = new AccountEntity();
        retainedEarnings.setJournalId(journalId);
        retainedEarnings.setName("2970 Retained Earnings");
        retainedEarnings.setType(AccountType.EQUITY);
        retainedEarnings.setParentAccountId(liabilityParent.getId());
        retainedEarnings.setAccountOrder(5);
        em.persist(retainedEarnings);
        retainedEarningsAccountId = retainedEarnings.getId();

        // Equity leaf: "2979 Annual profit/loss" — child of liabilityParent
        AccountEntity annualProfitLoss = new AccountEntity();
        annualProfitLoss.setJournalId(journalId);
        annualProfitLoss.setName("2979 Annual profit/loss");
        annualProfitLoss.setType(AccountType.EQUITY);
        annualProfitLoss.setParentAccountId(liabilityParent.getId());
        annualProfitLoss.setAccountOrder(6);
        em.persist(annualProfitLoss);
        annualProfitLossAccountId = annualProfitLoss.getId();

        // Transaction: asset = +1000 (debit), liability = -1000 (credit)
        // This gives the asset account a non-zero balance to carry forward.
        TransactionEntity tx = new TransactionEntity();
        tx.setJournalId(journalId);
        tx.setTransactionDate(LocalDate.of(2025, 6, 1));
        tx.setStatus(TransactionStatus.CLEARED);
        tx.setDescription("Initial transaction");
        em.persist(tx);

        EntryEntity assetEntry = new EntryEntity();
        assetEntry.setTransaction(tx);
        assetEntry.setAccountId(assetAccountId);
        assetEntry.setCommodity("CHF");
        assetEntry.setAmount(new BigDecimal("1000.00"));
        assetEntry.setEntryOrder(0);
        em.persist(assetEntry);

        EntryEntity liabilityEntry = new EntryEntity();
        liabilityEntry.setTransaction(tx);
        liabilityEntry.setAccountId(liabilityAccountId);
        liabilityEntry.setCommodity("CHF");
        liabilityEntry.setAmount(new BigDecimal("-1000.00"));
        liabilityEntry.setEntryOrder(1);
        em.persist(liabilityEntry);

        // Transaction: asset = +500, annualProfitLoss = +500 (profit)
        // This gives the annual profit/loss account a balance to transfer.
        TransactionEntity profitTx = new TransactionEntity();
        profitTx.setJournalId(journalId);
        profitTx.setTransactionDate(LocalDate.of(2025, 7, 1));
        profitTx.setStatus(TransactionStatus.CLEARED);
        profitTx.setDescription("Profit transaction");
        em.persist(profitTx);

        EntryEntity profitAssetEntry = new EntryEntity();
        profitAssetEntry.setTransaction(profitTx);
        profitAssetEntry.setAccountId(assetAccountId);
        profitAssetEntry.setCommodity("CHF");
        profitAssetEntry.setAmount(new BigDecimal("500.00"));
        profitAssetEntry.setEntryOrder(0);
        em.persist(profitAssetEntry);

        EntryEntity profitEquityEntry = new EntryEntity();
        profitEquityEntry.setTransaction(profitTx);
        profitEquityEntry.setAccountId(annualProfitLossAccountId);
        profitEquityEntry.setCommodity("CHF");
        profitEquityEntry.setAmount(new BigDecimal("500.00"));
        profitEquityEntry.setEntryOrder(1);
        em.persist(profitEquityEntry);

        em.flush();
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_returnsAccountsAndBalances() {
        String requestBody = String.format("""
            {
                "sourceJournalId": "%s",
                "newJournalTitle": "New Year 2026",
                "openingDate": "2026-01-01",
                "retainedEarningsCodePath": "2:2970",
                "annualProfitLossCodePath": "2:2979"
            }
            """, journalId);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/new-year/preview")
        .then()
            .statusCode(200)
            .body("sourceJournalId", equalTo(journalId))
            .body("newJournalTitle", equalTo("New Year 2026"))
            .body("openingDate", equalTo("2026-01-01"))
            .body("retainedEarningsCodePath", equalTo("2:2970"))
            .body("annualProfitLossCodePath", equalTo("2:2979"))
            .body("accounts", not(empty()))
            .body("accountCount", greaterThan(0));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_defaultsNewJournalTitleToSourceWhenBlank() {
        String requestBody = String.format("""
            {
                "sourceJournalId": "%s",
                "newJournalTitle": "",
                "openingDate": "2026-01-01"
            }
            """, journalId);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/new-year/preview")
        .then()
            .statusCode(200)
            .body("newJournalTitle", not(emptyString()));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_missingSourceJournalId_returnsBadRequest() {
        String requestBody = """
            {
                "sourceJournalId": "",
                "openingDate": "2026-01-01"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/new-year/preview")
        .then()
            .statusCode(400);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_missingOpeningDate_returnsBadRequest() {
        String requestBody = String.format("""
            {
                "sourceJournalId": "%s",
                "openingDate": ""
            }
            """, journalId);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/new-year/preview")
        .then()
            .statusCode(400);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_invalidDateFormat_returnsBadRequest() {
        String requestBody = String.format("""
            {
                "sourceJournalId": "%s",
                "openingDate": "01-01-2026"
            }
            """, journalId);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/new-year/preview")
        .then()
            .statusCode(400);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_unknownRetainedEarningsAccount_stillSucceeds() {
        // The service logs a warning but does not fail when the retained earnings
        // account cannot be found - it just leaves the full name null.
        String requestBody = String.format("""
            {
                "sourceJournalId": "%s",
                "openingDate": "2026-01-01",
                "retainedEarningsCodePath": "9:9999"
            }
            """, journalId);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/new-year/preview")
        .then()
            .statusCode(200)
            .body("retainedEarningsCodePath", equalTo("9:9999"))
            .body("retainedEarningsFullName", nullValue());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_unknownSourceJournal_returnsError() {
        String requestBody = """
            {
                "sourceJournalId": "nonexistent-journal-id",
                "openingDate": "2026-01-01"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/new-year/preview")
        .then()
            .statusCode(anyOf(equalTo(400), equalTo(404), equalTo(500)));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecute_createsNewJournalWithAccounts() {
        String requestBody = String.format("""
            {
                "sourceJournalId": "%s",
                "newJournalTitle": "New Year 2026 %d",
                "openingDate": "2026-01-01",
                "retainedEarningsCodePath": "2:2970",
                "annualProfitLossCodePath": "2:2979"
            }
            """, journalId, System.currentTimeMillis());

        String newJournalId = given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/new-year/execute")
        .then()
            .statusCode(200)
            .body("newJournalId", not(emptyString()))
            .body("newJournalTitle", containsString("New Year 2026"))
            .body("accountCount", greaterThan(0))
            .body("openingBalanceCount", greaterThan(0))
            .extract()
            .path("newJournalId");

        verifyNewJournalCreated(newJournalId);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecute_createsRetainedEarningsTransferTransaction() {
        String requestBody = String.format("""
            {
                "sourceJournalId": "%s",
                "newJournalTitle": "New Year 2026 Transfer %d",
                "openingDate": "2026-01-01",
                "retainedEarningsCodePath": "2:2970",
                "annualProfitLossCodePath": "2:2979"
            }
            """, journalId, System.currentTimeMillis());

        String transferId = given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/new-year/execute")
        .then()
            .statusCode(200)
            .body("retainedEarningsTransferId", not(nullValue()))
            .body("retainedEarningsTransferId", not(emptyString()))
            .extract()
            .path("retainedEarningsTransferId");

        verifyTransferTransaction(transferId);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecute_withoutRetainedEarningsCodePath_skipsTransfer() {
        String requestBody = String.format("""
            {
                "sourceJournalId": "%s",
                "newJournalTitle": "New Year 2026 No Transfer %d",
                "openingDate": "2026-01-01"
            }
            """, journalId, System.currentTimeMillis());

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/new-year/execute")
        .then()
            .statusCode(200)
            .body("retainedEarningsTransferId", nullValue());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecute_missingSourceJournalId_returnsBadRequest() {
        String requestBody = """
            {
                "sourceJournalId": "",
                "openingDate": "2026-01-01"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/new-year/execute")
        .then()
            .statusCode(400);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecute_invalidDateFormat_returnsBadRequest() {
        String requestBody = String.format("""
            {
                "sourceJournalId": "%s",
                "openingDate": "not-a-date"
            }
            """, journalId);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/new-year/execute")
        .then()
            .statusCode(400);
    }

    @Test
    void testUnauthenticated_returnsUnauthorized() {
        String requestBody = """
            {
                "sourceJournalId": "any",
                "openingDate": "2026-01-01"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/new-year/preview")
        .then()
            .statusCode(anyOf(equalTo(400), equalTo(401)));
    }

    @Transactional
    void verifyNewJournalCreated(String newJournalId) {
        JournalEntity newJournal = em.find(JournalEntity.class, newJournalId);
        assertNotNull(newJournal, "New journal should exist");
        assertEquals(journalId, newJournal.getPreviousJournalId(),
            "New journal should reference the source journal as previous");

        long accountCount = em.createQuery(
                "SELECT COUNT(a) FROM AccountEntity a WHERE a.journalId = :jid", Long.class)
            .setParameter("jid", newJournalId)
            .getSingleResult();
        assertTrue(accountCount > 0, "New journal should have copied accounts");

        // Verify opening balance transactions exist with the OpeningBalances tag
        long openingTxCount = em.createQuery(
                "SELECT COUNT(DISTINCT t) FROM TransactionEntity t JOIN t.tags tag " +
                "WHERE t.journalId = :jid AND tag.tagKey = 'OpeningBalances'", Long.class)
            .setParameter("jid", newJournalId)
            .getSingleResult();
        assertTrue(openingTxCount > 0, "New journal should have opening balance transactions");
    }

    @Transactional
    void verifyTransferTransaction(String transferId) {
        TransactionEntity tx = em.find(TransactionEntity.class, transferId);
        assertNotNull(tx, "Transfer transaction should exist");
        assertEquals(LocalDate.of(2026, 1, 1), tx.getTransactionDate());

        boolean hasClosingTag = tx.getTags().stream()
            .anyMatch(tag -> "Closing".equals(tag.getTagKey()));
        assertTrue(hasClosingTag, "Transfer transaction should have a Closing tag");

        // The transfer transaction should be balanced (sum of entries == 0)
        BigDecimal sum = tx.getEntries().stream()
            .map(EntryEntity::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, sum.compareTo(BigDecimal.ZERO),
            "Transfer transaction should be balanced but sum is " + sum);
    }
}
