package dev.abstratium.core.boundary;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.RestAssured;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.equalTo;

/**
 * Tests for the LoginResource endpoint.
 * 
 * This endpoint triggers OIDC authentication and redirects to the home page.
 */
@QuarkusTest
class LoginResourceTest {

    @Test
    @TestSecurity(user = "testuser@example.com", roles = {})
    void testLoginRedirectsToHomePage() {
        // When authenticated (via @TestSecurity), the endpoint should redirect to home page
        RestAssured.given()
            .redirects().follow(false)
            .when()
            .get("/api/auth/login")
            .then()
            .statusCode(303)
            .header("Location", equalTo("/"));
    }
}
