package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.MacroEntity;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class MacroResourceTest {
    
    @Inject
    EntityManager em;
    
    private String testMacroId;
    
    @BeforeEach
    @Transactional
    public void setup() {
        // Clean up existing macros
        em.createQuery("DELETE FROM MacroEntity").executeUpdate();
        
        // Create test macro
        MacroEntity macro = new MacroEntity();
        macro.setName("PayBill");
        macro.setDescription("Pay a bill from the bank account");
        macro.setParameters("[{\"name\":\"date\",\"type\":\"date\",\"prompt\":\"Transaction date\",\"required\":true},{\"name\":\"amount\",\"type\":\"amount\",\"prompt\":\"Amount\",\"required\":true}]");
        macro.setTemplate("Test template");
        macro.setValidation("{\"balanceCheck\":true,\"minPostings\":2}");
        macro.setNotes("Test notes");
        em.persist(macro);
        em.flush();
        testMacroId = macro.getId();
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetAllMacros() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro")
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].name", equalTo("PayBill"))
            .body("[0].description", equalTo("Pay a bill from the bank account"))
            .body("[0].parameters", hasSize(2));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetMacro() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testMacroId)
        .then()
            .statusCode(200)
            .body("id", equalTo(testMacroId))
            .body("name", equalTo("PayBill"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetMacro_notFound() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/nonexistent")
        .then()
            .statusCode(404);
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testCreateMacro() {
        String requestBody = """
            {
                "name": "RecordIncome",
                "description": "Record income received",
                "parameters": [
                    {"name": "date", "type": "date", "prompt": "Date", "required": true},
                    {"name": "amount", "type": "amount", "prompt": "Amount", "required": true}
                ],
                "template": "Income template",
                "validation": {"balanceCheck": true, "minPostings": 2},
                "notes": "Income notes"
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/macro")
        .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("name", equalTo("RecordIncome"))
            .body("description", equalTo("Record income received"))
            .body("parameters", hasSize(2));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateMacro() {
        String requestBody = """
            {
                "name": "UpdatedPayBill",
                "description": "Updated description",
                "parameters": [
                    {"name": "date", "type": "date", "prompt": "Date", "required": true}
                ],
                "template": "Updated template",
                "validation": {"balanceCheck": false, "minPostings": 1},
                "notes": "Updated notes"
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .put("/api/macro/" + testMacroId)
        .then()
            .statusCode(200)
            .body("id", equalTo(testMacroId))
            .body("name", equalTo("UpdatedPayBill"))
            .body("description", equalTo("Updated description"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateMacro_notFound() {
        String requestBody = """
            {
                "name": "UpdatedMacro",
                "description": "Description",
                "parameters": [],
                "template": "Template",
                "validation": null,
                "notes": null
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .put("/api/macro/nonexistent")
        .then()
            .statusCode(404);
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteMacro() {
        // First verify macro exists
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testMacroId)
        .then()
            .statusCode(200);
        
        // Delete it
        given()
            .contentType(ContentType.JSON)
        .when()
            .delete("/api/macro/" + testMacroId)
        .then()
            .statusCode(204);
        
        // Verify it's gone
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testMacroId)
        .then()
            .statusCode(404);
    }
    
    @Test
    void testUnauthorized() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro")
        .then()
            .statusCode(anyOf(equalTo(400), equalTo(401)));
    }
}
