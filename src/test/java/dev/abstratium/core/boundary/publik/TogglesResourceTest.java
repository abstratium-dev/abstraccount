package dev.abstratium.core.boundary.publik;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Integration tests for {@link TogglesResource}, verifying that the public
 * toggles endpoint is accessible without authentication and returns the
 * hardcoded set of public toggle names.
 */
@QuarkusTest
@TestProfile(TogglesResourceTest.TestProfile.class)
class TogglesResourceTest {

    public static class TestProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                "abstratium.stage", "test",
                "abstratium.toggles.api.url", "http://localhost:1/nonexistent"
            );
        }
    }

    @Test
    void testTogglesEndpointIsPubliclyAccessible() {
        given()
            .when()
            .get("/public/toggles")
            .then()
            .statusCode(200)
            .contentType(ContentType.JSON);
    }

    @Test
    void testTogglesEndpointReturnsGoingDownForMaintenanceToggle() {
        given()
            .when()
            .get("/public/toggles")
            .then()
            .statusCode(200)
            .body("", hasKey("going-down-for-maintenance"));
    }

    @Test
    void testTogglesEndpointReturnsOffWhenApiUnreachable() {
        // The toggles API URL points to a non-existent host, so the service
        // should gracefully fall back to "off" for each toggle.
        given()
            .when()
            .get("/public/toggles")
            .then()
            .statusCode(200)
            .body("going-down-for-maintenance", is("off"));
    }

    @Test
    void testTogglesEndpointDoesNotRequireAuthentication() {
        // No Authorization header is sent. The endpoint is under /public/* so
        // it must not return 401 or 302.
        given()
            .when()
            .get("/public/toggles")
            .then()
            .statusCode(200);
    }
}
