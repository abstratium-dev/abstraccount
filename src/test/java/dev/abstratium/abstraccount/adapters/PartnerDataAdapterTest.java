package dev.abstratium.abstraccount.adapters;

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
            "P00000001","Kutschera Anton","true"
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
        assertEquals("Kutschera Anton", partner1.get().name());
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
            "P00000001","Kutschera Anton","true"
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
            "P00000001","Kutschera Anton","true"

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
            "P00000001","Kutschera Anton","true"
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
        PartnerData partner = adapter.parseCsvLine("\"P00000001\",\"Kutschera Anton\",\"true\"");

        // Then
        assertEquals("P00000001", partner.partnerNumber());
        assertEquals("Kutschera Anton", partner.name());
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
        List<String> fields = adapter.parseCsvFields("\"P00000001\",\"Kutschera Anton\",\"true\"");

        // Then
        assertEquals(3, fields.size());
        assertEquals("P00000001", fields.get(0));
        assertEquals("Kutschera Anton", fields.get(1));
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
            "P00000001","Kutschera Anton","true"
            """);
        adapter.getAllPartners("org1");
        assertEquals(1, adapter.getAllPartners("org1").size());

        // When - modify file
        writeOrgFile("org1", """
            "Partner Number","Name","Active"
            "P00000001","Kutschera Anton","true"
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
            "P00000001","Kutschera Anton","true"
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
}
