package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.adapters.PartnerDataAdapter;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
@TestProfile(PartnerResourceTest.TestPartnerDataProfile.class)
class PartnerResourceTest {

    public static final String TEST_ORG_ID = "partner-test-org";

    public static class TestPartnerDataProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("partner.data.dir", "target/partner-resource-test-partners");
        }
    }

    @Inject
    PartnerDataAdapter partnerDataAdapter;

    private Path testDir;

    @BeforeEach
    void setUp() throws IOException {
        testDir = Path.of("target/partner-resource-test-partners");
        partnerDataAdapter.clearCache();
        cleanTestDir();
        Files.createDirectories(testDir);

        String csvContent = """
            "Partner Number","Name","Active"
            "P00000001","Kutschera Anton","true"
            "P00000002","abstratium informatique sàrl","true"
            "P00000003","John Smith","true"
            "P00000099","Inactive Partner","false"
            """;
        Files.writeString(testDir.resolve(TEST_ORG_ID + ".csv"), csvContent);
    }

    @AfterEach
    void tearDown() throws IOException {
        partnerDataAdapter.clearCache();
        cleanTestDir();
    }

    private void cleanTestDir() throws IOException {
        if (testDir != null && Files.exists(testDir)) {
            try (var paths = Files.list(testDir)) {
                paths.forEach(p -> {
                    try {
                        Files.deleteIfExists(p);
                    } catch (IOException e) {
                        throw new RuntimeException(e);
                    }
                });
            }
        }
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testSearchPartners_noFilter_returnsActivePartners() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("$", not(empty()))
            .body("[0].partnerNumber", notNullValue())
            .body("[0].name", notNullValue());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testSearchPartners_withMatchingFilter_returnsFiltered() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("q", "P00000001")
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("$", hasSize(1))
            .body("[0].partnerNumber", equalTo("P00000001"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testSearchPartners_withNonMatchingFilter_returnsEmpty() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("q", "ZZZZNONEXISTENT")
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("$", empty());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testSearchPartners_caseInsensitive() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("q", "john smith")
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("$", hasSize(greaterThanOrEqualTo(1)))
            .body("[0].name", equalToIgnoringCase("John Smith"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testSearchPartners_sortedByPartnerNumber() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("partnerNumber", everyItem(notNullValue()));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testGetPartner_existingPartner_returnsPartner() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/partners/{partnerNumber}", "P00000001")
        .then()
            .statusCode(200)
            .body("partnerNumber", equalTo("P00000001"))
            .body("name", notNullValue());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testGetPartner_nonExistingPartner_returns404() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/partners/{partnerNumber}", "PNONEXISTENT")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testSearchInvoices_missingJournalId_returns400() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/invoices/search")
        .then()
            .statusCode(400);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testSearchInvoices_validJournalId_returnsEmptyOrList() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("journalId", "nonexistent-journal")
        .when()
            .get("/api/invoices/search")
        .then()
            .statusCode(200)
            .body("$", notNullValue());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testSearchInvoices_withPrefix_returnsFiltered() {
        given()
            .contentType(ContentType.JSON)
            .queryParam("journalId", "nonexistent-journal")
            .queryParam("prefix", "PI0001")
        .when()
            .get("/api/invoices/search")
        .then()
            .statusCode(200);
    }

    @Test
    void testSearchPartners_unauthenticated_returns401() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(anyOf(equalTo(400), equalTo(401)));
    }

    // ========================================================================
    // POST /api/partners - create partner tests
    // ========================================================================

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testCreatePartner_success() {
        given()
            .contentType(ContentType.JSON)
            .body("{\"name\":\"New Test Partner\"}")
        .when()
            .post("/api/partners")
        .then()
            .statusCode(200)
            .body("partnerNumber", notNullValue())
            .body("name", equalTo("New Test Partner"))
            .body("warnings", empty());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testCreatePartner_assignsNextNumber() {
        // Existing partners: P00000001, P00000002, P00000003 (active), P00000099 (inactive)
        given()
            .contentType(ContentType.JSON)
            .body("{\"name\":\"Another Partner\"}")
        .when()
            .post("/api/partners")
        .then()
            .statusCode(200)
            .body("partnerNumber", equalTo("P00000004"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testCreatePartner_duplicateName_returnsWarning() {
        given()
            .contentType(ContentType.JSON)
            .body("{\"name\":\"John Smith\"}")
        .when()
            .post("/api/partners")
        .then()
            .statusCode(200)
            .body("partnerNumber", equalTo("P00000003"))
            .body("name", equalTo("John Smith"))
            .body("warnings", not(empty()))
            .body("warnings[0]", containsString("John Smith"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testCreatePartner_duplicateNameCaseInsensitive_returnsWarning() {
        given()
            .contentType(ContentType.JSON)
            .body("{\"name\":\"JOHN SMITH\"}")
        .when()
            .post("/api/partners")
        .then()
            .statusCode(200)
            .body("warnings", not(empty()));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testCreatePartner_blankName_returns400() {
        given()
            .contentType(ContentType.JSON)
            .body("{\"name\":\"\"}")
        .when()
            .post("/api/partners")
        .then()
            .statusCode(400);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testCreatePartner_nullName_returns400() {
        given()
            .contentType(ContentType.JSON)
            .body("{}")
        .when()
            .post("/api/partners")
        .then()
            .statusCode(400);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testCreatePartner_persistsToFile() {
        // Create a partner
        given()
            .contentType(ContentType.JSON)
            .body("{\"name\":\"Persisted Partner\"}")
        .when()
            .post("/api/partners")
        .then()
            .statusCode(200);

        // Verify it appears in search results
        given()
            .contentType(ContentType.JSON)
            .queryParam("q", "Persisted Partner")
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("[0].name", equalTo("Persisted Partner"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testCreatePartner_multipleCreates_incrementSequentially() {
        // Create first partner
        given()
            .contentType(ContentType.JSON)
            .body("{\"name\":\"First New\"}")
        .when()
            .post("/api/partners")
        .then()
            .statusCode(200)
            .body("partnerNumber", equalTo("P00000004"));

        // Create second partner
        given()
            .contentType(ContentType.JSON)
            .body("{\"name\":\"Second New\"}")
        .when()
            .post("/api/partners")
        .then()
            .statusCode(200)
            .body("partnerNumber", equalTo("P00000005"));
    }

    @Test
    void testCreatePartner_unauthenticated_returns401() {
        given()
            .contentType(ContentType.JSON)
            .body("{\"name\":\"Test\"}")
        .when()
            .post("/api/partners")
        .then()
            .statusCode(anyOf(equalTo(400), equalTo(401)));
    }

    // ========================================================================
    // POST /api/partners/import - replace partners from CSV
    // ========================================================================

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testImportPartners_validCsv_replacesPartners() {
        String csv = """
            "Partner Number","Name","Active"
            "P00000001","Imported Partner A","true"
            "P00000002","Imported Partner B","true"
            """;

        given()
            .contentType("text/csv")
            .body(csv)
        .when()
            .post("/api/partners/import")
        .then()
            .statusCode(200)
            .body("importedCount", equalTo(2))
            .body("errors", empty());

        // Verify the new partners are returned by search
        given()
            .contentType(ContentType.JSON)
            .queryParam("q", "Imported Partner A")
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("[0].name", equalTo("Imported Partner A"));

        // Old partner from setup data is gone
        given()
            .contentType(ContentType.JSON)
            .queryParam("q", "Kutschera")
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("$", empty());
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testImportPartners_invalidHeader_returns400() {
        String csv = """
            "WrongHeader","Name","Active"
            "P00000001","Imported Partner","true"
            """;

        given()
            .contentType("text/csv")
            .body(csv)
        .when()
            .post("/api/partners/import")
        .then()
            .statusCode(400)
            .body("importedCount", equalTo(0))
            .body("errors", not(empty()))
            .body("errors[0]", containsString("invalid header"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testImportPartners_badPartnerNumber_returns400() {
        String csv = """
            "Partner Number","Name","Active"
            "BADNUMBER","Imported Partner","true"
            """;

        given()
            .contentType("text/csv")
            .body(csv)
        .when()
            .post("/api/partners/import")
        .then()
            .statusCode(400)
            .body("importedCount", equalTo(0))
            .body("errors[0]", containsString("BADNUMBER"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testImportPartners_duplicateNumbers_returns400() {
        String csv = """
            "Partner Number","Name","Active"
            "P00000001","First","true"
            "P00000001","Second","true"
            """;

        given()
            .contentType("text/csv")
            .body(csv)
        .when()
            .post("/api/partners/import")
        .then()
            .statusCode(400)
            .body("importedCount", equalTo(0))
            .body("errors[0]", containsString("duplicate"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testImportPartners_emptyBody_returns400() {
        given()
            .contentType("text/csv")
            .body("")
        .when()
            .post("/api/partners/import")
        .then()
            .statusCode(400)
            .body("importedCount", equalTo(0))
            .body("errors[0]", containsString("empty"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = TEST_ORG_ID))
    void testImportPartners_invalidData_leavesExistingFileUnchanged() {
        // Confirm existing partner is present
        given()
            .contentType(ContentType.JSON)
            .queryParam("q", "Kutschera")
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("[0].name", equalTo("Kutschera Anton"));

        // Attempt an invalid import
        String badCsv = """
            "Partner Number","Name","Active"
            "BAD","Partner","true"
            """;
        given()
            .contentType("text/csv")
            .body(badCsv)
        .when()
            .post("/api/partners/import")
        .then()
            .statusCode(400);

        // Existing partner is still there
        given()
            .contentType(ContentType.JSON)
            .queryParam("q", "Kutschera")
        .when()
            .get("/api/partners/search")
        .then()
            .statusCode(200)
            .body("[0].name", equalTo("Kutschera Anton"));
    }

    @Test
    void testImportPartners_unauthenticated_returns401() {
        given()
            .contentType("text/csv")
            .body("\"Partner Number\",\"Name\",\"Active\"")
        .when()
            .post("/api/partners/import")
        .then()
            .statusCode(anyOf(equalTo(400), equalTo(401)));
    }
}
