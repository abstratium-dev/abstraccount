package dev.abstratium.core.filter;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import dev.abstratium.abstraccount.Roles;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class SecurityHeadersFilterTest {

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testSecurityHeaders_cspPresent() {
        given()
        .when()
            .get("/api/journal/list")
        .then()
            .statusCode(200)
            .header("Content-Security-Policy", notNullValue())
            .header("X-Content-Type-Options", equalTo("nosniff"))
            .header("X-Frame-Options", equalTo("DENY"))
            .header("X-XSS-Protection", equalTo("1; mode=block"))
            .header("Referrer-Policy", equalTo("strict-origin-when-cross-origin"))
            .header("Permissions-Policy", notNullValue());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testSecurityHeaders_hstsAbsentByDefault() {
        given()
        .when()
            .get("/api/journal/list")
        .then()
            .statusCode(200)
            .header("Strict-Transport-Security", nullValue());
    }
}
