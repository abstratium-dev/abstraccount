package dev.abstratium.abstraccount.boundary;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.CoreMatchers.notNullValue;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testCreateJournal() {
        Map<String, String> commodities = new HashMap<>();
        commodities.put("CHF", "1000.00");
        commodities.put("EUR", "1000.00");
        
        CreateJournalRequest request = new CreateJournalRequest(
            "https://example.com/logo.png",
            "Test Journal",
            "Test Subtitle",
            "CHF",
            commodities
        );
        
        given()
            .contentType(ContentType.JSON)
            .body(request)
            .when().post("/api/journal/create")
            .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("title", is("Test Journal"))
            .body("subtitle", is("Test Subtitle"))
            .body("currency", is("CHF"))
            .body("commodities.CHF", is("1000.00"))
            .body("commodities.EUR", is("1000.00"));
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testCreateJournalMinimal() {
        CreateJournalRequest request = new CreateJournalRequest(
            null,
            "Minimal Journal",
            null,
            "USD",
            new HashMap<>()
        );
        
        given()
            .contentType(ContentType.JSON)
            .body(request)
            .when().post("/api/journal/create")
            .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("title", is("Minimal Journal"))
            .body("currency", is("USD"));
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testCreateJournalWithoutTitle() {
        String invalidJson = """
            {
                "logo": null,
                "title": "",
                "subtitle": null,
                "currency": "USD",
                "commodities": {}
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(invalidJson)
            .when().post("/api/journal/create")
            .then()
            .statusCode(400);
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {"abstratium-abstraccount_user"})
    void testCreateJournalWithoutCurrency() {
        String invalidJson = """
            {
                "logo": null,
                "title": "Test Journal",
                "subtitle": null,
                "currency": "",
                "commodities": {}
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(invalidJson)
            .when().post("/api/journal/create")
            .then()
            .statusCode(400);
    }
}
