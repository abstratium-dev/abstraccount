package dev.abstratium.abstraccount.boundary;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

import java.nio.file.Files;
import java.nio.file.Paths;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;

@QuarkusTest
class EntrySearchResourceTest {
    
    private String journalId;
    
    @BeforeEach
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void uploadTestJournal() throws Exception {
        String journalContent = Files.readString(Paths.get("src/test/resources/test-journal.txt"));
        
        journalId = given()
            .contentType(ContentType.TEXT)
            .body(journalContent)
            .when().post("/api/journal/upload")
            .then()
            .statusCode(200)
            .extract().jsonPath().getString("journalId");
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testGetAllEntrySearchResults() {
        given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .body("size()", greaterThan(0));
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByAccountId() {
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert allEntries.length > 0 : "Need at least one entry";
        String accountId = allEntries[0].accountId();

        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("accountId", accountId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected at least one entry for account " + accountId;
        for (EntrySearchDTO entry : filteredEntries) {
            assert entry.accountId().equals(accountId) :
                "Expected account ID " + accountId + " but got " + entry.accountId();
        }
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByTag() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "tag:category:shopping")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected entries with tag category:shopping";
        for (EntrySearchDTO entry : filteredEntries) {
            boolean hasTag = entry.transactionTags().stream()
                .anyMatch(tag -> tag.key().equals("category") && "shopping".equals(tag.value()));
            assert hasTag : "Expected entry to have tag category:shopping";
        }
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByTagKeyOnly() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "tag:category")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected entries with tag key 'category'";
        for (EntrySearchDTO entry : filteredEntries) {
            boolean hasCategoryTag = entry.transactionTags().stream()
                .anyMatch(tag -> tag.key().equals("category"));
            assert hasCategoryTag : "Expected entry to have a category tag";
        }
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterNegateTag() {
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "NOT tag:category:shopping")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length < allEntries.length :
            "Expected fewer entries when excluding category:shopping transactions";
        for (EntrySearchDTO entry : filteredEntries) {
            boolean hasExcludedTag = entry.transactionTags().stream()
                .anyMatch(tag -> tag.key().equals("category") && "shopping".equals(tag.value()));
            assert !hasExcludedTag : "Expected entry to NOT have tag category:shopping";
        }
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByAccountType() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "accounttype:EXPENSE")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected at least one entry when filtering by accounttype:EXPENSE";
        boolean hasExpenseEntry = java.util.Arrays.stream(filteredEntries)
            .anyMatch(entry -> entry.accountType().equalsIgnoreCase("EXPENSE"));
        assert hasExpenseEntry : "Expected at least one EXPENSE entry in results (transactions with an EXPENSE entry are included)";
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByCommodity() {
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert allEntries.length > 0 : "Need at least one entry";
        String commodity = allEntries[0].entryCommodity();

        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "commodity:" + commodity)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected entries with commodity " + commodity;
        for (EntrySearchDTO entry : filteredEntries) {
            assert entry.entryCommodity().equals(commodity) :
                "Expected commodity " + commodity + " but got " + entry.entryCommodity();
        }
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByDateRange() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "date:gte:2020-01-01 AND date:lte:2030-12-31")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected entries within wide date range";
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByDescription() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "description:*")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected entries when matching all descriptions";
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterNonExistentTagReturnsEmpty() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "tag:nonexistent:value99")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length == 0 : "Expected no entries for non-existent tag";
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterCombinedAndOr() {
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "tag:category:shopping OR accounttype:ASSET")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected entries matching tag OR accounttype";
        assert filteredEntries.length <= allEntries.length : "Should not exceed total entries";
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterInvalidSyntaxReturns400() {
        given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "date:gte:2025-01-01d")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(400)
            .body("error", equalTo("query_parse_error"))
            .body("message", notNullValue());
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testMissingJournalIdReturns400() {
        given()
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(400)
            .body("error", equalTo("missing_parameter"));
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testNoFilterReturnsSameAsEmptyFilter() {
        EntrySearchDTO[] withoutFilter = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        EntrySearchDTO[] withEmptyFilter = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert withoutFilter.length == withEmptyFilter.length :
            "Empty filter should return same count as no filter";
    }
}
