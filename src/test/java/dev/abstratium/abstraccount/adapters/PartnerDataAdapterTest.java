package dev.abstratium.abstraccount.adapters;

import dev.abstratium.abstraccount.model.CreatePartnerResult;
import dev.abstratium.abstraccount.model.ImportPartnersResult;
import dev.abstratium.abstraccount.model.PartnerData;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
@TestProfile(PartnerDataAdapterTest.TestPartnerDataProfile.class)
class PartnerDataAdapterTest {

    public static class TestPartnerDataProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("partner.data.dir", "target/test-partners");
        }
    }

    @Inject
    PartnerDataAdapter adapter;

    private Path testDir;

    @BeforeEach
    void setUp() throws IOException {
        testDir = Path.of("target/test-partners");
        adapter.clearCache();
        cleanTestDir();
        Files.createDirectories(testDir);
    }

    @AfterEach
    void tearDown() throws IOException {
        adapter.clearCache();
        cleanTestDir();
    }

    private void cleanTestDir() throws IOException {
        if (testDir != null && Files.exists(testDir)) {
            try (Stream<Path> paths = Files.list(testDir)) {
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

    private Path orgFile(String orgId) {
        return testDir.resolve(orgId + ".csv");
    }

    private void writeOrgFile(String orgId, String csvContent) throws IOException {
        Files.createDirectories(testDir);
        Files.writeString(orgFile(orgId), csvContent);
    }

    @Test
    void testLoadPartnerDataForOrg() throws IOException {
        // Given
        String csvContent = """
            "Partner Number","Name","Active"
            "P00000001","Ant","true"
            "P00000002","abstratium informatique sàrl","true"
            "P00000003","other company","false"
            """;
        writeOrgFile("org1", csvContent);

        // When
        List<PartnerData> partners = adapter.getAllPartners("org1");

        // Then
        assertEquals(3, partners.size());

        Optional<PartnerData> partner1 = adapter.getPartner("org1", "P00000001");
        assertTrue(partner1.isPresent());
        assertEquals("Ant", partner1.get().name());
        assertTrue(partner1.get().active());

        Optional<PartnerData> partner2 = adapter.getPartner("org1", "P00000002");
        assertTrue(partner2.isPresent());
        assertEquals("abstratium informatique sàrl", partner2.get().name());
        assertTrue(partner2.get().active());

        Optional<PartnerData> partner3 = adapter.getPartner("org1", "P00000003");
        assertTrue(partner3.isPresent());
        assertEquals("other company", partner3.get().name());
        assertFalse(partner3.get().active());
    }

    @Test
    void testGetPartnerNotFound() throws IOException {
        // Given
        String csvContent = """
            "Partner Number","Name","Active"
            "P00000001","Ant","true"
            """;
        writeOrgFile("org1", csvContent);

        // When
        Optional<PartnerData> partner = adapter.getPartner("org1", "P99999999");

        // Then
        assertFalse(partner.isPresent());
    }

    @Test
    void testLoadEmptyFile() throws IOException {
        // Given
        String csvContent = """
            "Partner Number","Name","Active"
            """;
        writeOrgFile("org1", csvContent);

        // Then
        List<PartnerData> partners = adapter.getAllPartners("org1");
        assertTrue(partners.isEmpty());
    }

    @Test
    void testLoadFileWithEmptyLines() throws IOException {
        // Given
        String csvContent = """
            "Partner Number","Name","Active"
            "P00000001","Ant","true"

            "P00000002","abstratium informatique sàrl","true"

            """;
        writeOrgFile("org1", csvContent);

        // Then
        List<PartnerData> partners = adapter.getAllPartners("org1");
        assertEquals(2, partners.size());
    }

    @Test
    void testMultiOrgIsolation() throws IOException {
        // Given - two organisations with different partner data
        writeOrgFile("org1", """
            "Partner Number","Name","Active"
            "P00000001","Org1 Partner","true"
            """);
        writeOrgFile("org2", """
            "Partner Number","Name","Active"
            "P00000002","Org2 Partner","true"
            """);

        // Then - each org sees only its own partners
        assertTrue(adapter.getPartner("org1", "P00000001").isPresent());
        assertFalse(adapter.getPartner("org1", "P00000002").isPresent());

        assertTrue(adapter.getPartner("org2", "P00000002").isPresent());
        assertFalse(adapter.getPartner("org2", "P00000001").isPresent());

        assertEquals(1, adapter.getAllPartners("org1").size());
        assertEquals(1, adapter.getAllPartners("org2").size());
    }

    @Test
    void testMissingFileReturnsEmpty() {
        // When - no file exists for an org
        List<PartnerData> partners = adapter.getAllPartners("missing-org");

        // Then
        assertTrue(partners.isEmpty());
        assertFalse(adapter.getPartner("missing-org", "P00000001").isPresent());
    }

    @Test
    void testReloadForOrgUpdatesCache() throws IOException {
        // Given - initial data
        writeOrgFile("org1", """
            "Partner Number","Name","Active"
            "P00000001","Ant","true"
            """);
        adapter.getAllPartners("org1");
        assertEquals(1, adapter.getAllPartners("org1").size());

        // When - reload with different data
        writeOrgFile("org1", """
            "Partner Number","Name","Active"
            "P00000003","other company","false"
            """);
        adapter.reloadPartnerDataForOrg("org1");

        // Then - old data is gone, new data is present; other orgs unaffected
        List<PartnerData> partners = adapter.getAllPartners("org1");
        assertEquals(1, partners.size());
        assertFalse(adapter.getPartner("org1", "P00000001").isPresent());
        assertTrue(adapter.getPartner("org1", "P00000003").isPresent());
    }

    @Test
    void testParseCsvLine() {
        // When
        PartnerData partner = adapter.parseCsvLine("\"P00000001\",\"Ant\",\"true\"");

        // Then
        assertEquals("P00000001", partner.partnerNumber());
        assertEquals("Ant", partner.name());
        assertTrue(partner.active());
    }

    @Test
    void testParseCsvLineWithCommaInName() {
        // When
        PartnerData partner = adapter.parseCsvLine("\"P00000001\",\"Smith, John\",\"true\"");

        // Then
        assertEquals("P00000001", partner.partnerNumber());
        assertEquals("Smith, John", partner.name());
        assertTrue(partner.active());
    }

    @Test
    void testParseCsvLineWithSpecialCharacters() {
        // When
        PartnerData partner = adapter.parseCsvLine("\"P00000002\",\"abstratium informatique sàrl\",\"true\"");

        // Then
        assertEquals("P00000002", partner.partnerNumber());
        assertEquals("abstratium informatique sàrl", partner.name());
        assertTrue(partner.active());
    }

    @Test
    void testParseCsvLineInvalidFieldCount() {
        // When/Then
        assertThrows(IllegalArgumentException.class, () -> {
            adapter.parseCsvLine("\"P00000001\",\"Name\"");
        });
    }

    @Test
    void testParseCsvFields() {
        // When
        List<String> fields = adapter.parseCsvFields("\"P00000001\",\"Ant\",\"true\"");

        // Then
        assertEquals(3, fields.size());
        assertEquals("P00000001", fields.get(0));
        assertEquals("Ant", fields.get(1));
        assertEquals("true", fields.get(2));
    }

    @Test
    void testParseCsvFieldsWithCommaInQuotes() {
        // When
        List<String> fields = adapter.parseCsvFields("\"P00000001\",\"Smith, John\",\"true\"");

        // Then
        assertEquals(3, fields.size());
        assertEquals("P00000001", fields.get(0));
        assertEquals("Smith, John", fields.get(1));
        assertEquals("true", fields.get(2));
    }

    @Test
    void testFileWatcherDetectsChanges() throws IOException, InterruptedException {
        // Given - initial data
        writeOrgFile("org1", """
            "Partner Number","Name","Active"
            "P00000001","Ant","true"
            """);
        adapter.getAllPartners("org1");
        assertEquals(1, adapter.getAllPartners("org1").size());

        // When - modify file
        writeOrgFile("org1", """
            "Partner Number","Name","Active"
            "P00000001","Ant","true"
            "P00000002","abstratium informatique sàrl","true"
            """);

        // Wait for file watcher to detect change and reload
        // The watcher has a 100ms delay plus processing time
        Thread.sleep(500);

        // Then - data should be reloaded
        List<PartnerData> partners = adapter.getAllPartners("org1");
        assertEquals(2, partners.size());
        assertTrue(adapter.getPartner("org1", "P00000002").isPresent());
    }

    @Test
    void testFileWatcherOnlyReloadsChangedOrg() throws IOException, InterruptedException {
        // Given - two orgs with data
        writeOrgFile("org1", """
            "Partner Number","Name","Active"
            "P00000001","Org1 Partner","true"
            """);
        writeOrgFile("org2", """
            "Partner Number","Name","Active"
            "P00000002","Org2 Partner","true"
            """);
        adapter.getAllPartners("org1");
        adapter.getAllPartners("org2");

        // When - modify only org1's file
        writeOrgFile("org1", """
            "Partner Number","Name","Active"
            "P00000001","Org1 Partner Updated","true"
            """);

        Thread.sleep(500);

        // Then - org1 updated, org2 unchanged
        assertEquals("Org1 Partner Updated", adapter.getPartner("org1", "P00000001").orElseThrow().name());
        assertEquals("Org2 Partner", adapter.getPartner("org2", "P00000002").orElseThrow().name());
    }

    @Test
    void testConcurrentReadAccess() throws IOException, InterruptedException {
        // Given
        writeOrgFile("org1", """
            "Partner Number","Name","Active"
            "P00000001","Ant","true"
            "P00000002","abstratium informatique sàrl","true"
            """);

        // When - multiple threads read concurrently
        Thread[] readers = new Thread[10];
        boolean[] success = new boolean[10];

        for (int i = 0; i < readers.length; i++) {
            final int index = i;
            readers[i] = new Thread(() -> {
                try {
                    for (int j = 0; j < 100; j++) {
                        List<PartnerData> partners = adapter.getAllPartners("org1");
                        assertEquals(2, partners.size());
                        Optional<PartnerData> partner = adapter.getPartner("org1", "P00000001");
                        assertTrue(partner.isPresent());
                    }
                    success[index] = true;
                } catch (Exception e) {
                    success[index] = false;
                }
            });
            readers[i].start();
        }

        // Wait for all threads to complete
        for (Thread reader : readers) {
            reader.join();
        }

        // Then - all reads should succeed
        for (boolean s : success) {
            assertTrue(s);
        }
    }

    @Test
    void testLoadNonExistentFileDoesNotThrow() {
        // When/Then - loading a non-existent org file should not throw
        assertDoesNotThrow(() -> adapter.getAllPartners("non-existent-org"));
        assertDoesNotThrow(() -> adapter.getPartner("non-existent-org", "P00000001"));
    }

    @Test
    void testBooleanParsing() {
        // Test various boolean representations
        PartnerData partner1 = adapter.parseCsvLine("\"P00000001\",\"Name\",\"true\"");
        assertTrue(partner1.active());

        PartnerData partner2 = adapter.parseCsvLine("\"P00000002\",\"Name\",\"false\"");
        assertFalse(partner2.active());

        PartnerData partner3 = adapter.parseCsvLine("\"P00000003\",\"Name\",\"TRUE\"");
        assertTrue(partner3.active());

        PartnerData partner4 = adapter.parseCsvLine("\"P00000004\",\"Name\",\"FALSE\"");
        assertFalse(partner4.active());

        // Invalid boolean should default to false
        PartnerData partner5 = adapter.parseCsvLine("\"P00000005\",\"Name\",\"invalid\"");
        assertFalse(partner5.active());
    }

    // ========================================================================
    // addPartner tests
    // ========================================================================

    @Test
    void testAddPartner_emptyOrg_assignsP00000001() {
        CreatePartnerResult result = adapter.addPartner("org-add", "New Partner");

        assertEquals("P00000001", result.partner().partnerNumber());
        assertEquals("New Partner", result.partner().name());
        assertTrue(result.partner().active());
        assertTrue(result.warnings().isEmpty());
    }

    @Test
    void testAddPartner_existingPartners_assignsNextSequential() throws IOException {
        writeOrgFile("org-add", """
            "Partner Number","Name","Active"
            "P00000001","First","true"
            "P00000002","Second","true"
            """);
        adapter.getAllPartners("org-add"); // load cache

        CreatePartnerResult result = adapter.addPartner("org-add", "Third");

        assertEquals("P00000003", result.partner().partnerNumber());
        assertEquals("Third", result.partner().name());
        assertTrue(result.warnings().isEmpty());
    }

    @Test
    void testAddPartner_gapInSequence_fillsGap() throws IOException {
        writeOrgFile("org-add", """
            "Partner Number","Name","Active"
            "P00000001","First","true"
            "P00000003","Third","true"
            """);
        adapter.getAllPartners("org-add"); // load cache

        CreatePartnerResult result = adapter.addPartner("org-add", "Gap Filler");

        assertEquals("P00000002", result.partner().partnerNumber());
        assertTrue(result.warnings().isEmpty());
    }

    @Test
    void testAddPartner_multipleGaps_fillsFirstGap() throws IOException {
        writeOrgFile("org-add", """
            "Partner Number","Name","Active"
            "P00000001","First","true"
            "P00000004","Fourth","true"
            """);
        adapter.getAllPartners("org-add"); // load cache

        CreatePartnerResult result = adapter.addPartner("org-add", "Gap Filler");

        assertEquals("P00000002", result.partner().partnerNumber());
    }

    @Test
    void testAddPartner_duplicateName_returnsWarning() throws IOException {
        writeOrgFile("org-add", """
            "Partner Number","Name","Active"
            "P00000001","Existing Partner","true"
            """);
        adapter.getAllPartners("org-add"); // load cache

        CreatePartnerResult result = adapter.addPartner("org-add", "Existing Partner");

        assertEquals("P00000001", result.partner().partnerNumber());
        assertFalse(result.warnings().isEmpty());
        assertTrue(result.warnings().get(0).contains("Existing Partner"));
        assertTrue(result.warnings().get(0).contains("P00000001"));
    }

    @Test
    void testAddPartner_duplicateNameCaseInsensitive_returnsWarning() throws IOException {
        writeOrgFile("org-add", """
            "Partner Number","Name","Active"
            "P00000001","John Smith","true"
            """);
        adapter.getAllPartners("org-add"); // load cache

        CreatePartnerResult result = adapter.addPartner("org-add", "JOHN SMITH");

        assertEquals("P00000001", result.partner().partnerNumber());
        assertFalse(result.warnings().isEmpty());
    }

    @Test
    void testAddPartner_duplicateNameDoesNotCreateNewPartner() throws IOException {
        writeOrgFile("org-add", """
            "Partner Number","Name","Active"
            "P00000001","Existing","true"
            """);
        adapter.getAllPartners("org-add"); // load cache

        adapter.addPartner("org-add", "Existing");

        // Only one partner should exist
        assertEquals(1, adapter.getAllPartners("org-add").size());
    }

    @Test
    void testAddPartner_duplicateInactiveName_createsNewPartner() throws IOException {
        writeOrgFile("org-add", """
            "Partner Number","Name","Active"
            "P00000001","Inactive Partner","false"
            """);
        adapter.getAllPartners("org-add"); // load cache

        CreatePartnerResult result = adapter.addPartner("org-add", "Inactive Partner");

        // Inactive partners don't count as duplicates, so a new one is created
        assertEquals("P00000002", result.partner().partnerNumber());
        assertTrue(result.warnings().isEmpty());
    }

    @Test
    void testAddPartner_persistsToFile() throws IOException {
        adapter.addPartner("org-add", "Persisted Partner");

        // Reload from file to verify it was written
        adapter.reloadPartnerDataForOrg("org-add");
        Optional<PartnerData> partner = adapter.getPartner("org-add", "P00000001");
        assertTrue(partner.isPresent());
        assertEquals("Persisted Partner", partner.get().name());
        assertTrue(partner.get().active());
    }

    @Test
    void testAddPartner_createsFileWithHeaderIfNotExists() throws IOException {
        Path filePath = testDir.resolve("new-org.csv");
        assertFalse(Files.exists(filePath));

        adapter.addPartner("new-org", "First Partner");

        assertTrue(Files.exists(filePath));
        String content = Files.readString(filePath);
        assertTrue(content.contains("\"Partner Number\",\"Name\",\"Active\""));
        assertTrue(content.contains("\"P00000001\",\"First Partner\",\"true\""));
    }

    @Test
    void testAddPartner_appendsToExistingFile() throws IOException { //NOPMD
        writeOrgFile("org-add", """
            "Partner Number","Name","Active"
            "P00000001","First","true"
            """);
        adapter.getAllPartners("org-add"); // load cache

        adapter.addPartner("org-add", "Second");

        String content = Files.readString(orgFile("org-add"));
        assertTrue(content.contains("\"P00000001\",\"First\",\"true\""));
        assertTrue(content.contains("\"P00000002\",\"Second\",\"true\""));
    }

    @Test
    void testAddPartner_updatesInMemoryCache() {
        adapter.addPartner("org-add", "Cached Partner");

        // Should be immediately visible in the cache without reload
        Optional<PartnerData> partner = adapter.getPartner("org-add", "P00000001");
        assertTrue(partner.isPresent());
        assertEquals("Cached Partner", partner.get().name());
    }

    @Test
    void testAddPartner_blankName_throws() {
        assertThrows(IllegalArgumentException.class, () -> adapter.addPartner("org-add", ""));
        assertThrows(IllegalArgumentException.class, () -> adapter.addPartner("org-add", "  "));
    }

    @Test
    void testAddPartner_nullName_throws() {
        assertThrows(IllegalArgumentException.class, () -> adapter.addPartner("org-add", null));
    }

    @Test
    void testAddPartner_blankOrgId_throws() {
        assertThrows(IllegalArgumentException.class, () -> adapter.addPartner("", "Name"));
        assertThrows(IllegalArgumentException.class, () -> adapter.addPartner("  ", "Name"));
    }

    @Test
    void testAddPartner_nullOrgId_throws() {
        assertThrows(IllegalArgumentException.class, () -> adapter.addPartner(null, "Name"));
    }

    @Test
    void testAddPartner_nameWithComma_persistsCorrectly() throws IOException {
        adapter.addPartner("org-add", "Smith, John");

        adapter.reloadPartnerDataForOrg("org-add");
        Optional<PartnerData> partner = adapter.getPartner("org-add", "P00000001");
        assertTrue(partner.isPresent());
        assertEquals("Smith, John", partner.get().name());
    }

    @Test
    void testAddPartner_nameWithQuotes_persistsCorrectly() throws IOException {
        adapter.addPartner("org-add", "Partner \"The Best\" Co");

        adapter.reloadPartnerDataForOrg("org-add");
        Optional<PartnerData> partner = adapter.getPartner("org-add", "P00000001");
        assertTrue(partner.isPresent());
        assertEquals("Partner \"The Best\" Co", partner.get().name());
    }

    @Test
    void testAddPartner_multipleCreates_incrementSequentially() {
        adapter.addPartner("org-add", "First");
        adapter.addPartner("org-add", "Second");
        adapter.addPartner("org-add", "Third");

        assertEquals(3, adapter.getAllPartners("org-add").size());
        assertTrue(adapter.getPartner("org-add", "P00000001").isPresent());
        assertTrue(adapter.getPartner("org-add", "P00000002").isPresent());
        assertTrue(adapter.getPartner("org-add", "P00000003").isPresent());
    }

    @Test
    void testComputeNextPartnerNumber_emptyCache() {
        assertEquals("P00000001", adapter.computeNextPartnerNumber(Map.of()));
    }

    @Test
    void testComputeNextPartnerNumber_noGaps() {
        Map<String, PartnerData> cache = Map.of(
            "P00000001", new PartnerData("P00000001", "A", true),
            "P00000002", new PartnerData("P00000002", "B", true),
            "P00000003", new PartnerData("P00000003", "C", true)
        );
        assertEquals("P00000004", adapter.computeNextPartnerNumber(cache));
    }

    @Test
    void testComputeNextPartnerNumber_withGap() {
        Map<String, PartnerData> cache = Map.of(
            "P00000001", new PartnerData("P00000001", "A", true),
            "P00000003", new PartnerData("P00000003", "C", true)
        );
        assertEquals("P00000002", adapter.computeNextPartnerNumber(cache));
    }

    @Test
    void testComputeNextPartnerNumber_ignoresNonStandardNumbers() {
        Map<String, PartnerData> cache = Map.of(
            "P00000001", new PartnerData("P00000001", "A", true),
            "LEGACY001", new PartnerData("LEGACY001", "Legacy", true)
        );
        assertEquals("P00000002", adapter.computeNextPartnerNumber(cache));
    }

    @Test
    void testFormatCsvLine() {
        PartnerData partner = new PartnerData("P00000001", "Test Partner", true);
        String line = adapter.formatCsvLine(partner);
        assertEquals("\"P00000001\",\"Test Partner\",\"true\"", line);
    }

    @Test
    void testFormatCsvLine_withCommaInName() {
        PartnerData partner = new PartnerData("P00000001", "Smith, John", true);
        String line = adapter.formatCsvLine(partner);
        assertEquals("\"P00000001\",\"Smith, John\",\"true\"", line);
    }

    @Test
    void testFormatCsvLine_withQuotesInName() {
        PartnerData partner = new PartnerData("P00000001", "Partner \"Co\"", true);
        String line = adapter.formatCsvLine(partner);
        assertEquals("\"P00000001\",\"Partner \"\"Co\"\"\",\"true\"", line);
    }

    // ========================================================================
    // exportPartners tests
    // ========================================================================

    @Test
    void testExportPartners_returnsCsvWithHeaderAndAllPartners() throws IOException {
        writeOrgFile("org-export", """
            "Partner Number","Name","Active"
            "P00000002","Beta","true"
            "P00000001","Alpha","true"
            "P00000003","Gamma","false"
            """);

        String csv = adapter.exportPartners("org-export");

        String[] lines = csv.split("\\R", -1);
        assertEquals("\"Partner Number\",\"Name\",\"Active\"", lines[0]);
        // Sorted by partner number
        assertEquals("\"P00000001\",\"Alpha\",\"true\"", lines[1]);
        assertEquals("\"P00000002\",\"Beta\",\"true\"", lines[2]);
        // Inactive partners are included
        assertEquals("\"P00000003\",\"Gamma\",\"false\"", lines[3]);
    }

    @Test
    void testExportPartners_emptyOrg_returnsHeaderOnly() {
        String csv = adapter.exportPartners("org-empty");
        String[] lines = csv.split("\\R", -1);
        assertEquals("\"Partner Number\",\"Name\",\"Active\"", lines[0]);
        // No data lines (the second element is the trailing empty from the final newline)
        assertEquals("", lines[1]);
        assertEquals(2, lines.length);
    }

    @Test
    void testExportPartners_roundTripsThroughReplacePartners() throws IOException {
        writeOrgFile("org-roundtrip", """
            "Partner Number","Name","Active"
            "P00000001","Round Trip","true"
            "P00000002","Other, Inc.","true"
            """);

        String exported = adapter.exportPartners("org-roundtrip");

        // Clear cache so replace reads fresh
        adapter.clearCache();
        ImportPartnersResult result = adapter.replacePartners("org-roundtrip", exported);

        assertTrue(result.isValid());
        assertEquals(2, result.importedCount());
        assertEquals("Round Trip", adapter.getPartner("org-roundtrip", "P00000001").orElseThrow().name());
        assertEquals("Other, Inc.", adapter.getPartner("org-roundtrip", "P00000002").orElseThrow().name());
    }

    @Test
    void testExportPartners_blankOrgId_throws() {
        assertThrows(IllegalArgumentException.class, () -> adapter.exportPartners(""));
        assertThrows(IllegalArgumentException.class, () -> adapter.exportPartners(null));
    }

    // ========================================================================
    // replacePartners tests
    // ========================================================================

    @Test
    void testReplacePartners_validCsv_replacesFileAndReloadsCache() throws IOException {
        // Given - existing data
        writeOrgFile("org-replace", """
            "Partner Number","Name","Active"
            "P00000001","Old Partner","true"
            """);
        adapter.getAllPartners("org-replace"); // load cache
        assertEquals(1, adapter.getAllPartners("org-replace").size());

        String newCsv = """
            "Partner Number","Name","Active"
            "P00000001","New Partner A","true"
            "P00000002","New Partner B","false"
            """;

        // When
        ImportPartnersResult result = adapter.replacePartners("org-replace", newCsv);

        // Then
        assertTrue(result.isValid());
        assertEquals(2, result.importedCount());
        assertTrue(result.errors().isEmpty());

        List<PartnerData> partners = adapter.getAllPartners("org-replace");
        assertEquals(2, partners.size());
        assertEquals("New Partner A", adapter.getPartner("org-replace", "P00000001").orElseThrow().name());
        assertEquals("New Partner B", adapter.getPartner("org-replace", "P00000002").orElseThrow().name());
        assertFalse(adapter.getPartner("org-replace", "P00000002").orElseThrow().active());

        // Old partner name is gone
        assertFalse(adapter.getAllPartners("org-replace").stream()
            .anyMatch(p -> p.name().equals("Old Partner")));

        // File on disk has the new content
        String fileContent = Files.readString(orgFile("org-replace"));
        assertTrue(fileContent.contains("New Partner A"));
        assertTrue(fileContent.contains("New Partner B"));
        assertFalse(fileContent.contains("Old Partner"));
    }

    @Test
    void testReplacePartners_invalidHeader_returnsErrorAndLeavesFileUnchanged() throws IOException {
        String originalCsv = """
            "Partner Number","Name","Active"
            "P00000001","Old Partner","true"
            """;
        writeOrgFile("org-replace", originalCsv);
        adapter.getAllPartners("org-replace");

        String badHeader = """
            "WrongHeader","Name","Active"
            "P00000001","New Partner","true"
            """;

        ImportPartnersResult result = adapter.replacePartners("org-replace", badHeader);

        assertFalse(result.isValid());
        assertEquals(0, result.importedCount());
        assertFalse(result.errors().isEmpty());
        assertTrue(result.errors().get(0).contains("invalid header"));

        // File unchanged
        assertEquals("Old Partner", adapter.getPartner("org-replace", "P00000001").orElseThrow().name());
        String fileContent = Files.readString(orgFile("org-replace"));
        assertTrue(fileContent.contains("Old Partner"));
    }

    @Test
    void testReplacePartners_badPartnerNumberFormat_returnsError() {
        String csv = """
            "Partner Number","Name","Active"
            "BADNUMBER","New Partner","true"
            """;

        ImportPartnersResult result = adapter.replacePartners("org-replace", csv);

        assertFalse(result.isValid());
        assertEquals(0, result.importedCount());
        assertTrue(result.errors().stream().anyMatch(e -> e.contains("BADNUMBER")));
    }

    @Test
    void testReplacePartners_duplicatePartnerNumbers_returnsError() {
        String csv = """
            "Partner Number","Name","Active"
            "P00000001","First","true"
            "P00000001","Second","true"
            """;

        ImportPartnersResult result = adapter.replacePartners("org-replace", csv);

        assertFalse(result.isValid());
        assertEquals(0, result.importedCount());
        assertTrue(result.errors().stream().anyMatch(e -> e.contains("duplicate")));
    }

    @Test
    void testReplacePartners_wrongFieldCount_returnsError() {
        String csv = """
            "Partner Number","Name","Active"
            "P00000001","Only Two Fields"
            """;

        ImportPartnersResult result = adapter.replacePartners("org-replace", csv);

        assertFalse(result.isValid());
        assertEquals(0, result.importedCount());
        assertTrue(result.errors().stream().anyMatch(e -> e.contains("Line 2")));
    }

    @Test
    void testReplacePartners_emptyContent_returnsError() {
        ImportPartnersResult result = adapter.replacePartners("org-replace", "");

        assertFalse(result.isValid());
        assertEquals(0, result.importedCount());
        assertTrue(result.errors().stream().anyMatch(e -> e.contains("empty")));
    }

    @Test
    void testReplacePartners_headerOnly_returnsError() {
        String csv = """
            "Partner Number","Name","Active"
            """;

        ImportPartnersResult result = adapter.replacePartners("org-replace", csv);

        assertFalse(result.isValid());
        assertEquals(0, result.importedCount());
        assertTrue(result.errors().stream().anyMatch(e -> e.contains("no partner data")));
    }

    @Test
    void testReplacePartners_skipsBlankLines() {
        String csv = """
            "Partner Number","Name","Active"

            "P00000001","First","true"

            "P00000002","Second","true"
            """;

        ImportPartnersResult result = adapter.replacePartners("org-replace", csv);

        assertTrue(result.isValid());
        assertEquals(2, result.importedCount());
    }

    @Test
    void testReplacePartners_blankName_returnsError() {
        // PartnerData record rejects blank names, so parseCsvLine throws
        String csv = """
            "Partner Number","Name","Active"
            "P00000001","","true"
            """;

        ImportPartnersResult result = adapter.replacePartners("org-replace", csv);

        assertFalse(result.isValid());
        assertEquals(0, result.importedCount());
        assertTrue(result.errors().stream().anyMatch(e -> e.contains("Line 2")));
    }

    @Test
    void testReplacePartners_nullOrgId_throws() {
        assertThrows(IllegalArgumentException.class,
            () -> adapter.replacePartners(null, "anything"));
    }

    @Test
    void testReplacePartners_blankOrgId_throws() {
        assertThrows(IllegalArgumentException.class,
            () -> adapter.replacePartners("  ", "anything"));
    }

    @Test
    void testReplacePartners_createsFileIfNotExists() {
        // No file exists for "new-org"
        String csv = """
            "Partner Number","Name","Active"
            "P00000001","Brand New","true"
            """;

        ImportPartnersResult result = adapter.replacePartners("new-org", csv);

        assertTrue(result.isValid());
        assertEquals(1, result.importedCount());
        assertTrue(Files.exists(orgFile("new-org")));
        assertEquals("Brand New", adapter.getPartner("new-org", "P00000001").orElseThrow().name());
    }

    @Test
    void testReplacePartners_isolatedPerOrg() throws IOException {
        writeOrgFile("org-a", """
            "Partner Number","Name","Active"
            "P00000001","OrgA Partner","true"
            """);
        writeOrgFile("org-b", """
            "Partner Number","Name","Active"
            "P00000001","OrgB Partner","true"
            """);
        adapter.getAllPartners("org-a");
        adapter.getAllPartners("org-b");

        String newCsv = """
            "Partner Number","Name","Active"
            "P00000001","Replaced A","true"
            """;

        ImportPartnersResult result = adapter.replacePartners("org-a", newCsv);

        assertTrue(result.isValid());
        // org-a was replaced
        assertEquals("Replaced A", adapter.getPartner("org-a", "P00000001").orElseThrow().name());
        // org-b is untouched
        assertEquals("OrgB Partner", adapter.getPartner("org-b", "P00000001").orElseThrow().name());
    }

    @Test
    void testReplacePartners_fileWatcherStillDetectsExternalChangesAfterReplace() throws IOException, InterruptedException {
        // Given - initial data loaded
        writeOrgFile("org-watch", """
            "Partner Number","Name","Active"
            "P00000001","Initial Partner","true"
            """);
        adapter.getAllPartners("org-watch");
        assertEquals(1, adapter.getAllPartners("org-watch").size());

        // When - replace partners via the adapter (writes to the file with TRUNCATE_EXISTING)
        String importCsv = """
            "Partner Number","Name","Active"
            "P00000001","Imported Partner","true"
            "P00000002","Second Imported","true"
            """;
        ImportPartnersResult result = adapter.replacePartners("org-watch", importCsv);
        assertTrue(result.isValid());
        assertEquals(2, adapter.getAllPartners("org-watch").size());

        // Then - externally modify the file and verify the watcher still detects it
        writeOrgFile("org-watch", """
            "Partner Number","Name","Active"
            "P00000001","External Change","true"
            "P00000002","Second External","true"
            "P00000003","Third External","true"
            """);

        // Poll for the file watcher to detect the external change and reload.
        // Use polling instead of a fixed sleep because the watcher may be
        // busy processing events from other tests' file writes.
        boolean detected = false;
        for (int i = 0; i < 20; i++) {
            Thread.sleep(200);
            List<PartnerData> partners = adapter.getAllPartners("org-watch");
            if (partners.size() == 3
                    && adapter.getPartner("org-watch", "P00000003").isPresent()) {
                detected = true;
                break;
            }
        }

        assertTrue(detected, "File watcher should still detect external changes after replacePartners");
        assertEquals("External Change", adapter.getPartner("org-watch", "P00000001").orElseThrow().name());
        assertEquals("Third External", adapter.getPartner("org-watch", "P00000003").orElseThrow().name());
    }
}
