package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.core.service.CurrentOrgContext;
import dev.abstratium.core.util.TestTransactionHelper;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

@QuarkusTest
class JournalCreationIntegrationTest {

    @Inject
    TestTransactionHelper testTransactionHelper;

    @Inject
    CurrentOrgContext currentOrgContext;

    @BeforeEach
    @Transactional
    void setUp() {
        currentOrgContext.setOrgId("00000000-0000-0000-0000-000000000000");
        testTransactionHelper.deleteAllData();
    }

    @Test
    @TestSecurity(user = "starter-report-user", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = "starter-reports-org"))
    void createsJournalWithStarterChartOfAccounts() {
        CreateJournalRequest request = new CreateJournalRequest(
                null, "Starter Chart Journal", null, "CHF", Map.of("USD", "100.00"));

        String journalId = given()
                .contentType(ContentType.JSON)
                .body(request)
            .when()
                .post("/api/journal/create")
            .then()
                .statusCode(200)
                .body("id", notNullValue())
                .body("commodities.USD", equalTo("100.00"))
                .body("commodities.CHF", nullValue())
                .extract()
                .path("id");

        given()
            .when()
                .get("/api/account/{journalId}/tree", journalId)
            .then()
                .statusCode(200)
                .body("$", hasSize(8))
                .body("name", containsInAnyOrder(
                        "1 Assets",
                        "2 Liabilities",
                        "2 Equity",
                        "3 Revenue",
                        "4 Cost of materials and goods",
                        "5 Personnel expenses",
                        "6 Other operating expenses",
                        "8 Non-operating expenses"))
                .body("find { it.name == '1 Assets' }.type", equalTo("ASSET"))
                .body("find { it.name == '1 Assets' }.children.name", containsInAnyOrder("10 Current Assets", "14 Non-current assets"))
                .body("find { it.name == '2 Liabilities' }.children.name", containsInAnyOrder("20 Current liabilities"))
                .body("find { it.name == '2 Equity' }.children.name", containsInAnyOrder("28 Shareholders Equity", "290 Reserves and retained earnings"))
                .body("find { it.name == '3 Revenue' }.children.name", containsInAnyOrder("3400 Services revenue", "3600 Other operating income"))
                .body("find { it.name == '5 Personnel expenses' }.children.name", containsInAnyOrder("5000 Salaries"))
                .body("find { it.name == '6 Other operating expenses' }.children.name", containsInAnyOrder(
                        "6300 Insurance expense", "6500 Administrative expenses", "6570 IT and computing expenses",
                        "6700 Other operating expenses", "6800 Depreciation", "6900 Financial expense",
                        "6901 Payment processing fees"));

        given()
            .when()
                .get("/api/report/templates")
            .then()
                .statusCode(200)
                .body("$", hasSize(2))
                .body("name", containsInAnyOrder("Starter balance sheet", "Starter income statement"))
                .body("find { it.name == 'Starter balance sheet' }.templateContent", containsString("^2:28:280"))
                .body("find { it.name == 'Starter balance sheet' }.templateContent", containsString("\"title\":\"Current-year profit/loss\",\"level\":2,\"accountRegex\":\"^2:290:2979\",\"includeNetIncome\":true"))
                .body("find { it.name == 'Starter income statement' }.templateContent", containsString("^4 "))
                .body("find { it.name == 'Starter income statement' }.templateContent", containsString("\"title\":\"Net Income\""));

        given()
                .contentType(ContentType.JSON)
                .body(new CreateJournalRequest(null, "Second Journal", null, "CHF", Map.of("CHF", "1000.00")))
            .when()
                .post("/api/journal/create")
            .then()
                .statusCode(200);

        given()
            .when()
                .get("/api/report/templates")
            .then()
                .statusCode(200)
                .body("$", hasSize(2));
    }
}
