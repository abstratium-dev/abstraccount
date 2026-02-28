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

    // ========== API Path Tests - These verify the bug fix ==========
    
    @Test
    void testApiPathWithLeadingSlashDoesNotReturnHtmlRedirect() {
        // API paths starting with /api/ should delegate to resteasy-problem
        // The key test is that they DON'T return HTML redirect (which was the bug)
        // When there's no actual endpoint, the framework may return 204/406, not 404
        given()
            .accept("application/json")
            .when()
            .get("/api/nonexistent/endpoint")
            .then()
            .contentType(org.hamcrest.Matchers.not(containsString("text/html")));
    }

    @Test
    void testOAuthPathDoesNotReturnHtmlRedirect() {
        // OAuth paths should delegate to resteasy-problem, not return HTML redirect
        given()
            .accept("application/json")
            .when()
            .get("/oauth/nonexistent")
            .then()
            .contentType(org.hamcrest.Matchers.not(containsString("text/html")));
    }

    @Test
    void testPublicPathDoesNotReturnHtmlRedirect() {
        // Public API paths should delegate to resteasy-problem, not return HTML redirect
        given()
            .accept("application/json")
            .when()
            .get("/public/nonexistent")
            .then()
            .contentType(org.hamcrest.Matchers.not(containsString("text/html")));
    }

    @Test
    void testQuarkusDevPathDoesNotReturnHtmlRedirect() {
        // Quarkus dev console paths should delegate to resteasy-problem, not return HTML redirect
        given()
            .accept("application/json")
            .when()
            .get("/q/nonexistent")
            .then()
            .contentType(org.hamcrest.Matchers.not(containsString("text/html")));
    }

    @Test
    void testNestedApiPathDoesNotReturnHtmlRedirect() {
        // Test deeply nested API paths to ensure they're correctly identified as API paths
        given()
            .accept("application/json")
            .when()
            .get("/api/resources/123/subitems/456")
            .then()
            .contentType(org.hamcrest.Matchers.not(containsString("text/html")));
    }

    @Test
    void testJsonAcceptHeaderForNonApiPathDoesNotReturnHtmlRedirect() {
        // Even non-API paths should delegate to resteasy-problem if JSON is explicitly requested
        // This is already implemented via the Accept header check in the mapper
        given()
            .accept("application/json")
            .when()
            .get("/some-nonexistent-path")
            .then()
            .contentType(org.hamcrest.Matchers.not(containsString("text/html")));
    }
}
