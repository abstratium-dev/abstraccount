package dev.abstratium.abstraccount.boundary;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;

@QuarkusTest
class ReportResourceTest {
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testListTemplates() {
        given()
            .contentType(ContentType.JSON)
            .when().get("/api/report/templates")
            .then()
            .statusCode(200)
            .body("$", hasSize(greaterThan(0)))
            .body("[0].id", notNullValue())
            .body("[0].name", notNullValue())
            .body("[0].templateContent", notNullValue());
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testGetBalanceSheetTemplate() {
        given()
            .contentType(ContentType.JSON)
            .when().get("/api/report/templates/balance-sheet-001")
            .then()
            .statusCode(200)
            .body("id", equalTo("balance-sheet-001"))
            .body("name", equalTo("Balance Sheet"))
            .body("templateContent", notNullValue());
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testGetIncomeStatementTemplate() {
        given()
            .contentType(ContentType.JSON)
            .when().get("/api/report/templates/income-statement-001")
            .then()
            .statusCode(200)
            .body("id", equalTo("income-statement-001"))
            .body("name", equalTo("Income Statement"))
            .body("templateContent", notNullValue());
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testGetTrialBalanceTemplate() {
        given()
            .contentType(ContentType.JSON)
            .when().get("/api/report/templates/trial-balance-001")
            .then()
            .statusCode(200)
            .body("id", equalTo("trial-balance-001"))
            .body("name", equalTo("Trial Balance"))
            .body("templateContent", notNullValue());
    }
    
    @Test
    void testListTemplatesWithoutAuth() {
        given()
            .contentType(ContentType.JSON)
            .when().get("/api/report/templates")
            .then()
            .statusCode(anyOf(equalTo(400), equalTo(401)));
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testGetPartnerReportTemplate() {
        given()
            .contentType(ContentType.JSON)
            .when().get("/api/report/templates/partner-report-001")
            .then()
            .statusCode(200)
            .body("id", equalTo("partner-report-001"))
            .body("name", equalTo("Partner Activity Report"))
            .body("templateContent", notNullValue())
            .body("templateContent", containsString("groupByPartner"))
            .body("templateContent", containsString("sortable"))
            .body("templateContent", containsString("defaultSortColumn"))
            .body("templateContent", containsString("defaultSortDirection"));
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testPartnerReportHasCorrectSortConfiguration() {
        String templateContent = given()
            .contentType(ContentType.JSON)
            .when().get("/api/report/templates/partner-report-001")
            .then()
            .statusCode(200)
            .extract().path("templateContent");
        
        // Verify the template content contains the expected sorting configuration
        org.junit.jupiter.api.Assertions.assertTrue(
            templateContent.contains("\"sortable\":true"),
            "Template should have sortable set to true"
        );
        org.junit.jupiter.api.Assertions.assertTrue(
            templateContent.contains("\"defaultSortColumn\":\"net\""),
            "Template should have defaultSortColumn set to 'net'"
        );
        org.junit.jupiter.api.Assertions.assertTrue(
            templateContent.contains("\"defaultSortDirection\":\"desc\""),
            "Template should have defaultSortDirection set to 'desc'"
        );
    }
}
