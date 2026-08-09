package dev.abstratium.abstraccount.boundary;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.MacroEntity;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

/**
 * Integration tests for macro YAML import/export endpoints.
 */
@QuarkusTest
class MacroImportExportResourceTest {

    @Inject
    EntityManager em;

    @BeforeEach
    @Transactional
    void setUp() {
        em.createQuery("DELETE FROM MacroEntity").executeUpdate();
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExportMacrosReturnsYaml() {
        createMacro("PayBill", "Pay a bill");

        String exported = given()
            .when()
                .get("/api/macro/export")
            .then()
                .statusCode(200)
                .contentType("text/yaml")
                .extract().asString();

        assertNotNull(exported);
        assertTrue(exported.contains("abstraccount_export_version"));
        assertTrue(exported.contains("macros"));
        assertTrue(exported.contains("PayBill"));
        assertTrue(exported.contains("Pay a bill"));
        assertTrue(exported.contains("machine_runnable"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testImportMacrosCreatesEntities() {
        String yaml = """
            abstraccount_export_version: "1.0"
            artefact_type: macros
            items:
              - name: ImportedMacro
                description: An imported macro
                parameters: '[{"name":"date","type":"date","required":true}]'
                template: '{date} * Test'
                validation: '{"balanceCheck":true,"minPostings":2}'
                notes: Some notes
                machine_runnable: true
            """;

        given()
            .contentType("text/yaml")
            .body(yaml)
            .when()
                .post("/api/macro/import")
            .then()
                .statusCode(200)
                .body("status", equalTo("success"))
                .body("imported", equalTo(1))
                .body("items[0].originalName", equalTo("ImportedMacro"))
                .body("items[0].finalName", equalTo("ImportedMacro"))
                .body("items[0].id", notNullValue());

        MacroEntity imported = findMacroByName("ImportedMacro");
        assertNotNull(imported);
        assertEquals("An imported macro", imported.getDescription());
        assertTrue(imported.getParameters().contains("date"));
        assertTrue(imported.isMachineRunnable(), "machineRunnable flag should be imported");
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testImportDuplicateWithoutReplaceIdsReturnsConflict() {
        String yaml = """
            abstraccount_export_version: "1.0"
            artefact_type: macros
            items:
              - name: DuplicateMacro
                description: First import
                parameters: '[]'
                template: 'test'
            """;

        given()
            .contentType("text/yaml")
            .body(yaml)
            .post("/api/macro/import")
            .then()
            .statusCode(200);

        given()
            .contentType("text/yaml")
            .body(yaml)
            .post("/api/macro/import")
            .then()
            .statusCode(409)
            .body("status", equalTo("conflict"))
            .body("conflicts[0].name", equalTo("DuplicateMacro"))
            .body("conflicts[0].artefactType", equalTo("macro"));

        assertEquals(1, countMacrosNamed("DuplicateMacro"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testImportDuplicateWithReplaceIdsReplacesOriginal() {
        String yaml = """
            abstraccount_export_version: "1.0"
            artefact_type: macros
            items:
              - name: ReplaceableMacro
                description: Original
                parameters: '[]'
                template: 'original'
            """;

        String macroId = given()
            .contentType("text/yaml")
            .body(yaml)
            .post("/api/macro/import")
            .then()
            .statusCode(200)
            .extract().jsonPath().getString("items[0].id");

        String updatedYaml = """
            abstraccount_export_version: "1.0"
            artefact_type: macros
            items:
              - name: ReplaceableMacro
                description: Updated
                parameters: '[]'
                template: 'updated'
            """;

        given()
            .contentType("text/yaml")
            .body(updatedYaml)
            .queryParam("replaceIds", macroId)
            .post("/api/macro/import")
            .then()
            .statusCode(200)
            .body("status", equalTo("success"))
            .body("imported", equalTo(1))
            .body("items[0].finalName", equalTo("ReplaceableMacro"));

        MacroEntity replaced = em.find(MacroEntity.class, macroId);
        assertNull(replaced);
        MacroEntity updated = findMacroByName("ReplaceableMacro");
        assertNotNull(updated);
        assertEquals("Updated", updated.getDescription());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testImportDuplicateWithoutReplaceIdsRenamesWithCounter() {
        String yaml = """
            abstraccount_export_version: "1.0"
            artefact_type: macros
            items:
              - name: RenameMacro
                description: First
                parameters: '[]'
                template: 'test'
            """;

        given()
            .contentType("text/yaml")
            .body(yaml)
            .post("/api/macro/import")
            .then()
            .statusCode(200);

        given()
            .contentType("text/yaml")
            .body(yaml)
            .queryParam("autoRename", true)
            .post("/api/macro/import")
            .then()
            .statusCode(200)
            .body("status", equalTo("success"))
            .body("imported", equalTo(1))
            .body("items[0].originalName", equalTo("RenameMacro"))
            .body("items[0].finalName", equalTo("RenameMacro (1)"));

        assertNotNull(findMacroByName("RenameMacro"));
        assertNotNull(findMacroByName("RenameMacro (1)"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testImportInvalidJsonParametersReturns400() {
        String yaml = """
            abstraccount_export_version: "1.0"
            artefact_type: macros
            items:
              - name: BadMacro
                description: Bad parameters
                parameters: 'not valid json'
                template: 'test'
            """;

        given()
            .contentType("text/yaml")
            .body(yaml)
            .post("/api/macro/import")
            .then()
            .statusCode(400)
            .body("status", equalTo("error"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testImportRoundTrip() {
        createMacro("RoundTripMacro", "Round trip macro");

        String exported = given()
            .when()
                .get("/api/macro/export")
            .then()
                .statusCode(200)
                .extract().asString();

        assertTrue(exported.contains("RoundTripMacro"));

        // Re-import should rename because the macro already exists
        given()
            .contentType("text/yaml")
            .body(exported)
            .queryParam("autoRename", true)
            .post("/api/macro/import")
            .then()
            .statusCode(200)
            .body("items[0].finalName", equalTo("RoundTripMacro (1)"));

        assertNotNull(findMacroByName("RoundTripMacro (1)"));
    }

    @Test
    @TestSecurity(user = "second-org-user", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = "second-org"))
    void testExportDoesNotReturnAnotherOrganisationsMacros() {
        // This test runs in a different organisation; no macros should be visible.
        given()
            .when()
                .get("/api/macro/export")
            .then()
                .statusCode(200)
                .body(containsString("macros"))
                .body(containsString("items: []"));
    }

    @Transactional
    void createMacro(String name, String description) {
        MacroEntity macro = new MacroEntity();
        macro.setName(name);
        macro.setDescription(description);
        macro.setParameters("[]");
        macro.setTemplate("test");
        macro.setMachineRunnable(false);
        em.persist(macro);
        em.flush();
    }

    MacroEntity findMacroByName(String name) {
        return em.createQuery(
                "SELECT m FROM MacroEntity m WHERE m.name = :name",
                MacroEntity.class
            )
            .setParameter("name", name)
            .getResultStream()
            .findFirst()
            .orElse(null);
    }

    long countMacrosNamed(String name) {
        return em.createQuery(
                "SELECT COUNT(m) FROM MacroEntity m WHERE m.name = :name",
                Long.class
            )
            .setParameter("name", name)
            .getSingleResult();
    }
}
