package dev.abstratium.core.filter;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.containsString;

/**
 * Test for SpaRoutingNotFoundMapper to verify:
 * 1. Non-API paths serve HTML redirect to root for SPA routing
 * 2. The mapper correctly handles different path types
 * 
 * Note: The mapper intercepts NotFoundException and decides whether to:
 * - Return HTML redirect for SPA routes (non-API paths)
 * - Delegate to resteasy-problem for API paths (by returning null)
 */
@QuarkusTest
class SpaRoutingNotFoundMapperTest {

    @Test
    void testNonApiPathReturnsHtmlRedirect() {
        // Non-API paths should return HTML with redirect meta tag for SPA routing
        // This simulates accessing an Angular route directly in the browser
        given()
            .when()
            .get("/addresses")
            .then()
            .statusCode(200)
            .contentType("text/html")
            .body(containsString("<!DOCTYPE html>"))
            .body(containsString("<meta http-equiv=\"refresh\" content=\"0;url=/\">"));
    }

    @Test
    void testNonApiPathWithSlashReturnsHtmlRedirect() {
        // Non-API paths with trailing slash should also return HTML redirect
        given()
            .when()
            .get("/some-angular-route/")
            .then()
            .statusCode(200)
            .contentType("text/html")
            .body(containsString("<!DOCTYPE html>"))
            .body(containsString("<meta http-equiv=\"refresh\" content=\"0;url=/\">"));
    }

    @Test
    void testHtmlAcceptHeaderReturnsHtmlRedirect() {
        // Requests with HTML Accept header for non-API paths should return HTML redirect
        // This is the typical browser request when navigating to a URL
        given()
            .accept("text/html")
            .when()
            .get("/some-route")
            .then()
            .statusCode(200)
            .contentType("text/html")
            .body(containsString("<!DOCTYPE html>"))
            .body(containsString("<meta http-equiv=\"refresh\" content=\"0;url=/\">"));
    }

    @Test
    void testNestedNonApiPathReturnsHtmlRedirect() {
        // Nested non-API paths should also return HTML redirect
        // This tests paths like /addresses/123/edit
        given()
            .when()
            .get("/addresses/123/edit")
            .then()
            .statusCode(200)
            .contentType("text/html")
            .body(containsString("<!DOCTYPE html>"))
            .body(containsString("<meta http-equiv=\"refresh\" content=\"0;url=/\">"));
    }

    @Test
    void testDeeplyNestedNonApiPathReturnsHtmlRedirect() {
        // Test deeply nested paths to ensure the mapper handles them correctly
        given()
            .when()
            .get("/feature/sub-feature/item/123")
            .then()
            .statusCode(200)
            .contentType("text/html")
            .body(containsString("<!DOCTYPE html>"))
            .body(containsString("<meta http-equiv=\"refresh\" content=\"0;url=/\">"));
    }

    @Test
    void testPathWithSpecialCharactersReturnsHtmlRedirect() {
        // Test paths with special characters (URL encoded)
        given()
            .when()
            .get("/route-with-dashes")
            .then()
            .statusCode(200)
            .contentType("text/html")
            .body(containsString("<!DOCTYPE html>"))
            .body(containsString("<meta http-equiv=\"refresh\" content=\"0;url=/\">"));
    }
}
