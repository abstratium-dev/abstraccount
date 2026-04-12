package dev.abstratium.core.boundary;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TagEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.model.TransactionStatus;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

@QuarkusTest
public class TagsResourceTest {

    @Inject
    JournalPersistenceService persistenceService;

    private String journalId1;
    private String journalId2;

    @BeforeEach
    @Transactional
    public void setup() {
        // Clean up
        persistenceService.deleteAll();

        // Create two test journals
        JournalEntity journal1 = new JournalEntity();
        journal1.setTitle("Journal 1");
        journal1.setCurrency("CHF");
        journal1 = persistenceService.saveJournal(journal1);
        journalId1 = journal1.getId();

        JournalEntity journal2 = new JournalEntity();
        journal2.setTitle("Journal 2");
        journal2.setCurrency("EUR");
        journal2 = persistenceService.saveJournal(journal2);
        journalId2 = journal2.getId();

        // Create accounts for each journal
        AccountEntity account1 = new AccountEntity();
        account1.setJournalId(journalId1);
        account1.setName("Cash");
        account1.setType(AccountType.ASSET);
        account1 = persistenceService.saveAccount(account1);

        AccountEntity account2 = new AccountEntity();
        account2.setJournalId(journalId2);
        account2.setName("Cash");
        account2.setType(AccountType.ASSET);
        account2 = persistenceService.saveAccount(account2);

        // Create transactions with different tags in each journal
        createTransactionWithTags(journalId1, account1.getId(), "invoice", "INV-001");
        createTransactionWithTags(journalId1, account1.getId(), "project", "PROJ-A");
        createTransactionWithTags(journalId2, account2.getId(), "invoice", "INV-002");
        createTransactionWithTags(journalId2, account2.getId(), "category", "office");
        createTransactionWithTags(journalId2, account2.getId(), "department", "sales");
    }

    @Test
    @TestSecurity(user = "testUser", roles = {Roles.USER})
    public void testGetAllTagKeys() {
        given()
        .when()
            .get("/api/core/tags/keys")
        .then()
            .statusCode(200)
            .body("size()", equalTo(4))
            .body("", hasItems("invoice", "project", "category", "department"));
    }

    @Test
    @TestSecurity(user = "testUser", roles = {Roles.USER})
    public void testGetAllTagKeysReturnsDistinct() {
        // Even though 'invoice' appears in both journals, it should only appear once
        given()
        .when()
            .get("/api/core/tags/keys")
        .then()
            .statusCode(200)
            .body("size()", equalTo(4))
            .body("findAll { it == 'invoice' }.size()", equalTo(1));
    }

    @Transactional
    void createTransactionWithTags(String journalId, String accountId, String tagKey, String tagValue) {
        TransactionEntity transaction = new TransactionEntity();
        transaction.setJournalId(journalId);
        transaction.setTransactionDate(LocalDate.now());
        transaction.setStatus(TransactionStatus.CLEARED);
        transaction.setDescription("Test transaction");

        EntryEntity entry = new EntryEntity();
        entry.setEntryOrder(0);
        entry.setAccountId(accountId);
        entry.setCommodity("CHF");
        entry.setAmount(BigDecimal.ZERO);
        transaction.addEntry(entry);

        TagEntity tag = new TagEntity();
        tag.setTagKey(tagKey);
        tag.setTagValue(tagValue);
        transaction.addTag(tag);

        persistenceService.saveTransaction(transaction);
    }
}
