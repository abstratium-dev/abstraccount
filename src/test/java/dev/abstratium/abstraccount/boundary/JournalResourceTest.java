package dev.abstratium.abstraccount.boundary;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class JournalResourceTest {
    
    @Test
    void testGetAccounts() {
        given()
            .when().get("/api/journal/accounts")
            .then()
            .statusCode(200)
            .contentType(ContentType.JSON)
            .body("$", not(empty()));
    }
    
    @Test
    void testGetAllBalances() {
        given()
            .when().get("/api/journal/balances")
            .then()
            .statusCode(200)
            .contentType(ContentType.JSON);
    }
    
    @Test
    void testGetAllPostings() {
        given()
            .when().get("/api/journal/postings")
            .then()
            .statusCode(200)
            .contentType(ContentType.JSON)
            .body("$", not(empty()));
    }
    
    @Test
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
    void testGetAccountNotFound() {
        given()
            .when().get("/api/journal/accounts/{accountName}/balance", "NonExistent Account")
            .then()
            .statusCode(404);
    }
}
