package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import dev.abstratium.core.service.CurrentOrgContext;
import dev.abstratium.core.util.TestTransactionHelper;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration test for journal listing and metadata endpoints.
 */
@QuarkusTest
class JournalListIntegrationTest {

    @Inject
    JournalPersistenceService persistenceService;

    @Inject
    TestTransactionHelper testTransactionHelper;

    @Inject
    CurrentOrgContext currentOrgContext;

    @BeforeEach
    @Transactional
    void setUp() {
        currentOrgContext.setOrgId("00000000-0000-0000-0000-000000000000");
        testTransactionHelper.deleteAllData();
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testListJournals_empty() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/journal/list")
        .then()
            .statusCode(200)
            .body("$", hasSize(0));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testListJournals_single() {
        // Create a journal
        String journalId = createAndCommitJournal("Test Journal 2024", "CHF", null);
        
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/journal/list")
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].id", equalTo(journalId))
            .body("[0].title", equalTo("Test Journal 2024"))
            .body("[0].currency", equalTo("CHF"))
            .body("[0].commodities.CHF", equalTo("1000.00"));
    }

    @Test
    @TestSecurity(user = "second-org-user", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = "second-org"))
    void testSecondOrganizationCannotAccessDefaultOrganizationJournals() {
        JournalEntity defaultOrgJournal = new JournalEntity();
        defaultOrgJournal.setTitle("Default organization journal");
        defaultOrgJournal.setCurrency("CHF");
        JournalEntity secondOrgJournal = new JournalEntity();
        secondOrgJournal.setTitle("Second organization journal");
        secondOrgJournal.setCurrency("CHF");

        try {
            currentOrgContext.setOrgId("00000000-0000-0000-0000-000000000000");
            persistenceService.saveJournal(defaultOrgJournal);
            currentOrgContext.setOrgId("second-org");
            persistenceService.saveJournal(secondOrgJournal);

            given()
                .contentType(ContentType.JSON)
            .when()
                .get("/api/journal/list")
            .then()
                .statusCode(200)
                .body("$", hasSize(1))
                .body("[0].id", equalTo(secondOrgJournal.getId()));

            given()
                .contentType(ContentType.JSON)
            .when()
                .get("/api/journal/{journalId}/metadata", defaultOrgJournal.getId())
            .then()
                .statusCode(404);

            given()
                .contentType(ContentType.JSON)
            .when()
                .delete("/api/journal/{journalId}", defaultOrgJournal.getId())
            .then()
                .statusCode(404);

            given()
                .contentType(ContentType.JSON)
            .when()
                .get("/api/journal/{journalId}/metadata", defaultOrgJournal.getId())
            .then()
                .statusCode(404);

            currentOrgContext.setOrgId("00000000-0000-0000-0000-000000000000");
            assertTrue(persistenceService.findJournalById(defaultOrgJournal.getId()).isPresent());
        } finally {
            currentOrgContext.setOrgId("second-org");
            persistenceService.deleteJournal(secondOrgJournal.getId());
            currentOrgContext.setOrgId("00000000-0000-0000-0000-000000000000");
            persistenceService.deleteJournal(defaultOrgJournal.getId());
        }
    }

    @Test
    @TestSecurity(user = "second-org-user", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = "second-org"))
    void testCreateJournalIsScopedToAuthenticatedOrganization() {
        CreateJournalRequest request = new CreateJournalRequest(
                null, "Second organization journal", null, "CHF", Map.of("CHF", "1000.00"));
        String journalId = given()
                .contentType(ContentType.JSON)
                .body(request)
            .when()
                .post("/api/journal/create")
            .then()
                .statusCode(200)
                .extract()
                .path("id");

        try {
            currentOrgContext.setOrgId("00000000-0000-0000-0000-000000000000");
            assertTrue(persistenceService.findJournalById(journalId).isEmpty());
            currentOrgContext.setOrgId("second-org");
            assertTrue(persistenceService.findJournalById(journalId).isPresent());
        } finally {
            currentOrgContext.setOrgId("second-org");
            persistenceService.deleteJournal(journalId);
        }
    }

    @Test
    @TestSecurity(user = "second-org-user", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = "second-org"))
    void testImportedJournalIsScopedToAuthenticatedOrganization() {
        String journalContent = """
            ; title: Second organization imported journal
            ; currency: CHF

            account 1 Assets
              ; type:Asset
            account 2 Equity
              ; type:Equity

            2025-03-01 * Imported transaction
                1 Assets  CHF  100.00
                2 Equity  CHF  -100.00
            """;
        String journalId = given()
                .contentType(ContentType.TEXT)
                .body(journalContent)
            .when()
                .post("/api/journal/upload")
            .then()
                .statusCode(200)
                .extract()
                .path("journalId");

        try {
            currentOrgContext.setOrgId("00000000-0000-0000-0000-000000000000");
            assertTrue(persistenceService.findJournalById(journalId).isEmpty());
            currentOrgContext.setOrgId("second-org");
            assertTrue(persistenceService.findJournalById(journalId).isPresent());
        } finally {
            currentOrgContext.setOrgId("second-org");
            persistenceService.deleteJournal(journalId);
        }
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testListJournals_multiple() {
        // Create multiple journals
        createAndCommitJournal("Journal A", "CHF", null);
        createAndCommitJournal("Journal B", "USD", null);
        createAndCommitJournal("Journal C", "EUR", null);
        
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/journal/list")
        .then()
            .statusCode(200)
            .body("$", hasSize(3))
            // Journals should be ordered by title
            .body("[0].title", equalTo("Journal A"))
            .body("[1].title", equalTo("Journal B"))
            .body("[2].title", equalTo("Journal C"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetJournalMetadata_success() {
        // Create a journal with subtitle
        String journalId = createAndCommitJournal("Test Journal", "CHF", "Test Subtitle");
        
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/journal/{journalId}/metadata", journalId)
        .then()
            .statusCode(200)
            .body("id", equalTo(journalId))
            .body("title", equalTo("Test Journal"))
            .body("subtitle", equalTo("Test Subtitle"))
            .body("currency", equalTo("CHF"))
            .body("commodities.CHF", equalTo("1000.00"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetJournalMetadata_notFound() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/journal/{journalId}/metadata", "non-existent-id")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetJournalMetadata_withMultipleCommodities() {
        // Create a journal with multiple commodities
        String journalId = createMultiCurrencyJournal();
        
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/journal/{journalId}/metadata", journalId)
        .then()
            .statusCode(200)
            .body("commodities.CHF", equalTo("1000.00"))
            .body("commodities.USD", equalTo("100.00"))
            .body("commodities.EUR", equalTo("100.00"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testListJournals_withNullSubtitle() {
        // Create a journal without subtitle (null is the default)
        createAndCommitJournal("Test Journal", "CHF", null);
        
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/journal/list")
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].subtitle", nullValue());
    }

    /**
     * Helper method to create and commit a test journal.
     * This method commits the transaction immediately so the data is visible to REST calls.
     * 
     * @return the ID of the created journal
     */
    @Transactional
    String createAndCommitJournal(String title, String currency, String subtitle) {
        JournalEntity journal = new JournalEntity();
        journal.setTitle(title);
        journal.setCurrency(currency);
        journal.setSubtitle(subtitle);
        
        Map<String, String> commodities = new HashMap<>();
        commodities.put(currency, "1000.00");
        journal.setCommodities(commodities);
        
        JournalEntity saved = persistenceService.saveJournal(journal);
        return saved.getId();
    }
    
    /**
     * Helper method to create a journal with multiple commodities.
     * 
     * @return the ID of the created journal
     */
    @Transactional
    String createMultiCurrencyJournal() {
        JournalEntity journal = new JournalEntity();
        journal.setTitle("Multi-Currency Journal");
        journal.setCurrency("CHF");
        
        Map<String, String> commodities = new HashMap<>();
        commodities.put("CHF", "1000.00");
        commodities.put("USD", "100.00");
        commodities.put("EUR", "100.00");
        journal.setCommodities(commodities);
        
        JournalEntity saved = persistenceService.saveJournal(journal);
        return saved.getId();
    }
}
