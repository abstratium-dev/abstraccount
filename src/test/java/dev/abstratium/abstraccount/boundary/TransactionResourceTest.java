package dev.abstratium.abstraccount.boundary;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.model.TransactionStatus;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

@QuarkusTest
public class TransactionResourceTest {

    @Inject
    JournalPersistenceService persistenceService;

    private String journalId;
    private String accountId1;
    private String accountId2;

    @BeforeEach
    @Transactional
    public void setup() {
        // Clean up
        persistenceService.deleteAll();

        // Create a test journal
        JournalEntity journal = new JournalEntity();
        journal.setTitle("Test Journal");
        journal.setSubtitle("For testing");
        journal.setCurrency("CHF");
        journal = persistenceService.saveJournal(journal);
        journalId = journal.getId();

        // Create test accounts
        AccountEntity account1 = new AccountEntity();
        account1.setJournalId(journalId);
        account1.setName("1000 Cash");
        account1.setType(AccountType.ASSET);
        account1 = persistenceService.saveAccount(account1);
        accountId1 = account1.getId();

        AccountEntity account2 = new AccountEntity();
        account2.setJournalId(journalId);
        account2.setName("3000 Revenue");
        account2.setType(AccountType.REVENUE);
        account2 = persistenceService.saveAccount(account2);
        accountId2 = account2.getId();
    }

    @Test
    public void testCreateTransaction() {
        CreateTransactionRequest request = new CreateTransactionRequest(
            journalId,
            LocalDate.of(2024, 1, 15),
            "CLEARED",
            "Test transaction",
            "PARTNER-001",
            List.of(new TagDTO("invoice", "INV-123")),
            List.of(
                new CreateEntryRequest(0, accountId1, "CHF", new BigDecimal("100.00"), "Debit entry"),
                new CreateEntryRequest(1, accountId2, "CHF", new BigDecimal("-100.00"), "Credit entry")
            )
        );

        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .post("/api/transaction")
        .then()
            .statusCode(200)
            .body("description", equalTo("Test transaction"))
            .body("status", equalTo("CLEARED"))
            .body("partnerId", equalTo("PARTNER-001"))
            .body("tags.size()", equalTo(1))
            .body("tags[0].key", equalTo("invoice"))
            .body("tags[0].value", equalTo("INV-123"))
            .body("entries.size()", equalTo(2));
    }

    @Test
    public void testCreateTransactionWithEmptyTagValue() {
        CreateTransactionRequest request = new CreateTransactionRequest(
            journalId,
            LocalDate.of(2024, 1, 15),
            "CLEARED",
            "Test transaction with tag without value",
            null,
            List.of(new TagDTO("OpeningBalances", "")),
            List.of(
                new CreateEntryRequest(0, accountId1, "CHF", new BigDecimal("100.00"), "Debit entry"),
                new CreateEntryRequest(1, accountId2, "CHF", new BigDecimal("-100.00"), "Credit entry")
            )
        );

        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .post("/api/transaction")
        .then()
            .statusCode(200)
            .body("description", equalTo("Test transaction with tag without value"))
            .body("tags.size()", equalTo(1))
            .body("tags[0].key", equalTo("OpeningBalances"))
            .body("tags[0].value", equalTo(""))
            .body("entries.size()", equalTo(2));
    }

    @Test
    public void testGetTransaction() {
        // Create a transaction first
        TransactionEntity transaction = createTestTransaction();

        given()
        .when()
            .get("/api/transaction/" + transaction.getId())
        .then()
            .statusCode(200)
            .body("description", equalTo("Get test transaction"))
            .body("entries.size()", equalTo(2));
    }

    @Test
    public void testUpdateTransaction() {
        // Create a transaction first
        TransactionEntity transaction = createTestTransaction();

        UpdateTransactionRequest request = new UpdateTransactionRequest(
            LocalDate.of(2024, 2, 20),
            "RECONCILED",
            "Updated description",
            "PARTNER-002",
            List.of(new TagDTO("updated", "yes")),
            List.of(
                new UpdateEntryRequest(null, 0, accountId1, "CHF", new BigDecimal("200.00"), "Updated debit"),
                new UpdateEntryRequest(null, 1, accountId2, "CHF", new BigDecimal("-200.00"), "Updated credit")
            )
        );

        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .put("/api/transaction/" + transaction.getId())
        .then()
            .statusCode(200)
            .body("description", equalTo("Updated description"))
            .body("status", equalTo("RECONCILED"))
            .body("partnerId", equalTo("PARTNER-002"))
            .body("tags.size()", equalTo(1))
            .body("tags[0].key", equalTo("updated"));
    }

    @Test
    public void testDeleteTransaction() {
        // Create a transaction first
        TransactionEntity transaction = createTestTransaction();

        given()
        .when()
            .delete("/api/transaction/" + transaction.getId())
        .then()
            .statusCode(200)
            .body("status", equalTo("success"))
            .body("transactionId", equalTo(transaction.getId()));

        // Verify it's deleted
        given()
        .when()
            .get("/api/transaction/" + transaction.getId())
        .then()
            .statusCode(404);
    }

    @Test
    public void testCreateTransactionWithoutJournal() {
        CreateTransactionRequest request = new CreateTransactionRequest(
            "non-existent-journal",
            LocalDate.of(2024, 1, 15),
            "CLEARED",
            "Test transaction",
            null,
            List.of(),
            List.of()
        );

        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .post("/api/transaction")
        .then()
            .statusCode(404);
    }

    @Test
    public void testCreateUnbalancedTransactionShouldFail() {
        // Create unbalanced transaction (entries don't sum to zero)
        CreateTransactionRequest request = new CreateTransactionRequest(
            journalId,
            LocalDate.of(2024, 1, 15),
            "CLEARED",
            "Unbalanced transaction",
            null,
            List.of(),
            List.of(
                new CreateEntryRequest(0, accountId1, "CHF", new BigDecimal("100.00"), "Debit"),
                new CreateEntryRequest(1, accountId2, "CHF", new BigDecimal("-50.00"), "Credit - unbalanced")
            )
        );

        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .post("/api/transaction")
        .then()
            .statusCode(400)
            .body("message", containsString("must sum to zero"));
    }

    @Test
    public void testUpdateUnbalancedTransactionShouldFail() {
        // Create a balanced transaction first
        TransactionEntity transaction = createTestTransaction();

        // Try to update it with unbalanced entries
        UpdateTransactionRequest request = new UpdateTransactionRequest(
            LocalDate.of(2024, 2, 20),
            "RECONCILED",
            "Updated description",
            null,
            List.of(),
            List.of(
                new UpdateEntryRequest(null, 0, accountId1, "CHF", new BigDecimal("150.00"), "Unbalanced debit"),
                new UpdateEntryRequest(null, 1, accountId2, "CHF", new BigDecimal("-50.00"), "Unbalanced credit")
            )
        );

        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .put("/api/transaction/" + transaction.getId())
        .then()
            .statusCode(400)
            .body("message", containsString("must sum to zero"));
    }

    @Transactional
    TransactionEntity createTestTransaction() {
        TransactionEntity transaction = new TransactionEntity();
        transaction.setJournalId(journalId);
        transaction.setTransactionDate(LocalDate.of(2024, 1, 15));
        transaction.setStatus(TransactionStatus.CLEARED);
        transaction.setDescription("Get test transaction");
        transaction.setPartnerId("PARTNER-001");

        dev.abstratium.abstraccount.entity.EntryEntity entry1 = new dev.abstratium.abstraccount.entity.EntryEntity();
        entry1.setEntryOrder(0);
        entry1.setAccountId(accountId1);
        entry1.setCommodity("CHF");
        entry1.setAmount(new BigDecimal("100.00"));
        entry1.setNote("Test debit");
        transaction.addEntry(entry1);

        dev.abstratium.abstraccount.entity.EntryEntity entry2 = new dev.abstratium.abstraccount.entity.EntryEntity();
        entry2.setEntryOrder(1);
        entry2.setAccountId(accountId2);
        entry2.setCommodity("CHF");
        entry2.setAmount(new BigDecimal("-100.00"));
        entry2.setNote("Test credit");
        transaction.addEntry(entry2);

        return persistenceService.saveTransaction(transaction);
    }
}
