package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Integration test for journal listing and metadata endpoints.
 */
@QuarkusTest
class JournalListIntegrationTest {

    @Inject
    JournalPersistenceService persistenceService;

    @BeforeEach
    @Transactional
    void setUp() {
        persistenceService.deleteAll();
    }

    @Test
    @TestSecurity(user = "testuser", roles = {"abstratium-abstraccount_user"})
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
    @TestSecurity(user = "testuser", roles = {"abstratium-abstraccount_user"})
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
    @TestSecurity(user = "testuser", roles = {"abstratium-abstraccount_user"})
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
    @TestSecurity(user = "testuser", roles = {"abstratium-abstraccount_user"})
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
    @TestSecurity(user = "testuser", roles = {"abstratium-abstraccount_user"})
    void testGetJournalMetadata_notFound() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/journal/{journalId}/metadata", "non-existent-id")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {"abstratium-abstraccount_user"})
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
    @TestSecurity(user = "testuser", roles = {"abstratium-abstraccount_user"})
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
