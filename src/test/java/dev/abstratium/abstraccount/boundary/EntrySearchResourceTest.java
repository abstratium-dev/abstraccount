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
    void testEqlFilterByAmountGte() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "amount:gte:50")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected entries with amount >= 50";
        for (EntrySearchDTO e : filteredEntries) {
            assert e.entryAmount().compareTo(new java.math.BigDecimal("50")) >= 0
                : "Entry amount " + e.entryAmount() + " should be >= 50";
        }
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByAmountLte() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "amount:lte:100")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected entries with amount <= 100";
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByAmountEq() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "amount:eq:1000")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected at least one entry with amount = 1000";
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByAmountGt() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "amount:gt:100")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected entries with amount > 100";
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByAmountLt() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "amount:lt:100")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected entries with amount < 100";
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByAmountNeg() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "amount:lt:0")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected negative entries";
        for (EntrySearchDTO e : filteredEntries) {
            assert e.entryAmount().compareTo(java.math.BigDecimal.ZERO) < 0
                : "Entry amount " + e.entryAmount() + " should be negative";
        }
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByAmountPos() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "amount:gt:0")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected positive entries";
        for (EntrySearchDTO e : filteredEntries) {
            assert e.entryAmount().compareTo(java.math.BigDecimal.ZERO) > 0
                : "Entry amount " + e.entryAmount() + " should be positive";
        }
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByNote_noMatch() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "note:nonexistentnote")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length == 0 : "Expected no entries for non-existent note";
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByNote_wildcard() {
        given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "note:*")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200);
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByAccountName() {
        given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "accountname:*Cash*")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .body("size()", greaterThan(0));
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByAccountName_noMatch() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "accountname:NonExistentAccountXYZ")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length == 0 : "Expected no entries for non-existent account name";
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByDescription_specific() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "description:Opening*")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length > 0 : "Expected entries matching 'Opening*'";
        for (EntrySearchDTO e : filteredEntries) {
            assert e.transactionDescription().startsWith("Opening")
                : "Description should start with 'Opening': " + e.transactionDescription();
        }
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByPartner_noMatch() {
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("filter", "partner:NONEXISTENTPARTNER")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filteredEntries.length == 0 : "Expected no entries for non-existent partner";
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByAccountIdQueryParam_returnsOnlyThatAccount() {
        EntrySearchDTO[] allAccounts = given()
            .queryParam("journalId", journalId)
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert allAccounts.length > 0 : "Expected some entries";
        String firstAccountId = allAccounts[0].accountId();

        EntrySearchDTO[] filtered = given()
            .queryParam("journalId", journalId)
            .queryParam("accountId", firstAccountId)
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);

        assert filtered.length > 0 : "Expected entries for the account";
        for (EntrySearchDTO e : filtered) {
            assert e.accountId().equals(firstAccountId)
                : "Expected accountId=" + firstAccountId + " but got " + e.accountId();
        }
    }

    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testEqlFilterByAccountId_emptyAccountId() {
        given()
            .queryParam("journalId", journalId)
            .queryParam("accountId", "")
        .when().get("/api/entry-search/entries")
        .then()
            .statusCode(200);
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
