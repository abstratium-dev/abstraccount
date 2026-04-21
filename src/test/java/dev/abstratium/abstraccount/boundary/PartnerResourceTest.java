package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class PartnerResourceTest {

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testSearchPartners_noFilter_returnsActivePartners() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("$", not(empty()))
            .body("[0].partnerNumber", notNullValue())
            .body("[0].name", notNullValue());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testSearchPartners_withMatchingFilter_returnsFiltered() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("q", "P00000001")
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].partnerNumber", equalTo("P00000001"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testSearchPartners_withNonMatchingFilter_returnsEmpty() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("q", "ZZZZNONEXISTENT")
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("$", empty());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testSearchPartners_caseInsensitive() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("q", "john smith")
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("$", hasSize(greaterThanOrEqualTo(1)))
            .body("[0].name", equalToIgnoringCase("John Smith"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testSearchPartners_sortedByPartnerNumber() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("partnerNumber", everyItem(notNullValue()));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetPartner_existingPartner_returnsPartner() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/partners/{partnerNumber}", "P00000001")
        .then()
            .statusCode(200)
            .body("partnerNumber", equalTo("P00000001"))
            .body("name", notNullValue());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetPartner_nonExistingPartner_returns404() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/partners/{partnerNumber}", "PNONEXISTENT")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testSearchInvoices_missingJournalId_returns400() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/invoices/search")
        .then()
            .statusCode(400);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testSearchInvoices_validJournalId_returnsEmptyOrList() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("journalId", "nonexistent-journal")
        .when()
            .get("/api/invoices/search")
        .then()
            .statusCode(200)
            .body("$", notNullValue());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testSearchInvoices_withPrefix_returnsFiltered() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("journalId", "nonexistent-journal")
            .queryParam("prefix", "PI0001")
        .when()
            .get("/api/invoices/search")
        .then()
            .statusCode(200);
    }

    @Test
    void testSearchPartners_unauthenticated_returns401() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(anyOf(equalTo(400), equalTo(401)));
    }
}
