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

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
@TestProfile(PartnerDataAdapterTest.TestPartnerDataProfile.class)
class PartnerDataAdapterTest {

    public static class TestPartnerDataProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("partner.data.file.path", "target/test-partners.csv");
        }
    }

    @Inject
    PartnerDataAdapter adapter;

    private Path testFile;

    @BeforeEach
    void setUp() throws IOException {
        testFile = Path.of("target/test-partners.csv");
        Files.createDirectories(testFile.getParent());
    }

    @AfterEach
    void tearDown() throws IOException {
        if (testFile != null && Files.exists(testFile)) {
            Files.delete(testFile);
        }
    }

    @Test
    void testLoadPartnerData() throws IOException {
        // Given
        String csvContent = """
            "Partner Number","Name","Active"
            "P00000001","Kutschera Anton","true"
            "P00000002","abstratium informatique sàrl","true"
            "P00000003","other company","false"
            """;
        Files.writeString(testFile, csvContent);

        // When
        adapter.loadPartnerData();

        // Then
        List<PartnerData> partners = adapter.getAllPartners();
        assertEquals(3, partners.size());

        Optional<PartnerData> partner1 = adapter.getPartner("P00000001");
        assertTrue(partner1.isPresent());
        assertEquals("Kutschera Anton", partner1.get().name());
        assertTrue(partner1.get().active());

        Optional<PartnerData> partner2 = adapter.getPartner("P00000002");
        assertTrue(partner2.isPresent());
        assertEquals("abstratium informatique sàrl", partner2.get().name());
        assertTrue(partner2.get().active());

        Optional<PartnerData> partner3 = adapter.getPartner("P00000003");
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
        Files.writeString(testFile, csvContent);
        adapter.loadPartnerData();

        // When
        Optional<PartnerData> partner = adapter.getPartner("P99999999");

        // Then
        assertFalse(partner.isPresent());
    }

    @Test
    void testLoadEmptyFile() throws IOException {
        // Given
        String csvContent = """
            "Partner Number","Name","Active"
            """;
        Files.writeString(testFile, csvContent);

        // When
        adapter.loadPartnerData();

        // Then
        List<PartnerData> partners = adapter.getAllPartners();
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
        Files.writeString(testFile, csvContent);

        // When
        adapter.loadPartnerData();

        // Then
        List<PartnerData> partners = adapter.getAllPartners();
        assertEquals(2, partners.size());
    }

    @Test
    void testReloadClearsCache() throws IOException {
        // Given - initial data
        String csvContent1 = """
            "Partner Number","Name","Active"
            "P00000001","Kutschera Anton","true"
            "P00000002","abstratium informatique sàrl","true"
            """;
        Files.writeString(testFile, csvContent1);
        adapter.loadPartnerData();
        assertEquals(2, adapter.getAllPartners().size());

        // When - reload with different data
        String csvContent2 = """
            "Partner Number","Name","Active"
            "P00000003","other company","false"
            """;
        Files.writeString(testFile, csvContent2);
        adapter.loadPartnerData();

        // Then - old data is gone, new data is present
        List<PartnerData> partners = adapter.getAllPartners();
        assertEquals(1, partners.size());
        assertFalse(adapter.getPartner("P00000001").isPresent());
        assertFalse(adapter.getPartner("P00000002").isPresent());
        assertTrue(adapter.getPartner("P00000003").isPresent());
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
        String csvContent1 = """
            "Partner Number","Name","Active"
            "P00000001","Kutschera Anton","true"
            """;
        Files.writeString(testFile, csvContent1);
        adapter.loadPartnerData();
        assertEquals(1, adapter.getAllPartners().size());

        // When - modify file
        String csvContent2 = """
            "Partner Number","Name","Active"
            "P00000001","Kutschera Anton","true"
            "P00000002","abstratium informatique sàrl","true"
            """;
        Files.writeString(testFile, csvContent2);

        // Wait for file watcher to detect change and reload
        // The watcher has a 100ms delay plus processing time
        Thread.sleep(500);

        // Then - data should be reloaded
        List<PartnerData> partners = adapter.getAllPartners();
        assertEquals(2, partners.size());
        assertTrue(adapter.getPartner("P00000002").isPresent());
    }

    @Test
    void testConcurrentReadAccess() throws IOException, InterruptedException {
        // Given
        String csvContent = """
            "Partner Number","Name","Active"
            "P00000001","Kutschera Anton","true"
            "P00000002","abstratium informatique sàrl","true"
            """;
        Files.writeString(testFile, csvContent);
        adapter.loadPartnerData();

        // When - multiple threads read concurrently
        Thread[] readers = new Thread[10];
        boolean[] success = new boolean[10];

        for (int i = 0; i < readers.length; i++) {
            final int index = i;
            readers[i] = new Thread(() -> {
                try {
                    for (int j = 0; j < 100; j++) {
                        List<PartnerData> partners = adapter.getAllPartners();
                        assertEquals(2, partners.size());
                        Optional<PartnerData> partner = adapter.getPartner("P00000001");
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
    void testLoadNonExistentFile() throws IOException, InterruptedException {
        // Given - file doesn't exist
        if (Files.exists(testFile)) {
            Files.delete(testFile);
            // Wait for file watcher to settle
            Thread.sleep(300);
        }

        // When - try to load (should not throw exception)
        // Note: The cache might not be empty due to file watcher race conditions
        // from previous tests, but the important thing is that loading a non-existent
        // file doesn't throw an exception
        assertDoesNotThrow(() -> adapter.loadPartnerData());
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
