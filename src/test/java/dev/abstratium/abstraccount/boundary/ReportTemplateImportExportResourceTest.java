package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.ReportTemplateEntity;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for report template YAML import/export endpoints.
 */
@QuarkusTest
class ReportTemplateImportExportResourceTest {

    @Inject
    EntityManager em;

    @BeforeEach
    @Transactional
    void setUp() {
        em.createQuery("DELETE FROM ReportTemplateEntity").executeUpdate();
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testExportReportTemplatesReturnsYaml() {
        createReportTemplate("Trial Balance", "{\"sections\":[]}");

        String exported = given()
            .when()
                .get("/api/report/templates/export")
            .then()
                .statusCode(200)
                .contentType("text/yaml")
                .extract().asString();

        assertNotNull(exported);
        assertTrue(exported.contains("abstraccount_export_version"));
        assertTrue(exported.contains("report_templates"));
        assertTrue(exported.contains("Trial Balance"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testImportReportTemplatesCreatesEntities() {
        String yaml = """
            abstraccount_export_version: "1.0"
            artefact_type: report_templates
            items:
              - name: ImportedReport
                description: An imported report
                template_content: '{"sections":[{"title":"Assets"}]}'
            """;

        given()
            .contentType("text/yaml")
            .body(yaml)
            .when()
                .post("/api/report/templates/import")
            .then()
                .statusCode(200)
                .body("status", equalTo("success"))
                .body("imported", equalTo(1))
                .body("items[0].originalName", equalTo("ImportedReport"))
                .body("items[0].finalName", equalTo("ImportedReport"))
                .body("items[0].id", notNullValue());

        ReportTemplateEntity imported = findReportTemplateByName("ImportedReport");
        assertNotNull(imported);
        assertEquals("An imported report", imported.getDescription());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testImportDuplicateWithoutReplaceIdsReturnsConflict() {
        String yaml = """
            abstraccount_export_version: "1.0"
            artefact_type: report_templates
            items:
              - name: DuplicateReport
                description: First import
                template_content: '{"sections":[]}'
            """;

        given()
            .contentType("text/yaml")
            .body(yaml)
            .post("/api/report/templates/import")
            .then()
            .statusCode(200);

        given()
            .contentType("text/yaml")
            .body(yaml)
            .post("/api/report/templates/import")
            .then()
            .statusCode(409)
            .body("status", equalTo("conflict"))
            .body("conflicts[0].name", equalTo("DuplicateReport"))
            .body("conflicts[0].artefactType", equalTo("report_template"));

        assertEquals(1, countReportTemplatesNamed("DuplicateReport"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testImportDuplicateWithReplaceIdsReplacesOriginal() {
        String yaml = """
            abstraccount_export_version: "1.0"
            artefact_type: report_templates
            items:
              - name: ReplaceableReport
                description: Original
                template_content: '{"sections":[]}'
            """;

        String templateId = given()
            .contentType("text/yaml")
            .body(yaml)
            .post("/api/report/templates/import")
            .then()
            .statusCode(200)
            .extract().jsonPath().getString("items[0].id");

        String updatedYaml = """
            abstraccount_export_version: "1.0"
            artefact_type: report_templates
            items:
              - name: ReplaceableReport
                description: Updated
                template_content: '{"sections":[{"title":"Updated"}]}'
            """;

        given()
            .contentType("text/yaml")
            .body(updatedYaml)
            .queryParam("replaceIds", templateId)
            .post("/api/report/templates/import")
            .then()
            .statusCode(200)
            .body("status", equalTo("success"))
            .body("imported", equalTo(1))
            .body("items[0].finalName", equalTo("ReplaceableReport"));

        ReportTemplateEntity replaced = em.find(ReportTemplateEntity.class, templateId);
        assertNull(replaced);
        ReportTemplateEntity updated = findReportTemplateByName("ReplaceableReport");
        assertNotNull(updated);
        assertEquals("Updated", updated.getDescription());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testImportDuplicateWithoutReplaceIdsRenamesWithCounter() {
        String yaml = """
            abstraccount_export_version: "1.0"
            artefact_type: report_templates
            items:
              - name: RenameReport
                description: First
                template_content: '{"sections":[]}'
            """;

        given()
            .contentType("text/yaml")
            .body(yaml)
            .post("/api/report/templates/import")
            .then()
            .statusCode(200);

        given()
            .contentType("text/yaml")
            .body(yaml)
            .queryParam("autoRename", true)
            .post("/api/report/templates/import")
            .then()
            .statusCode(200)
            .body("status", equalTo("success"))
            .body("imported", equalTo(1))
            .body("items[0].originalName", equalTo("RenameReport"))
            .body("items[0].finalName", equalTo("RenameReport (1)"));

        assertNotNull(findReportTemplateByName("RenameReport"));
        assertNotNull(findReportTemplateByName("RenameReport (1)"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testImportInvalidJsonTemplateContentReturns400() {
        String yaml = """
            abstraccount_export_version: "1.0"
            artefact_type: report_templates
            items:
              - name: BadReport
                description: Bad content
                template_content: 'not valid json'
            """;

        given()
            .contentType("text/yaml")
            .body(yaml)
            .post("/api/report/templates/import")
            .then()
            .statusCode(400)
            .body("status", equalTo("error"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testImportRoundTrip() {
        createReportTemplate("RoundTripReport", "{\"sections\":[]}");

        String exported = given()
            .when()
                .get("/api/report/templates/export")
            .then()
                .statusCode(200)
                .extract().asString();

        assertTrue(exported.contains("RoundTripReport"));

        given()
            .contentType("text/yaml")
            .body(exported)
            .queryParam("autoRename", true)
            .post("/api/report/templates/import")
            .then()
            .statusCode(200)
            .body("items[0].finalName", equalTo("RoundTripReport (1)"));

        assertNotNull(findReportTemplateByName("RoundTripReport (1)"));
    }

    @Test
    @TestSecurity(user = "second-org-user", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = "second-org"))
    void testExportDoesNotReturnAnotherOrganisationsReports() {
        given()
            .when()
                .get("/api/report/templates/export")
            .then()
                .statusCode(200)
                .body(containsString("report_templates"))
                .body(containsString("items: []"));
    }

    @Transactional
    void createReportTemplate(String name, String templateContent) {
        ReportTemplateEntity template = new ReportTemplateEntity();
        template.setName(name);
        template.setDescription("Description for " + name);
        template.setTemplateContent(templateContent);
        em.persist(template);
        em.flush();
    }

    ReportTemplateEntity findReportTemplateByName(String name) {
        return em.createQuery(
                "SELECT rt FROM ReportTemplateEntity rt WHERE rt.name = :name",
                ReportTemplateEntity.class
            )
            .setParameter("name", name)
            .getResultStream()
            .findFirst()
            .orElse(null);
    }

    long countReportTemplatesNamed(String name) {
        return em.createQuery(
                "SELECT COUNT(rt) FROM ReportTemplateEntity rt WHERE rt.name = :name",
                Long.class
            )
            .setParameter("name", name)
            .getSingleResult();
    }
}
