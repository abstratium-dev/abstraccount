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
            .body("[0].templateType", notNullValue())
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
            .body("templateType", equalTo("BALANCE_SHEET"))
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
            .body("templateType", equalTo("INCOME_STATEMENT"))
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
            .body("templateType", equalTo("TRIAL_BALANCE"))
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
}
