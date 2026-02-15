package dev.abstratium.abstraccount.boundary;

import static io.restassured.RestAssured.given;

import java.nio.file.Files;
import java.nio.file.Paths;

import org.junit.jupiter.api.BeforeEach;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;

@QuarkusTest
class JournalResourceTest {
    
    private static boolean journalUploaded = false;
    
    @BeforeEach
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void uploadTestJournal() throws Exception {
        if (journalUploaded) {
            return;
        }
        String journalContent = Files.readString(Paths.get("src/test/resources/test-journal.txt"));
        
        given()
            .contentType(ContentType.TEXT)
            .body(journalContent)
            .when().post("/api/journal/upload")
            .then()
            .statusCode(200);
        
        journalUploaded = true;
    }
}
