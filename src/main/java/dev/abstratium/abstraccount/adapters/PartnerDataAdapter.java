package dev.abstratium.abstraccount.adapters;

import dev.abstratium.abstraccount.model.PartnerData;
import io.quarkus.runtime.Startup;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Adapter for loading and watching per-organisation partner data from CSV files.
 *
 * <p>Each organisation has its own file: {@code <partner.data.dir>/<orgId>.csv}.
 * Files are loaded lazily on first access and cached per organisation. A file watcher
 * monitors the directory and reloads only the changed organisation's data.</p>
 *
 * <p><b>Why orgId is passed explicitly instead of injecting CurrentOrgContext:</b>
 * This bean is {@code @ApplicationScoped} and its cache spans requests, whereas
 * {@code CurrentOrgContext} is {@code @RequestScoped}. Injecting a request-scoped bean
 * into an application-scoped bean would couple the adapter to an active HTTP request,
 * making it unusable from background tasks, batch imports, scheduled jobs, or unit tests
 * that call the adapter directly without a request context. By accepting {@code orgId}
 * as a parameter, the adapter remains context-agnostic and the tenant boundary stays
 * visible at every call site.</p>
 */
@ApplicationScoped
@Startup
public class PartnerDataAdapter {

    private static final Logger LOG = Logger.getLogger(PartnerDataAdapter.class);

    @ConfigProperty(name = "partner.data.dir")
    String partnerDataDir;

    private final Map<String, Map<String, PartnerData>> partnerCache = new ConcurrentHashMap<>();
    private final Set<String> attemptedLoads = ConcurrentHashMap.newKeySet();

    private WatchService watchService;
    private Thread watchThread;
    private volatile boolean running = false;

    @PostConstruct
    void init() {
        LOG.info("Initializing PartnerDataAdapter with directory: " + partnerDataDir);

        startFileWatcher();
    }

    @PreDestroy
    void cleanup() {
        LOG.info("Shutting down PartnerDataAdapter");
        stopFileWatcher();
    }

    /**
     * Get partner data by organisation and partner number.
     * Lazy-loads the organisation's file on first access.
     *
     * @param orgId the organisation identifier
     * @param partnerNumber the partner number
     * @return optional partner data
     */
    public Optional<PartnerData> getPartner(String orgId, String partnerNumber) {
        if (orgId == null || orgId.isBlank() || partnerNumber == null || partnerNumber.isBlank()) {
            return Optional.empty();
        }

        Map<String, PartnerData> orgCache = getOrgCache(orgId);
        return Optional.ofNullable(orgCache.get(partnerNumber));
    }

    /**
     * Get all partner data for an organisation.
     * Lazy-loads the organisation's file on first access.
     *
     * @param orgId the organisation identifier
     * @return list of partner data
     */
    public List<PartnerData> getAllPartners(String orgId) {
        if (orgId == null || orgId.isBlank()) {
            return List.of();
        }

        Map<String, PartnerData> orgCache = getOrgCache(orgId);
        return new ArrayList<>(orgCache.values());
    }

    /**
     * Returns (or loads and caches) the partner map for the given organisation.
     * Thread-safe: the same organisation loads only once.
     */
    private Map<String, PartnerData> getOrgCache(String orgId) {
        return partnerCache.computeIfAbsent(orgId, this::loadPartnerDataForOrg);
    }

    /**
     * Force a reload of a specific organisation's partner data.
     */
    void reloadPartnerDataForOrg(String orgId) {
        partnerCache.put(orgId, loadPartnerDataForOrg(orgId));
    }

    /**
     * Load partner data for a single organisation from its CSV file.
     * Returns an empty map if the file does not exist or cannot be read.
     */
    Map<String, PartnerData> loadPartnerDataForOrg(String orgId) {
        attemptedLoads.add(orgId);
        Path filePath = getOrgFilePath(orgId);

        if (!Files.exists(filePath)) {
            LOG.debug("Partner data file does not exist for org " + orgId + ": " + filePath);
            return new ConcurrentHashMap<>();
        }

        LOG.info("Loading partner data for org " + orgId + " from: " + filePath);

        Map<String, PartnerData> orgCache = new ConcurrentHashMap<>();
        try (BufferedReader reader = Files.newBufferedReader(filePath)) {
            String line;
            boolean isFirstLine = true;
            int lineNumber = 0;

            while ((line = reader.readLine()) != null) {
                lineNumber++;

                if (isFirstLine) {
                    isFirstLine = false;
                    continue;
                }

                if (line.trim().isEmpty()) {
                    continue;
                }

                try {
                    PartnerData partner = parseCsvLine(line);
                    orgCache.put(partner.partnerNumber(), partner);
                } catch (Exception e) {
                    LOG.error("Error parsing line " + lineNumber + " for org " + orgId + ": " + line, e);
                }
            }

            LOG.info("Loaded " + orgCache.size() + " partners for org " + orgId);
        } catch (IOException e) {
            LOG.error("Error reading partner data file for org " + orgId + ": " + filePath, e);
        }

        return orgCache;
    }

    /**
     * Parse a CSV line into PartnerData.
     * Expected format: "Partner Number","Name","Active"
     */
    PartnerData parseCsvLine(String line) {
        List<String> fields = parseCsvFields(line);

        if (fields.size() != 3) {
            throw new IllegalArgumentException("Expected 3 fields, got " + fields.size());
        }

        String partnerNumber = fields.get(0);
        String name = fields.get(1);
        boolean active = Boolean.parseBoolean(fields.get(2));

        return new PartnerData(partnerNumber, name, active);
    }

    /**
     * Parse CSV fields from a line, handling quoted fields.
     */
    List<String> parseCsvFields(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder currentField = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);

            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                fields.add(currentField.toString());
                currentField = new StringBuilder();
            } else {
                currentField.append(c);
            }
        }

        // Add the last field
        fields.add(currentField.toString());

        return fields;
    }

    /**
     * Start watching the partner data directory for changes.
     */
    void startFileWatcher() {
        try {
            Path directory = Paths.get(partnerDataDir);

            if (!Files.exists(directory)) {
                Files.createDirectories(directory);
                LOG.info("Created partner data directory: " + directory);
            }

            watchService = FileSystems.getDefault().newWatchService();
            directory.register(watchService, StandardWatchEventKinds.ENTRY_MODIFY, StandardWatchEventKinds.ENTRY_CREATE);

            running = true;
            watchThread = new Thread(this::watchForChanges, "PartnerDataWatcher");
            watchThread.setDaemon(true);
            watchThread.start();

            LOG.info("Started file watcher for directory: " + directory);
        } catch (IOException e) {
            LOG.error("Failed to start file watcher", e);
        }
    }

    /**
     * Stop watching the partner data directory.
     */
    void stopFileWatcher() {
        running = false;

        if (watchThread != null) {
            watchThread.interrupt();
            try {
                watchThread.join(5000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        if (watchService != null) {
            try {
                watchService.close();
            } catch (IOException e) {
                LOG.error("Error closing watch service", e);
            }
        }
    }

    /**
     * Watch for file changes and reload data for the affected organisation only.
     */
    void watchForChanges() {
        while (running) {
            try {
                WatchKey key = watchService.take();

                for (WatchEvent<?> event : key.pollEvents()) {
                    WatchEvent.Kind<?> kind = event.kind();

                    if (kind == StandardWatchEventKinds.OVERFLOW) {
                        continue;
                    }

                    @SuppressWarnings("unchecked")
                    WatchEvent<Path> ev = (WatchEvent<Path>) event;
                    Path changedFile = ev.context();
                    String fileName = changedFile.getFileName().toString();

                    if (!fileName.endsWith(".csv")) {
                        continue;
                    }

                    String orgId = fileName.substring(0, fileName.length() - 4);
                    LOG.info("Partner data file changed for org " + orgId + ", reloading: " + changedFile);

                    // Small delay to ensure file write is complete
                    Thread.sleep(100);

                    reloadPartnerDataForOrg(orgId);
                }

                boolean valid = key.reset();
                if (!valid) {
                    LOG.warn("Watch key no longer valid");
                    break;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                LOG.info("File watcher interrupted");
                break;
            } catch (Exception e) {
                LOG.error("Error in file watcher", e);
            }
        }
    }

    private Path getOrgFilePath(String orgId) {
        return Paths.get(partnerDataDir, orgId + ".csv");
    }

    /**
     * Clear the in-memory cache. Public for test cleanup only.
     */
    public void clearCache() {
        partnerCache.clear();
        attemptedLoads.clear();
    }
}
