package dev.abstratium.abstraccount.adapters;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import dev.abstratium.abstraccount.model.PartnerData;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;

/**
 * Focused tests for {@link PartnerFileWatcher}. These tests verify that the
 * watcher detects file changes and invokes the callback with the correct
 * organisation ID. They use a dedicated test directory and the real watcher
 * (no mocking), so they are kept separate from {@link PartnerDataAdapterTest}
 * to avoid cross-test interference.
 */
@QuarkusTest
@TestProfile(PartnerFileWatcherTest.TestPartnerWatcherProfile.class)
class PartnerFileWatcherTest {

    public static class TestPartnerWatcherProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                "partner.data.dir", "target/test-watcher-partners",
                "partner.watcher.enabled", "false" // we start the watcher manually in tests
            );
        }
    }

    @Inject
    PartnerFileWatcher watcher;

    @Inject
    PartnerDataAdapter adapter;

    private Path testDir;

    @BeforeEach
    void setUp() throws IOException {
        testDir = Path.of("target/test-watcher-partners");
        cleanTestDir();
        Files.createDirectories(testDir);
        adapter.clearCache();
    }

    @AfterEach
    void tearDown() throws IOException {
        watcher.stop();
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

    private void writeOrgFile(String orgId, String csvContent) throws IOException {
        Files.createDirectories(testDir);
        Files.writeString(testDir.resolve(orgId + ".csv"), csvContent);
    }

    /**
     * Poll until the watcher has invoked the callback with the given orgId,
     * or fail after a timeout. This avoids fixed sleeps while being robust
     * to watcher processing delays.
     */
    private void waitForCallback(List<String> received, String expectedOrgId, int maxAttempts)
            throws InterruptedException {
        for (int i = 0; i < maxAttempts; i++) {
            Thread.sleep(100);
            if (received.contains(expectedOrgId)) {
                return;
            }
        }
        fail("Callback was not invoked for org " + expectedOrgId
            + " within " + (maxAttempts * 100) + "ms. Received: " + received);
    }

    @Test
    void testWatcherDetectsFileModification() throws IOException, InterruptedException {
        writeOrgFile("org-cb1", """
            "Partner Number","Name","Active"
            "P00000001","Initial","true"
            """);

        List<String> received = new CopyOnWriteArrayList<>();
        watcher.setChangeListener(received::add);
        watcher.start();

        // Modify the file
        writeOrgFile("org-cb1", """
            "Partner Number","Name","Active"
            "P00000001","Updated","true"
            "P00000002","New","true"
            """);

        waitForCallback(received, "org-cb1", 50);
    }

    @Test
    void testWatcherDetectsFileCreation() throws IOException, InterruptedException {
        List<String> received = new CopyOnWriteArrayList<>();
        watcher.setChangeListener(received::add);
        watcher.start();

        // Create a new file after the watcher has started
        writeOrgFile("org-cb2", """
            "Partner Number","Name","Active"
            "P00000001","Created","true"
            """);

        waitForCallback(received, "org-cb2", 50);
    }

    @Test
    void testWatcherIgnoresNonCsvFiles() throws IOException, InterruptedException {
        List<String> received = new CopyOnWriteArrayList<>();
        watcher.setChangeListener(received::add);
        watcher.start();

        // Write a non-CSV file
        Files.writeString(testDir.resolve("readme.txt"), "not a csv");

        // Wait a bit to ensure no callback fires
        Thread.sleep(500);
        assertTrue(received.isEmpty(), "Watcher should not fire for non-CSV files. Received: " + received);
    }

    @Test
    void testWatcherOnlyNotifiesChangedOrg() throws IOException, InterruptedException {
        writeOrgFile("org-a", """
            "Partner Number","Name","Active"
            "P00000001","A","true"
            """);
        writeOrgFile("org-b", """
            "Partner Number","Name","Active"
            "P00000001","B","true"
            """);

        List<String> received = new CopyOnWriteArrayList<>();
        watcher.setChangeListener(received::add);
        watcher.start();

        // Only modify org-a
        writeOrgFile("org-a", """
            "Partner Number","Name","Active"
            "P00000001","A Updated","true"
            """);

        waitForCallback(received, "org-a", 50);

        // org-b should not have been notified
        Thread.sleep(300);
        assertFalse(received.contains("org-b"),
            "Watcher should not notify org-b when only org-a changed. Received: " + received);
    }

    @Test
    void testWatcherIntegrationWithAdapter_reloadsCache() throws IOException, InterruptedException {
        writeOrgFile("org-int", """
            "Partner Number","Name","Active"
            "P00000001","Initial","true"
            """);
        adapter.getAllPartners("org-int");
        assertEquals(1, adapter.getAllPartners("org-int").size());

        // Wire the watcher to the adapter's reload method and start it
        watcher.setChangeListener(adapter::reloadPartnerDataForOrg);
        watcher.start();

        // Modify the file externally
        writeOrgFile("org-int", """
            "Partner Number","Name","Active"
            "P00000001","Initial","true"
            "P00000002","Added","true"
            """);

        // Poll until the adapter's cache reflects the new data
        boolean detected = false;
        for (int i = 0; i < 50; i++) {
            Thread.sleep(100);
            List<PartnerData> partners = adapter.getAllPartners("org-int");
            if (partners.size() == 2 && adapter.getPartner("org-int", "P00000002").isPresent()) {
                detected = true;
                break;
            }
        }
        assertTrue(detected, "Adapter cache should be reloaded by the watcher");
        assertEquals("Added", adapter.getPartner("org-int", "P00000002").orElseThrow().name());
    }

    @Test
    void testWatcherStillDetectsChangesAfterReplacePartners() throws IOException, InterruptedException {
        writeOrgFile("org-replace-watch", """
            "Partner Number","Name","Active"
            "P00000001","Initial","true"
            """);
        adapter.getAllPartners("org-replace-watch");

        // Wire the watcher to the adapter's reload method and start it
        watcher.setChangeListener(adapter::reloadPartnerDataForOrg);
        watcher.start();

        // Replace partners via the adapter (writes to the file with TRUNCATE_EXISTING)
        String importCsv = """
            "Partner Number","Name","Active"
            "P00000001","Imported","true"
            "P00000002","Second Imported","true"
            """;
        adapter.replacePartners("org-replace-watch", importCsv);
        assertEquals(2, adapter.getAllPartners("org-replace-watch").size());

        // Externally modify the file
        writeOrgFile("org-replace-watch", """
            "Partner Number","Name","Active"
            "P00000001","External","true"
            "P00000002","Second External","true"
            "P00000003","Third External","true"
            """);

        // Poll until the adapter's cache reflects the external change
        boolean detected = false;
        for (int i = 0; i < 50; i++) {
            Thread.sleep(100);
            List<PartnerData> partners = adapter.getAllPartners("org-replace-watch");
            if (partners.size() == 3 && adapter.getPartner("org-replace-watch", "P00000003").isPresent()) {
                detected = true;
                break;
            }
        }
        assertTrue(detected, "Watcher should still detect external changes after replacePartners");
        assertEquals("External", adapter.getPartner("org-replace-watch", "P00000001").orElseThrow().name());
        assertEquals("Third External", adapter.getPartner("org-replace-watch", "P00000003").orElseThrow().name());
    }

    @Test
    void testStartWhenAlreadyRunning_isNoOp() throws IOException {
        AtomicInteger callCount = new AtomicInteger(0);
        watcher.setChangeListener(orgId -> callCount.incrementAndGet());
        watcher.start();
        assertTrue(watcher.isRunning());

        // Start again - should not create a second thread
        watcher.start();
        assertTrue(watcher.isRunning());

        // Clean up
        watcher.stop();
    }

    @Test
    void testStopIsIdempotent() {
        // Stop when not running - should be a no-op
        watcher.stop();
        assertFalse(watcher.isRunning());

        // Stop again - should still be a no-op
        watcher.stop();
        assertFalse(watcher.isRunning());
    }

    @Test
    void testDisabledWatcherDoesNotStart() {
        // The watcher is disabled via config in the test profile, so init()
        // should not have started it. Verify it is not running.
        assertFalse(watcher.isRunning(), "Watcher should not be running when disabled by config");
    }
}
