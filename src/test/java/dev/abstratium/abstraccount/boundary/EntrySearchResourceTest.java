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
    
    private static boolean journalUploaded = false;
    private static String journalId;
    
    @BeforeEach
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void uploadTestJournal() throws Exception {
        if (journalUploaded) {
            return;
        }
        String journalContent = Files.readString(Paths.get("src/test/resources/test-journal.txt"));
        
        journalId = given()
            .contentType(ContentType.TEXT)
            .body(journalContent)
            .when().post("/api/journal/upload")
            .then()
            .statusCode(200)
            .extract().jsonPath().getString("journalId");
        
        journalUploaded = true;
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
}
