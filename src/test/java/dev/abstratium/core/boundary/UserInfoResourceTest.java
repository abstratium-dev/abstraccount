package dev.abstratium.core.boundary;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;

@QuarkusTest
class UserInfoResourceTest {

    @Test
    void testGetUserInfo_unauthenticated_returns401() {
        given()
        .when()
            .get("/api/core/userinfo")
        .then()
            .statusCode(401);
    }

}
