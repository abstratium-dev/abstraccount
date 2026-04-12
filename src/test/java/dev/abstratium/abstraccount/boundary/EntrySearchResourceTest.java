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
    void testFilterByAccountType() {
        // First, get all entries to see what we have
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Find a unique account type from the results
        String accountType = null;
        if (allEntries.length > 0) {
            accountType = allEntries[0].accountType();
        }
        
        // If we found an account type, test filtering by it
        if (accountType != null && !accountType.isEmpty()) {
            EntrySearchDTO[] filteredEntries = given()
                .queryParam("journalId", journalId)
                .queryParam("accountType", accountType)
                .when().get("/api/entry-search/entries")
                .then()
                .statusCode(200)
                .extract().as(EntrySearchDTO[].class);
            
            // Verify all returned entries have the correct account type
            for (EntrySearchDTO entry : filteredEntries) {
                assert entry.accountType().equals(accountType) : 
                    "Expected account type " + accountType + " but got " + entry.accountType();
            }
            
            // Should have at least one entry
            assert filteredEntries.length > 0 : 
                "Expected at least one entry with account type " + accountType;
        }
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByAccountId() {
        // Get all entries
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        if (allEntries.length > 0) {
            String accountId = allEntries[0].accountId();
            
            EntrySearchDTO[] filteredEntries = given()
                .queryParam("journalId", journalId)
                .queryParam("accountId", accountId)
                .when().get("/api/entry-search/entries")
                .then()
                .statusCode(200)
                .extract().as(EntrySearchDTO[].class);
            
            // Verify all returned entries have the correct account ID
            for (EntrySearchDTO entry : filteredEntries) {
                assert entry.accountId().equals(accountId) : 
                    "Expected account ID " + accountId + " but got " + entry.accountId();
            }
            
            assert filteredEntries.length > 0 : 
                "Expected at least one entry with account ID " + accountId;
        }
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByCommodity() {
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        if (allEntries.length > 0) {
            String commodity = allEntries[0].entryCommodity();
            
            if (commodity != null && !commodity.isEmpty()) {
                EntrySearchDTO[] filteredEntries = given()
                    .queryParam("journalId", journalId)
                    .queryParam("commodity", commodity)
                    .when().get("/api/entry-search/entries")
                    .then()
                    .statusCode(200)
                    .extract().as(EntrySearchDTO[].class);
                
                // Verify all returned entries have the correct commodity
                for (EntrySearchDTO entry : filteredEntries) {
                    assert entry.entryCommodity().equals(commodity) : 
                        "Expected commodity " + commodity + " but got " + entry.entryCommodity();
                }
                
                assert filteredEntries.length > 0 : 
                    "Expected at least one entry with commodity " + commodity;
            }
        }
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByTransactionStatus() {
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        if (allEntries.length > 0) {
            String status = allEntries[0].transactionStatus();
            
            EntrySearchDTO[] filteredEntries = given()
                .queryParam("journalId", journalId)
                .queryParam("status", status)
                .when().get("/api/entry-search/entries")
                .then()
                .statusCode(200)
                .extract().as(EntrySearchDTO[].class);
            
            // Verify all returned entries have the correct status
            for (EntrySearchDTO entry : filteredEntries) {
                assert entry.transactionStatus().equals(status) : 
                    "Expected status " + status + " but got " + entry.transactionStatus();
            }
            
            assert filteredEntries.length > 0 : 
                "Expected at least one entry with status " + status;
        }
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByExactTag() {
        // Filter by exact tag category:shopping
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "category:shopping")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Should find entries with the Purchase transaction
        assert filteredEntries.length > 0 : 
            "Expected at least one entry with tag category:shopping";
        
        // Verify all returned entries have the correct tag
        for (EntrySearchDTO entry : filteredEntries) {
            boolean hasTag = entry.transactionTags().stream()
                .anyMatch(tag -> tag.key().equals("category") && tag.value().equals("shopping"));
            assert hasTag : "Expected entry to have tag category:shopping";
        }
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByTagKeyOnly() {
        // Filter by key only - should match any value for that key
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "category")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Should find entries with any category tag
        assert filteredEntries.length > 0 : 
            "Expected at least one entry with category key";
        
        // Verify all returned entries have a category tag
        for (EntrySearchDTO entry : filteredEntries) {
            boolean hasCategoryTag = entry.transactionTags().stream()
                .anyMatch(tag -> tag.key().equals("category"));
            assert hasCategoryTag : "Expected entry to have a category tag";
        }
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByTagNegation() {
        // First get all entries
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Filter by negation - exclude entries with category:shopping
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "not:category:shopping")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Should find fewer entries than all entries
        assert filteredEntries.length < allEntries.length : 
            "Expected fewer entries when excluding category:shopping";
        
        // Verify no returned entries have the excluded tag
        for (EntrySearchDTO entry : filteredEntries) {
            boolean hasExcludedTag = entry.transactionTags().stream()
                .anyMatch(tag -> tag.key().equals("category") && tag.value().equals("shopping"));
            assert !hasExcludedTag : "Expected entry to NOT have tag category:shopping";
        }
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByTagKeyNegation() {
        // Filter by key negation - exclude entries with any category tag
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "not:category")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Verify no returned entries have a category tag
        for (EntrySearchDTO entry : filteredEntries) {
            boolean hasCategoryTag = entry.transactionTags().stream()
                .anyMatch(tag -> tag.key().equals("category"));
            assert !hasCategoryTag : "Expected entry to NOT have any category tag";
        }
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByMultipleTags() {
        // Filter with multiple tags (AND logic - all must match)
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "category:shopping")
            .queryParam("tagList", "category")  // Same key, but tests multiple param handling
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Should still find entries with category:shopping
        assert filteredEntries.length > 0 : 
            "Expected at least one entry with category:shopping tag";
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByRegexTagPattern() {
        // Filter by regex pattern for key
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "categ.*:shop.*")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Should find entries matching the regex pattern
        assert filteredEntries.length > 0 : 
            "Expected at least one entry matching regex pattern categ.*:shop.*";
        
        // Verify all returned entries have tags matching the pattern
        for (EntrySearchDTO entry : filteredEntries) {
            boolean matchesPattern = entry.transactionTags().stream()
                .anyMatch(tag -> tag.key().matches("categ.*") && tag.value().matches("shop.*"));
            assert matchesPattern : "Expected entry to have tag matching regex pattern";
        }
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByNegatedRegexTagPattern() {
        // Get all entries first
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Filter by negated regex pattern
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "not:cat.*:.*")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Should have fewer entries when excluding by regex
        assert filteredEntries.length < allEntries.length : 
            "Expected fewer entries when excluding by regex pattern";
        
        // Verify no returned entries have tags starting with "cat"
        for (EntrySearchDTO entry : filteredEntries) {
            boolean hasMatchingTag = entry.transactionTags().stream()
                .anyMatch(tag -> tag.key().matches("cat.*"));
            assert !hasMatchingTag : "Expected entry to NOT have tag key matching cat.*";
        }
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByNonExistentTag() {
        // Filter by a tag that doesn't exist
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "nonexistent:value")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Should return empty result
        assert filteredEntries.length == 0 : 
            "Expected no entries for non-existent tag";
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByRegexWildcardValue() {
        // Filter by regex pattern matching any value for a key
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "category:.*")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Should find all entries with category tag (any value)
        assert filteredEntries.length > 0 : 
            "Expected entries with any category tag value";
        
        for (EntrySearchDTO entry : filteredEntries) {
            boolean hasCategoryTag = entry.transactionTags().stream()
                .anyMatch(tag -> tag.key().equals("category"));
            assert hasCategoryTag : "Expected entry to have category tag";
        }
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testGetAllTagsEndpoint() {
        // Test the tags endpoint
        String[] tags = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/tags")
            .then()
            .statusCode(200)
            .extract().as(String[].class);
        
        // Should return at least one tag
        assert tags.length > 0 : "Expected at least one tag";
        
        // Verify the known tag exists
        boolean hasCategoryTag = java.util.Arrays.stream(tags)
            .anyMatch(tag -> tag.equals("category:shopping"));
        assert hasCategoryTag : "Expected category:shopping tag to exist";
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByEmptyTagList() {
        // Empty tag list should not filter anything
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        EntrySearchDTO[] withEmptyTagList = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "")  // Empty string
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Should return same results as no tag filter
        assert withEmptyTagList.length == allEntries.length : 
            "Empty tag list should not filter any entries";
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByMultipleTagsAndCombination() {
        // Test combining include and exclude filters
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Include category:shopping but exclude non-existent tag
        EntrySearchDTO[] entries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "category:shopping")
            .queryParam("tagList", "not:nonexistent:tag")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Should find entries with category:shopping since nonexistent exclusion doesn't filter anything
        assert entries.length > 0 : "Should find entries when excluding non-existent tag";
        
        // Now exclude the actual category tag - should find fewer
        EntrySearchDTO[] excludedEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "not:category:shopping")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        assert excludedEntries.length < allEntries.length : 
            "Should find fewer entries when excluding category:shopping";
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByRegexWithKeyOnly() {
        // Regex pattern matching key only (any value)
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "categ.*")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Should find entries with category tag
        assert filteredEntries.length > 0 : 
            "Expected at least one entry with category key regex";
        
        // Verify all entries have a tag with key matching the pattern
        for (EntrySearchDTO entry : filteredEntries) {
            boolean matches = entry.transactionTags().stream()
                .anyMatch(tag -> tag.key().matches("categ.*"));
            assert matches : "Expected entry to have tag key matching categ.*";
        }
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByNotPrefixOnly() {
        // Test negation with just "not:" prefix and nothing else (edge case)
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // "not:" with nothing after should be treated as empty and not filter
        EntrySearchDTO[] entries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "not:")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Should return all entries (empty not: doesn't filter)
        assert entries.length == allEntries.length : 
            "Empty 'not:' should not filter any entries";
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testFilterByNegatedKeyOnlyRegex() {
        // Get all entries first
        EntrySearchDTO[] allEntries = given()
            .queryParam("journalId", journalId)
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Exclude by key-only regex
        EntrySearchDTO[] filteredEntries = given()
            .queryParam("journalId", journalId)
            .queryParam("tagList", "not:categ.*")
            .when().get("/api/entry-search/entries")
            .then()
            .statusCode(200)
            .extract().as(EntrySearchDTO[].class);
        
        // Should exclude entries with category tag
        assert filteredEntries.length < allEntries.length : 
            "Expected fewer entries when excluding by key regex";
        
        for (EntrySearchDTO entry : filteredEntries) {
            boolean hasCategoryTag = entry.transactionTags().stream()
                .anyMatch(tag -> tag.key().matches("categ.*"));
            assert !hasCategoryTag : "Expected entry to NOT have category-like tag";
        }
    }
}
