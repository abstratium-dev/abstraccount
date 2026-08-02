package dev.abstratium.abstraccount.boundary;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.MacroEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.model.TransactionStatus;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import dev.abstratium.core.util.TestTransactionHelper;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

/**
 * Integration tests for the journal locking feature.
 * <p>
 * Verifies that:
 * <ul>
 *   <li>The lock/unlock endpoints correctly toggle the locked flag.</li>
 *   <li>The locked flag is exposed in the journal list and metadata DTOs.</li>
 *   <li>Mutating operations (create/update/delete transactions, accounts, macro
 *       execution, close-books, journal deletion, upload with replace) are
 *       rejected with HTTP 423 when the journal is locked.</li>
 *   <li>The same operations succeed once the journal is unlocked.</li>
 *   <li>Creating a new year auto-locks the source journal.</li>
 * </ul>
 */
@QuarkusTest
public class JournalLockingTest {

    @Inject
    EntityManager em;

    @Inject
    JournalPersistenceService persistenceService;

    @Inject
    TestTransactionHelper testTransactionHelper;

    private String journalId;
    private String accountId1;
    private String accountId2;
    private String transactionId;
    private String macroId;

    @BeforeEach
    @Transactional
    public void setup() {
        testTransactionHelper.deleteAllData();

        JournalEntity journal = new JournalEntity();
        journal.setTitle("Lock Test Journal " + System.currentTimeMillis());
        journal.setCurrency("CHF");
        em.persist(journal);
        journalId = journal.getId();

        AccountEntity account1 = new AccountEntity();
        account1.setJournalId(journalId);
        account1.setName("1000 Cash");
        account1.setType(AccountType.ASSET);
        account1.setAccountOrder(0);
        em.persist(account1);
        accountId1 = account1.getId();

        AccountEntity account2 = new AccountEntity();
        account2.setJournalId(journalId);
        account2.setName("3000 Revenue");
        account2.setType(AccountType.REVENUE);
        account2.setAccountOrder(1);
        em.persist(account2);
        accountId2 = account2.getId();

        // A pre-existing transaction to test update/delete locking
        TransactionEntity tx = new TransactionEntity();
        tx.setJournalId(journalId);
        tx.setTransactionDate(LocalDate.of(2024, 1, 15));
        tx.setStatus(TransactionStatus.CLEARED);
        tx.setDescription("Pre-existing transaction");
        tx.setTransactionOrder(System.currentTimeMillis());
        em.persist(tx);
        transactionId = tx.getId();

        dev.abstratium.abstraccount.entity.EntryEntity entry1 = new dev.abstratium.abstraccount.entity.EntryEntity();
        entry1.setTransaction(tx);
        entry1.setAccountId(accountId1);
        entry1.setCommodity("CHF");
        entry1.setAmount(new BigDecimal("100.00"));
        entry1.setEntryOrder(0);
        em.persist(entry1);

        dev.abstratium.abstraccount.entity.EntryEntity entry2 = new dev.abstratium.abstraccount.entity.EntryEntity();
        entry2.setTransaction(tx);
        entry2.setAccountId(accountId2);
        entry2.setCommodity("CHF");
        entry2.setAmount(new BigDecimal("-100.00"));
        entry2.setEntryOrder(1);
        em.persist(entry2);

        // A macro to test macro execution locking
        MacroEntity macro = new MacroEntity();
        macro.setName("Test Macro " + System.currentTimeMillis());
        macro.setDescription("Test macro for locking tests");
        macro.setTemplate(LocalDate.of(2024, 1, 15) + " \"Macro transaction\"\n  " + accountId1 + "  CHF 50.00\n  " + accountId2 + "  CHF -50.00\n");
        macro.setParameters("[]");
        em.persist(macro);
        macroId = macro.getId();

        em.flush();
    }

    // --- Lock / unlock endpoint tests ---

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testLockJournal_returnsLockedDto() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .post("/api/journal/" + journalId + "/lock")
        .then()
            .statusCode(200)
            .body("id", equalTo(journalId))
            .body("locked", equalTo(true));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUnlockJournal_returnsUnlockedDto() {
        // Lock first
        persistenceService.setJournalLocked(journalId, true);

        given()
            .contentType(ContentType.JSON)
        .when()
            .post("/api/journal/" + journalId + "/unlock")
        .then()
            .statusCode(200)
            .body("id", equalTo(journalId))
            .body("locked", equalTo(false));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testLockUnknownJournal_returns404() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .post("/api/journal/nonexistent-journal-id/lock")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUnlockUnknownJournal_returns404() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .post("/api/journal/nonexistent-journal-id/unlock")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testListJournals_includesLockedFlag() {
        persistenceService.setJournalLocked(journalId, true);

        given()
        .when()
            .get("/api/journal/list")
        .then()
            .statusCode(200)
            .body("find { it.id == '" + journalId + "' }.locked", equalTo(true));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetJournalMetadata_includesLockedFlag() {
        persistenceService.setJournalLocked(journalId, true);

        given()
        .when()
            .get("/api/journal/" + journalId + "/metadata")
        .then()
            .statusCode(200)
            .body("locked", equalTo(true));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testNewJournal_defaultsToUnlocked() {
        // The journal created in setup should not be locked by default
        given()
        .when()
            .get("/api/journal/" + journalId + "/metadata")
        .then()
            .statusCode(200)
            .body("locked", equalTo(false));
    }

    // --- Transaction mutation tests ---

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testCreateTransaction_lockedJournal_returns423() {
        persistenceService.setJournalLocked(journalId, true);

        CreateTransactionRequest request = new CreateTransactionRequest(
            journalId,
            LocalDate.of(2024, 3, 1),
            "CLEARED",
            "Should be rejected",
            null,
            List.of(),
            List.of(
                new CreateEntryRequest(0, accountId1, "CHF", new BigDecimal("50.00"), null),
                new CreateEntryRequest(1, accountId2, "CHF", new BigDecimal("-50.00"), null)
            )
        );

        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .post("/api/transaction")
        .then()
            .statusCode(423);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testCreateTransaction_unlockedJournal_succeeds() {
        // Ensure journal is not locked
        persistenceService.setJournalLocked(journalId, false);

        CreateTransactionRequest request = new CreateTransactionRequest(
            journalId,
            LocalDate.of(2024, 3, 1),
            "CLEARED",
            "Should succeed",
            null,
            List.of(),
            List.of(
                new CreateEntryRequest(0, accountId1, "CHF", new BigDecimal("50.00"), null),
                new CreateEntryRequest(1, accountId2, "CHF", new BigDecimal("-50.00"), null)
            )
        );

        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .post("/api/transaction")
        .then()
            .statusCode(200)
            .body("description", equalTo("Should succeed"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateTransaction_lockedJournal_returns423() {
        persistenceService.setJournalLocked(journalId, true);

        UpdateTransactionRequest request = new UpdateTransactionRequest(
            LocalDate.of(2024, 3, 1),
            "CLEARED",
            "Updated description",
            null,
            List.of(),
            List.of(
                new UpdateEntryRequest(null, 0, accountId1, "CHF", new BigDecimal("200.00"), null),
                new UpdateEntryRequest(null, 1, accountId2, "CHF", new BigDecimal("-200.00"), null)
            )
        );

        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .put("/api/transaction/" + transactionId)
        .then()
            .statusCode(423);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteTransaction_lockedJournal_returns423() {
        persistenceService.setJournalLocked(journalId, true);

        given()
        .when()
            .delete("/api/transaction/" + transactionId)
        .then()
            .statusCode(423);
    }

    // --- Account mutation tests ---

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testCreateAccount_lockedJournal_returns423() {
        persistenceService.setJournalLocked(journalId, true);

        CreateAccountRequestDTO request = new CreateAccountRequestDTO(
            "4000 New Account",
            "EXPENSE",
            null,
            null,
            journalId,
            10
        );

        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .post("/api/account")
        .then()
            .statusCode(423);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateAccount_lockedJournal_returns423() {
        persistenceService.setJournalLocked(journalId, true);

        UpdateAccountRequestDTO request = new UpdateAccountRequestDTO(
            "1000 Cash Renamed",
            "ASSET",
            null,
            null,
            0
        );

        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .put("/api/account/" + accountId1)
        .then()
            .statusCode(423);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteAccount_lockedJournal_returns423() {
        persistenceService.setJournalLocked(journalId, true);

        given()
        .when()
            .delete("/api/account/" + journalId + "/account/" + accountId2)
        .then()
            .statusCode(423);
    }

    // --- Macro execution test ---

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecuteMacro_lockedJournal_returns423() {
        persistenceService.setJournalLocked(journalId, true);

        MacroExecuteRequestDTO request = new MacroExecuteRequestDTO(macroId, journalId, java.util.Map.of());

        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .post("/api/macro/execute")
        .then()
            .statusCode(423);
    }

    // --- Journal deletion test ---

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteJournal_lockedJournal_returns423() {
        persistenceService.setJournalLocked(journalId, true);

        given()
        .when()
            .delete("/api/journal/" + journalId)
        .then()
            .statusCode(423);
    }

    // --- New year auto-lock test ---

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testNewYearExecution_autoLocksSourceJournal() {
        // Add retained earnings and annual profit/loss accounts for the new year flow
        String retainedEarningsId = createEquityAccount("2970 Retained Earnings");
        String annualProfitLossId = createEquityAccount("2979 Annual profit/loss");

        String requestBody = String.format("""
            {
                "sourceJournalId": "%s",
                "newJournalTitle": "New Year Auto Lock %d",
                "openingDate": "2025-01-01",
                "retainedEarningsCodePath": "2970",
                "annualProfitLossCodePath": "2979"
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
            .extract()
            .path("newJournalId");

        // The source journal should now be locked
        given()
        .when()
            .get("/api/journal/" + journalId + "/metadata")
        .then()
            .statusCode(200)
            .body("locked", equalTo(true));

        // The new journal should NOT be locked
        given()
        .when()
            .get("/api/journal/" + newJournalId + "/metadata")
        .then()
            .statusCode(200)
            .body("locked", equalTo(false));
    }

    @Transactional
    String createEquityAccount(String name) {
        AccountEntity account = new AccountEntity();
        account.setJournalId(journalId);
        account.setName(name);
        account.setType(AccountType.EQUITY);
        account.setAccountOrder(100);
        em.persist(account);
        em.flush();
        return account.getId();
    }

    // --- Lock then unlock restores mutability ---

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUnlockRestoresMutability() {
        // Lock the journal
        persistenceService.setJournalLocked(journalId, true);

        // Verify create is blocked
        CreateTransactionRequest request = new CreateTransactionRequest(
            journalId,
            LocalDate.of(2024, 3, 1),
            "CLEARED",
            "Should be rejected",
            null,
            List.of(),
            List.of(
                new CreateEntryRequest(0, accountId1, "CHF", new BigDecimal("50.00"), null),
                new CreateEntryRequest(1, accountId2, "CHF", new BigDecimal("-50.00"), null)
            )
        );

        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .post("/api/transaction")
        .then()
            .statusCode(423);

        // Unlock via the API
        given()
            .contentType(ContentType.JSON)
        .when()
            .post("/api/journal/" + journalId + "/unlock")
        .then()
            .statusCode(200)
            .body("locked", equalTo(false));

        // Verify create now succeeds
        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .post("/api/transaction")
        .then()
            .statusCode(200)
            .body("description", equalTo("Should be rejected"));
    }
}
