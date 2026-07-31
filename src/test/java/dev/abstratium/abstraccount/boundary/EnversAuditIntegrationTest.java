package dev.abstratium.abstraccount.boundary;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.core.util.TestTransactionHelper;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

@QuarkusTest
public class EnversAuditIntegrationTest {

    @Inject
    TestTransactionHelper testTransactionHelper;

    @BeforeEach
    @Transactional
    public void setup() {
        testTransactionHelper.deleteAllData();
    }

    @Test
    @TestSecurity(user = "test-auditor", roles = {Roles.USER})
    public void testJournalCreateAndDeleteAreAudited() {
        // Create a journal
        Response createResponse = given()
            .contentType(ContentType.JSON)
            .body(new CreateJournalRequest(
                null,
                "Audit Test Journal",
                "audit journal",
                "CHF",
                Map.of("CHF", "2")
            ))
        .when()
            .post("/api/journal/create")
        .then()
            .statusCode(200)
            .extract().response();

        String journalId = createResponse.jsonPath().getString("id");

        // Verify ADD revision is recorded
        given()
            .when()
                .get("/api/history/entity/journal/" + journalId)
            .then()
                .statusCode(200)
                .body("$", hasSize(1))
                .body("[0].revisionType", equalTo("ADD"))
                .body("[0].username", equalTo("test-auditor"));

        // Delete the journal
        given()
        .when()
            .delete("/api/journal/" + journalId)
        .then()
            .statusCode(200);

        // Verify both ADD and DEL revisions are present
        Response historyResponse = given()
            .when()
                .get("/api/history/entity/journal/" + journalId)
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(2)))
                .extract().response();

        long addCount = historyResponse.jsonPath().getList("revisionType").stream()
            .filter(t -> "ADD".equals(t))
            .count();
        long delCount = historyResponse.jsonPath().getList("revisionType").stream()
            .filter(t -> "DEL".equals(t))
            .count();

        assertEquals(1, addCount, "Expected exactly one ADD revision");
        assertEquals(1, delCount, "Expected exactly one DEL revision");
    }
}
