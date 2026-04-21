package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
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
import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class CloseBooksResourceTest {

    @Inject
    EntityManager em;

    private String journalId;
    private String revenueAccountId;
    private String expenseAccountId;
    private String equityAccountId;
    private String equityParentAccountId;

    @BeforeEach
    @Transactional
    public void setup() {
        em.createQuery("DELETE FROM EntryEntity").executeUpdate();
        em.createQuery("DELETE FROM TagEntity").executeUpdate();
        em.createQuery("DELETE FROM TransactionEntity").executeUpdate();
        em.createQuery("DELETE FROM AccountEntity").executeUpdate();
        em.createQuery("DELETE FROM JournalEntity").executeUpdate();

        JournalEntity journal = new JournalEntity();
        journal.setTitle("Test Journal for CloseBooks");
        journal.setCurrency("CHF");
        em.persist(journal);
        journalId = journal.getId();

        // Equity parent: "2 Passif"
        AccountEntity equityParent = new AccountEntity();
        equityParent.setJournalId(journalId);
        equityParent.setName("2 Passif");
        equityParent.setType(AccountType.EQUITY);
        equityParent.setAccountOrder(1);
        em.persist(equityParent);
        equityParentAccountId = equityParent.getId();

        // Equity leaf: "2979 Annual profit/loss" — child of equityParent
        AccountEntity equity = new AccountEntity();
        equity.setJournalId(journalId);
        equity.setName("2979 Annual profit");
        equity.setType(AccountType.EQUITY);
        equity.setParentAccountId(equityParentAccountId);
        equity.setAccountOrder(2);
        em.persist(equity);
        equityAccountId = equity.getId();

        // Revenue parent: "3 Revenue"
        AccountEntity revenueParent = new AccountEntity();
        revenueParent.setJournalId(journalId);
        revenueParent.setName("3 Revenue");
        revenueParent.setType(AccountType.REVENUE);
        revenueParent.setAccountOrder(3);
        em.persist(revenueParent);

        // Revenue leaf: "3400 Services" — child of revenueParent
        AccountEntity revenue = new AccountEntity();
        revenue.setJournalId(journalId);
        revenue.setName("3400 Services");
        revenue.setType(AccountType.REVENUE);
        revenue.setParentAccountId(revenueParent.getId());
        revenue.setAccountOrder(4);
        em.persist(revenue);
        revenueAccountId = revenue.getId();

        // Expense parent: "6 Expenses"
        AccountEntity expenseParent = new AccountEntity();
        expenseParent.setJournalId(journalId);
        expenseParent.setName("6 Expenses");
        expenseParent.setType(AccountType.EXPENSE);
        expenseParent.setAccountOrder(5);
        em.persist(expenseParent);

        // Expense leaf: "6570 IT" — child of expenseParent
        AccountEntity expense = new AccountEntity();
        expense.setJournalId(journalId);
        expense.setName("6570 IT");
        expense.setType(AccountType.EXPENSE);
        expense.setParentAccountId(expenseParent.getId());
        expense.setAccountOrder(6);
        em.persist(expense);
        expenseAccountId = expense.getId();

        // Transaction: revenue = -2000 (credit), expense = +500 (debit)
        TransactionEntity tx = new TransactionEntity();
        tx.setJournalId(journalId);
        tx.setTransactionDate(LocalDate.of(2025, 6, 1));
        tx.setStatus(TransactionStatus.CLEARED);
        tx.setDescription("Sample transaction");
        em.persist(tx);

        EntryEntity revenueEntry = new EntryEntity();
        revenueEntry.setTransaction(tx);
        revenueEntry.setAccountId(revenueAccountId);
        revenueEntry.setCommodity("CHF");
        revenueEntry.setAmount(new BigDecimal("-2000.00"));
        revenueEntry.setEntryOrder(0);
        em.persist(revenueEntry);

        EntryEntity expenseEntry = new EntryEntity();
        expenseEntry.setTransaction(tx);
        expenseEntry.setAccountId(expenseAccountId);
        expenseEntry.setCommodity("CHF");
        expenseEntry.setAmount(new BigDecimal("500.00"));
        expenseEntry.setEntryOrder(1);
        em.persist(expenseEntry);

        // Equity entry to balance the transaction
        EntryEntity equityEntry = new EntryEntity();
        equityEntry.setTransaction(tx);
        equityEntry.setAccountId(equityAccountId);
        equityEntry.setCommodity("CHF");
        equityEntry.setAmount(new BigDecimal("1500.00"));
        equityEntry.setEntryOrder(2);
        em.persist(equityEntry);

        em.flush();
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_returnsAffectedAccounts() {
        String requestBody = String.format("""
            {
                "journalId": "%s",
                "closingDate": "2025-12-31",
                "equityAccountCodePath": "2:2979"
            }
            """, journalId);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/close-books/preview")
        .then()
            .statusCode(200)
            .body("closingDate", equalTo("2025-12-31"))
            .body("equityAccountCodePath", equalTo("2:2979"))
            .body("accounts", hasSize(2))
            .body("accounts.balance", hasItems(-2000.0f, 500.0f));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_excludesZeroBalanceAccounts() {
        // Create an additional expense account with no entries (zero balance)
        createAccountWithNoEntries();

        String requestBody = String.format("""
            {
                "journalId": "%s",
                "closingDate": "2025-12-31",
                "equityAccountCodePath": "2:2979"
            }
            """, journalId);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/close-books/preview")
        .then()
            .statusCode(200)
            .body("accounts", hasSize(2));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_excludesEntriesAfterClosingDate() {
        // Only entries from 2025-06-01 exist; querying before that date should show nothing
        String requestBody = String.format("""
            {
                "journalId": "%s",
                "closingDate": "2025-01-01",
                "equityAccountCodePath": "2:2979"
            }
            """, journalId);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/close-books/preview")
        .then()
            .statusCode(200)
            .body("accounts", hasSize(0));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecute_createsTransactions() {
        String requestBody = String.format("""
            {
                "journalId": "%s",
                "closingDate": "2025-12-31",
                "equityAccountCodePath": "2:2979"
            }
            """, journalId);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/close-books/execute")
        .then()
            .statusCode(200)
            .body("transactionCount", equalTo(2))
            .body("transactionIds", hasSize(2));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecute_transactionsHaveClosingTag() {
        String requestBody = String.format("""
            {
                "journalId": "%s",
                "closingDate": "2025-12-31",
                "equityAccountCodePath": "2:2979"
            }
            """, journalId);

        List<String> ids = given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/close-books/execute")
        .then()
            .statusCode(200)
            .extract()
            .jsonPath()
            .getList("transactionIds", String.class);

        // Verify in DB that all created transactions have the Closing: tag
        verifyClosingTags(ids);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecute_transactionsAreBalanced() {
        String requestBody = String.format("""
            {
                "journalId": "%s",
                "closingDate": "2025-12-31",
                "equityAccountCodePath": "2:2979"
            }
            """, journalId);

        List<String> ids = given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/close-books/execute")
        .then()
            .statusCode(200)
            .extract()
            .jsonPath()
            .getList("transactionIds", String.class);

        verifyTransactionsAreBalanced(ids);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExecute_transactionsHaveCorrectDate() {
        String requestBody = String.format("""
            {
                "journalId": "%s",
                "closingDate": "2025-12-31",
                "equityAccountCodePath": "2:2979"
            }
            """, journalId);

        List<String> ids = given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/close-books/execute")
        .then()
            .statusCode(200)
            .extract()
            .jsonPath()
            .getList("transactionIds", String.class);

        verifyTransactionDates(ids, LocalDate.of(2025, 12, 31));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_missingJournalId_returnsBadRequest() {
        String requestBody = """
            {
                "journalId": "",
                "closingDate": "2025-12-31",
                "equityAccountCodePath": "2:2979"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/close-books/preview")
        .then()
            .statusCode(400);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_missingClosingDate_returnsBadRequest() {
        String requestBody = String.format("""
            {
                "journalId": "%s",
                "closingDate": "",
                "equityAccountCodePath": "2:2979"
            }
            """, journalId);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/close-books/preview")
        .then()
            .statusCode(400);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_invalidDateFormat_returnsBadRequest() {
        String requestBody = String.format("""
            {
                "journalId": "%s",
                "closingDate": "31-12-2025",
                "equityAccountCodePath": "2:2979"
            }
            """, journalId);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/close-books/preview")
        .then()
            .statusCode(400);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_unknownEquityAccount_returnsError() {
        String requestBody = String.format("""
            {
                "journalId": "%s",
                "closingDate": "2025-12-31",
                "equityAccountCodePath": "9:9999"
            }
            """, journalId);

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/close-books/preview")
        .then()
            .statusCode(anyOf(equalTo(400), equalTo(404), equalTo(500)));
    }

    @Test
    void testUnauthenticated_returnsForbidden() {
        String requestBody = """
            {
                "journalId": "any",
                "closingDate": "2025-12-31",
                "equityAccountCodePath": "2:2979"
            }
            """;

        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/close-books/preview")
        .then()
            .statusCode(anyOf(equalTo(400), equalTo(401)));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testPreview_includesParentAccountsWithDirectBalance() {
        // Post a transaction directly to the "3 Revenue" PARENT account (not the leaf "3400 Services")
        addDirectEntryToRevenueParent();

        String requestBody = String.format("""
            {
                "journalId": "%s",
                "closingDate": "2025-12-31",
                "equityAccountCodePath": "2:2979"
            }
            """, journalId);

        // Should now have 3 accounts: the leaf revenue (3400), the leaf expense (6570),
        // AND the parent revenue account (3 Revenue) which has its own direct balance
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/close-books/preview")
        .then()
            .statusCode(200)
            .body("accounts", hasSize(3));
    }

    @Transactional
    void addDirectEntryToRevenueParent() {
        // Find the "3 Revenue" parent account (no parent account id = root level revenue)
        AccountEntity revenueParent = em.createQuery(
                "SELECT a FROM AccountEntity a WHERE a.journalId = :jid AND a.name = '3 Revenue'",
                AccountEntity.class)
            .setParameter("jid", journalId)
            .getSingleResult();

        TransactionEntity tx = new TransactionEntity();
        tx.setJournalId(journalId);
        tx.setTransactionDate(LocalDate.of(2025, 3, 15));
        tx.setStatus(TransactionStatus.CLEARED);
        tx.setDescription("Direct posting to revenue parent");
        em.persist(tx);

        // Direct entry to parent revenue account
        EntryEntity directRevEntry = new EntryEntity();
        directRevEntry.setTransaction(tx);
        directRevEntry.setAccountId(revenueParent.getId());
        directRevEntry.setCommodity("CHF");
        directRevEntry.setAmount(new BigDecimal("-750.00"));
        directRevEntry.setEntryOrder(0);
        em.persist(directRevEntry);

        // Balancing entry to equity
        AccountEntity equityAcct = em.find(AccountEntity.class, equityAccountId);
        EntryEntity equityEntry = new EntryEntity();
        equityEntry.setTransaction(tx);
        equityEntry.setAccountId(equityAcct.getId());
        equityEntry.setCommodity("CHF");
        equityEntry.setAmount(new BigDecimal("750.00"));
        equityEntry.setEntryOrder(1);
        em.persist(equityEntry);

        em.flush();
    }

    @Transactional
    void createAccountWithNoEntries() {
        AccountEntity emptyExpense = new AccountEntity();
        emptyExpense.setJournalId(journalId);
        emptyExpense.setName("6999 Empty");
        emptyExpense.setType(AccountType.EXPENSE);
        emptyExpense.setAccountOrder(99);
        em.persist(emptyExpense);
        em.flush();
    }

    @Transactional
    void verifyClosingTags(List<String> transactionIds) {
        for (String txId : transactionIds) {
            TransactionEntity tx = em.find(TransactionEntity.class, txId);
            assertNotNull(tx, "Transaction should exist: " + txId);
            boolean hasClosingTag = tx.getTags().stream()
                .anyMatch(tag -> "Closing".equals(tag.getTagKey()));
            assertTrue(hasClosingTag, "Transaction " + txId + " should have a Closing tag");
        }
    }

    @Transactional
    void verifyTransactionsAreBalanced(List<String> transactionIds) {
        for (String txId : transactionIds) {
            TransactionEntity tx = em.find(TransactionEntity.class, txId);
            assertNotNull(tx);
            BigDecimal sum = tx.getEntries().stream()
                .map(EntryEntity::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            assertEquals(0, sum.compareTo(BigDecimal.ZERO),
                "Transaction " + txId + " should be balanced but sum is " + sum);
        }
    }

    @Transactional
    void verifyTransactionDates(List<String> transactionIds, LocalDate expectedDate) {
        for (String txId : transactionIds) {
            TransactionEntity tx = em.find(TransactionEntity.class, txId);
            assertNotNull(tx);
            assertEquals(expectedDate, tx.getTransactionDate(),
                "Transaction " + txId + " should have date " + expectedDate);
        }
    }
}
