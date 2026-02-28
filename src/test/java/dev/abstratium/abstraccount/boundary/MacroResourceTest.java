package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.JournalEntity;
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
class MacroResourceTest {
    
    @Inject
    EntityManager em;
    
    private String testJournalId;
    private String testJournal2Id;
    private String testMacroId;
    
    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        em.createQuery("DELETE FROM MacroEntity").executeUpdate();
        em.createQuery("DELETE FROM JournalEntity").executeUpdate();
        
        // Create test journals
        JournalEntity journal1 = new JournalEntity();
        journal1.setTitle("Test Journal 1");
        journal1.setCurrency("CHF");
        em.persist(journal1);
        
        JournalEntity journal2 = new JournalEntity();
        journal2.setTitle("Test Journal 2");
        journal2.setCurrency("CHF");
        em.persist(journal2);
        
        em.flush();
        testJournalId = journal1.getId();
        testJournal2Id = journal2.getId();
        
        // Create test macro
        MacroEntity macro = new MacroEntity();
        macro.setJournalId(testJournalId);
        macro.setName("PayBill");
        macro.setDescription("Pay a bill from the bank account");
        macro.setParameters("[{\"name\":\"id\",\"type\":\"uuid\",\"required\":true},{\"name\":\"date\",\"type\":\"date\",\"prompt\":\"Transaction date\",\"defaultValue\":\"{today}\",\"required\":true},{\"name\":\"amount\",\"type\":\"amount\",\"prompt\":\"Amount\",\"required\":true}]");
        macro.setTemplate("{date} * {payee} | {description}\\n    {expense_account}    CHF {amount}\\n    {bank_account}");
        macro.setValidation("{\"balanceCheck\":true,\"minPostings\":2}");
        macro.setNotes("Use this to pay bills");
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
            .get("/api/macro/" + testJournalId)
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].id", equalTo(testMacroId))
            .body("[0].name", equalTo("PayBill"))
            .body("[0].description", equalTo("Pay a bill from the bank account"))
            .body("[0].parameters", hasSize(3))
            .body("[0].parameters[0].name", equalTo("id"))
            .body("[0].parameters[0].type", equalTo("uuid"))
            .body("[0].parameters[0].required", equalTo(true))
            .body("[0].template", notNullValue())
            .body("[0].validation.balanceCheck", equalTo(true))
            .body("[0].validation.minPostings", equalTo(2))
            .body("[0].notes", equalTo("Use this to pay bills"))
            .body("[0].createdDate", notNullValue())
            .body("[0].modifiedDate", notNullValue());
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetAllMacros_emptyJournal() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testJournal2Id)
        .then()
            .statusCode(200)
            .body("$", hasSize(0));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetMacro() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testJournalId + "/macro/" + testMacroId)
        .then()
            .statusCode(200)
            .body("id", equalTo(testMacroId))
            .body("name", equalTo("PayBill"))
            .body("description", equalTo("Pay a bill from the bank account"))
            .body("parameters", hasSize(3))
            .body("template", notNullValue())
            .body("validation.balanceCheck", equalTo(true))
            .body("notes", equalTo("Use this to pay bills"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetMacro_notFound() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testJournalId + "/macro/nonexistent")
        .then()
            .statusCode(404);
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetMacro_wrongJournal() {
        // Macro exists but belongs to different journal
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testJournal2Id + "/macro/" + testMacroId)
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
                    {
                        "name": "id",
                        "type": "uuid",
                        "required": true
                    },
                    {
                        "name": "amount",
                        "type": "amount",
                        "prompt": "Amount received",
                        "required": true
                    }
                ],
                "template": "{date} * {client} | {description}\\n    {bank_account}    CHF {amount}\\n    {income_account}",
                "validation": {
                    "balanceCheck": true,
                    "minPostings": 2
                },
                "notes": "Record income"
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/macro/" + testJournalId)
        .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("journalId", equalTo(testJournalId))
            .body("name", equalTo("RecordIncome"))
            .body("description", equalTo("Record income received"))
            .body("parameters", hasSize(2))
            .body("parameters[0].name", equalTo("id"))
            .body("parameters[1].name", equalTo("amount"))
            .body("template", containsString("{date}"))
            .body("validation.balanceCheck", equalTo(true))
            .body("notes", equalTo("Record income"))
            .body("createdDate", notNullValue())
            .body("modifiedDate", notNullValue());
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testCreateMacro_withoutValidation() {
        String requestBody = """
            {
                "name": "SimpleMacro",
                "description": "Simple macro without validation",
                "parameters": [
                    {
                        "name": "amount",
                        "type": "amount",
                        "prompt": "Amount",
                        "required": true
                    }
                ],
                "template": "{date} * Transaction\\n    Account1    CHF {amount}\\n    Account2"
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/macro/" + testJournalId)
        .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("name", equalTo("SimpleMacro"))
            .body("validation", nullValue());
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateMacro() {
        String requestBody = """
            {
                "name": "PayBill",
                "description": "Updated description",
                "parameters": [
                    {
                        "name": "id",
                        "type": "uuid",
                        "required": true
                    },
                    {
                        "name": "amount",
                        "type": "amount",
                        "prompt": "Amount to pay",
                        "required": true
                    }
                ],
                "template": "{date} * Updated template\\n    Account1    CHF {amount}\\n    Account2",
                "validation": {
                    "balanceCheck": false,
                    "minPostings": 2
                },
                "notes": "Updated notes"
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .put("/api/macro/" + testJournalId + "/macro/" + testMacroId)
        .then()
            .statusCode(200)
            .body("id", equalTo(testMacroId))
            .body("name", equalTo("PayBill"))
            .body("description", equalTo("Updated description"))
            .body("parameters", hasSize(2))
            .body("template", containsString("Updated template"))
            .body("validation.balanceCheck", equalTo(false))
            .body("notes", equalTo("Updated notes"))
            .body("modifiedDate", notNullValue());
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateMacro_notFound() {
        String requestBody = """
            {
                "name": "Test",
                "description": "Test",
                "parameters": [],
                "template": "test"
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .put("/api/macro/" + testJournalId + "/macro/nonexistent")
        .then()
            .statusCode(404);
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateMacro_wrongJournal() {
        String requestBody = """
            {
                "name": "Test",
                "description": "Test",
                "parameters": [],
                "template": "test"
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .put("/api/macro/" + testJournal2Id + "/macro/" + testMacroId)
        .then()
            .statusCode(404);
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteMacro() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .delete("/api/macro/" + testJournalId + "/macro/" + testMacroId)
        .then()
            .statusCode(204);
        
        // Verify deletion
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testJournalId + "/macro/" + testMacroId)
        .then()
            .statusCode(404);
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteMacro_notFound() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .delete("/api/macro/" + testJournalId + "/macro/nonexistent")
        .then()
            .statusCode(404);
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteMacro_wrongJournal() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .delete("/api/macro/" + testJournal2Id + "/macro/" + testMacroId)
        .then()
            .statusCode(404);
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testJournalIsolation() {
        // Journal 1 should only see its own macro
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testJournalId)
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].name", equalTo("PayBill"));
        
        // Journal 2 should have no macros
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testJournal2Id)
        .then()
            .statusCode(200)
            .body("$", hasSize(0));
    }
    
    @Test
    void testGetAllMacros_unauthorized() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testJournalId)
        .then()
            .statusCode(400);
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {})
    void testGetAllMacros_forbidden() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/macro/" + testJournalId)
        .then()
            .statusCode(403);
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testCreateMacro_withComplexParameters() {
        String requestBody = """
            {
                "name": "ComplexMacro",
                "description": "Macro with complex parameters",
                "parameters": [
                    {
                        "name": "id",
                        "type": "uuid",
                        "required": true
                    },
                    {
                        "name": "date",
                        "type": "date",
                        "prompt": "Transaction date",
                        "defaultValue": "{today}",
                        "required": true
                    },
                    {
                        "name": "account",
                        "type": "account",
                        "prompt": "Select account",
                        "filter": "^6.*:.*$",
                        "required": true
                    },
                    {
                        "name": "payee",
                        "type": "payee",
                        "prompt": "Payee name",
                        "required": false
                    }
                ],
                "template": "{date} * {payee} | Transaction\\n    {account}    CHF {amount}\\n    Bank",
                "validation": {
                    "balanceCheck": true,
                    "minPostings": 2
                },
                "notes": "Complex macro for testing"
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/macro/" + testJournalId)
        .then()
            .statusCode(200)
            .body("parameters", hasSize(4))
            .body("parameters[0].type", equalTo("uuid"))
            .body("parameters[1].type", equalTo("date"))
            .body("parameters[1].defaultValue", equalTo("{today}"))
            .body("parameters[2].type", equalTo("account"))
            .body("parameters[2].filter", equalTo("^6.*:.*$"))
            .body("parameters[3].type", equalTo("payee"))
            .body("parameters[3].required", equalTo(false));
    }
}
