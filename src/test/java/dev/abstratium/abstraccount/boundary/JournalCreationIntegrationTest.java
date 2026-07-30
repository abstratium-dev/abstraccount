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
                .body("$", hasSize(7))
                .body("name", containsInAnyOrder(
                        "Assets",
                        "Liabilities",
                        "Equity",
                        "Revenue",
                        "Cost of materials and goods",
                        "Personnel expenses",
                        "Other operating expenses"))
                .body("find { it.name == 'Assets' }.type", equalTo("ASSET"))
                .body("find { it.name == 'Assets' }.children.name", containsInAnyOrder("Bank account", "Accounts receivable"))
                .body("find { it.name == 'Assets' }.children.find { it.name == 'Bank account' }.type", equalTo("CASH"))
                .body("find { it.name == 'Liabilities' }.children.name", containsInAnyOrder("Accounts payable", "VAT payable"))
                .body("find { it.name == 'Equity' }.children.name", containsInAnyOrder(
                        "Shareholder equity", "Retained earnings", "Current-year profit/loss"))
                .body("find { it.name == 'Revenue' }.children.name", containsInAnyOrder("Sales revenue"))
                .body("find { it.name == 'Personnel expenses' }.children.name", containsInAnyOrder("Salaries"))
                .body("find { it.name == 'Other operating expenses' }.children.name", containsInAnyOrder(
                        "Rent and utilities", "IT and communication"));

        given()
            .when()
                .get("/api/report/templates")
            .then()
                .statusCode(200)
                .body("$", hasSize(2))
                .body("name", containsInAnyOrder("Starter balance sheet", "Starter income statement"))
                .body("find { it.name == 'Starter balance sheet' }.templateContent", containsString("^Shareholder equity$"))
                .body("find { it.name == 'Starter balance sheet' }.templateContent", containsString("\"title\":\"Current-year profit/loss\",\"level\":2,\"accountRegex\":\"^Current-year profit/loss$\",\"includeNetIncome\":true"))
                .body("find { it.name == 'Starter income statement' }.templateContent", containsString("^Cost of materials and goods"))
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
