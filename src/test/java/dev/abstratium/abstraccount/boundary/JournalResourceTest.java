package dev.abstratium.abstraccount.boundary;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Paths;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class JournalResourceTest {
    
    private static boolean journalUploaded = false;
    
    @BeforeEach
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void uploadTestJournal() throws Exception {
        if (journalUploaded) {
            return;
        }
        String journalContent = Files.readString(Paths.get("src/test/resources/test-journal.txt"));
        
        given()
            .contentType(ContentType.TEXT)
            .body(journalContent)
            .when().post("/api/journal/upload")
            .then()
            .statusCode(200);
        
        journalUploaded = true;
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testGetAccounts() {
        given()
            .when().get("/api/journal/accounts")
            .then()
            .statusCode(200)
            .contentType(ContentType.JSON)
            .body("$", not(empty()));
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testGetAllBalances() {
        given()
            .when().get("/api/journal/balances")
            .then()
            .statusCode(200)
            .contentType(ContentType.JSON);
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testGetAllPostings() {
        given()
            .when().get("/api/journal/postings")
            .then()
            .statusCode(200)
            .contentType(ContentType.JSON)
            .body("$", not(empty()));
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testGetAccountPostingsWithFilters() {
        // First get an account name
        String accountName = given()
            .when().get("/api/journal/accounts")
            .then()
            .statusCode(200)
            .extract()
            .path("[0].accountName");
        
        // Then get postings for that account
        given()
            .queryParam("startDate", "2025-01-01")
            .queryParam("endDate", "2025-12-31")
            .when().get("/api/journal/accounts/{accountName}/postings", accountName)
            .then()
            .statusCode(200)
            .contentType(ContentType.JSON);
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testGetAccountBalance() {
        // First get an account name
        String accountName = given()
            .when().get("/api/journal/accounts")
            .then()
            .statusCode(200)
            .extract()
            .path("[0].accountName");
        
        // Then get balance for that account
        given()
            .when().get("/api/journal/accounts/{accountName}/balance", accountName)
            .then()
            .statusCode(200)
            .contentType(ContentType.JSON)
            .body("accountName", equalTo(accountName))
            .body("balances", notNullValue());
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testGetAccountNotFound() {
        given()
            .when().get("/api/journal/accounts/{accountName}/balance", "NonExistent Account")
            .then()
            .statusCode(404);
    }
}
