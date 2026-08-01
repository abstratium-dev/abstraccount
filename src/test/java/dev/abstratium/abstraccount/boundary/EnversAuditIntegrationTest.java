package dev.abstratium.abstraccount.boundary;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.model.TransactionStatus;
import dev.abstratium.core.util.TestTransactionHelper;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

@QuarkusTest
public class EnversAuditIntegrationTest {

    @Inject
    TestTransactionHelper testTransactionHelper;

    @Inject
    EntityManager em;

    @BeforeEach
    @Transactional
    public void setup() {
        testTransactionHelper.deleteAllData();
    }

    @Test
    @TestSecurity(user = "test-auditor", roles = {Roles.USER})
    public void testJournalCreateAndDeleteAreAudited() {
        // Create a journal
        Response createResponse = given()
            .contentType(ContentType.JSON)
            .body(new CreateJournalRequest(
                null,
                "Audit Test Journal",
                "audit journal",
                "CHF",
                Map.of("CHF", "2")
            ))
        .when()
            .post("/api/journal/create")
        .then()
            .statusCode(200)
            .extract().response();

        String journalId = createResponse.jsonPath().getString("id");

        // Verify ADD revision is recorded
        given()
            .when()
                .get("/api/history/entity/journal/" + journalId)
            .then()
                .statusCode(200)
                .body("$", hasSize(1))
                .body("[0].revisionType", equalTo("ADD"))
                .body("[0].username", equalTo("test-auditor"));

        // Delete the journal
        given()
        .when()
            .delete("/api/journal/" + journalId)
        .then()
            .statusCode(200);

        // Verify both ADD and DEL revisions are present
        Response historyResponse = given()
            .when()
                .get("/api/history/entity/journal/" + journalId)
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(2)))
                .extract().response();

        long addCount = historyResponse.jsonPath().getList("revisionType").stream()
            .filter(t -> "ADD".equals(t))
            .count();
        long delCount = historyResponse.jsonPath().getList("revisionType").stream()
            .filter(t -> "DEL".equals(t))
            .count();

        assertEquals(1, addCount, "Expected exactly one ADD revision");
        assertEquals(1, delCount, "Expected exactly one DEL revision");
    }

    @Test
    @TestSecurity(user = "test-auditor", roles = {Roles.USER})
    public void testAccountHistoryIsAudited() {
        // Create a journal and an account directly via the entity manager so we
        // can verify that the account audit history is recorded by Envers.
        String accountId = persistAccountForAudit();

        given()
            .when()
                .get("/api/history/entity/account/" + accountId)
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].revisionType", equalTo("ADD"));
    }

    @Transactional
    String persistAccountForAudit() {
        JournalEntity journal = new JournalEntity();
        journal.setTitle("Audit Account Test Journal");
        journal.setCurrency("CHF");
        em.persist(journal);

        AccountEntity account = new AccountEntity();
        account.setJournalId(journal.getId());
        account.setName("1020 Cash");
        account.setType(AccountType.ASSET);
        account.setAccountOrder(1);
        em.persist(account);
        em.flush();
        return account.getId();
    }

    @Test
    @TestSecurity(user = "test-auditor", roles = {Roles.USER})
    public void testTransactionHistoryIsAudited() {
        String txId = persistTransactionForAudit();

        given()
            .when()
                .get("/api/history/entity/transaction/" + txId)
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].revisionType", equalTo("ADD"));
    }

    @Transactional
    String persistTransactionForAudit() {
        JournalEntity journal = new JournalEntity();
        journal.setTitle("Audit Tx Test Journal");
        journal.setCurrency("CHF");
        em.persist(journal);

        TransactionEntity tx = new TransactionEntity();
        tx.setJournalId(journal.getId());
        tx.setTransactionDate(java.time.LocalDate.of(2025, 1, 1));
        tx.setStatus(TransactionStatus.CLEARED);
        tx.setDescription("Audited transaction");
        em.persist(tx);
        em.flush();
        return tx.getId();
    }

    @Test
    @TestSecurity(user = "test-auditor", roles = {Roles.USER})
    public void testReportTemplateHistoryAcceptsAllAliasFormats() {
        // The HistoryService accepts "reporttemplate", "report_template", and
        // "report-template" as aliases for the report template entity type.
        // All three should resolve to the same entity class and return 200
        // (not 500) for a non-existent id - returning an empty list.
        for (String alias : new String[]{"reporttemplate", "report_template", "report-template"}) {
            given()
                .when()
                    .get("/api/history/entity/" + alias + "/nonexistent-id")
                .then()
                    .statusCode(200)
                    .body("$", hasSize(0));
        }
    }

    @Test
    @TestSecurity(user = "test-auditor", roles = {Roles.USER})
    public void testUnknownEntityTypeReturnsError() {
        given()
            .when()
                .get("/api/history/entity/unknown-type/some-id")
            .then()
            .statusCode(anyOf(equalTo(400), equalTo(500)));
    }

    @Test
    @TestSecurity(user = "test-auditor", roles = {Roles.USER})
    public void testHistoryForNonExistentEntityReturnsEmptyList() {
        given()
            .when()
                .get("/api/history/entity/journal/nonexistent-journal-id")
            .then()
                .statusCode(200)
                .body("$", hasSize(0));
    }
}
