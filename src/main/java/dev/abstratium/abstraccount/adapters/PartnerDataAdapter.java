package dev.abstratium.abstraccount.adapters;

import dev.abstratium.abstraccount.model.CreatePartnerResult;
import dev.abstratium.abstraccount.model.ImportPartnersResult;
import dev.abstratium.abstraccount.model.PartnerData;
import io.quarkus.runtime.Startup;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    private static final Pattern PARTNER_NUMBER_PATTERN = Pattern.compile("^P(\\d{8})$");
    private static final String PARTNER_NUMBER_FORMAT = "P%08d";

    /**
     * Add a new partner to the organisation's CSV file.
     *
     * <p>The partner number is assigned by the backend as the next available
     * number, filling gaps in the existing sequence. If a partner with the same
     * name (case-insensitive) already exists, the duplicate is skipped (not
     * created) and a warning is returned so the UI can inform the user.</p>
     *
     * @param orgId the organisation identifier (from the certificate)
     * @param name  the partner name
     * @return result containing the created partner and any warnings
     */
    public synchronized CreatePartnerResult addPartner(String orgId, String name) {
        if (orgId == null || orgId.isBlank()) {
            throw new IllegalArgumentException("orgId cannot be null or blank");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name cannot be null or blank");
        }

        String trimmedName = name.trim();
        Map<String, PartnerData> orgCache = getOrgCache(orgId);
        List<String> warnings = new ArrayList<>();

        // Check for duplicate name (case-insensitive) among active partners
        for (PartnerData existing : orgCache.values()) {
            if (existing.active() && existing.name().equalsIgnoreCase(trimmedName)) {
                warnings.add("A partner with the name \"" + trimmedName + "\" already exists ("
                    + existing.partnerNumber() + "). No new partner was created.");
                // Return the existing partner as the "created" one so the UI can
                // show it, but the warning makes clear it was a duplicate.
                return new CreatePartnerResult(existing, warnings);
            }
        }

        // Compute next available partner number (gap-filling)
        String nextNumber = computeNextPartnerNumber(orgCache);
        PartnerData newPartner = new PartnerData(nextNumber, trimmedName, true);

        // Append to the CSV file
        appendPartnerToFile(orgId, newPartner);

        // Update the in-memory cache
        orgCache.put(nextNumber, newPartner);

        LOG.infof("Created partner %s for org %s", nextNumber, orgId);
        return new CreatePartnerResult(newPartner, warnings);
    }

    private static final String CSV_HEADER = "\"Partner Number\",\"Name\",\"Active\"";

    /**
     * Replace all partners for an organisation from the supplied CSV content.
     *
     * <p>The content is fully validated <em>before</em> the existing file is
     * touched. If any validation error is found the existing file is left
     * unchanged and the errors are returned. When validation succeeds the
     * file is overwritten with a normalised version (re-serialised from the
     * parsed data) and the in-memory cache for the organisation is reloaded.</p>
     *
     * @param orgId      the organisation identifier (from the certificate)
     * @param csvContent the full CSV file content, including the header line
     * @return result with the imported count and any validation errors
     */
    public synchronized ImportPartnersResult replacePartners(String orgId, String csvContent) {
        if (orgId == null || orgId.isBlank()) {
            throw new IllegalArgumentException("orgId cannot be null or blank");
        }
        if (csvContent == null || csvContent.isBlank()) {
            return new ImportPartnersResult(0, List.of("CSV content is empty"));
        }

        List<PartnerData> partners = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        Set<String> seenNumbers = new HashSet<>();

        String[] lines = csvContent.split("\\R", -1);
        int dataLineCount = 0;

        for (int i = 0; i < lines.length; i++) {
            String rawLine = lines[i];
            String line = rawLine.trim();

            if (i == 0) {
                if (!line.equals(CSV_HEADER)) {
                    errors.add("Line 1: invalid header. Expected " + CSV_HEADER + " but got: " + rawLine);
                }
                continue;
            }

            if (line.isEmpty()) {
                continue;
            }

            dataLineCount++;
            int lineNumber = i + 1;

            try {
                PartnerData partner = parseCsvLine(rawLine);
                String number = partner.partnerNumber();

                if (!PARTNER_NUMBER_PATTERN.matcher(number).matches()) {
                    errors.add("Line " + lineNumber + ": partner number \"" + number
                        + "\" does not match the required format P followed by 8 digits (e.g. P00000001)");
                } else if (seenNumbers.contains(number)) {
                    errors.add("Line " + lineNumber + ": duplicate partner number \"" + number + "\"");
                } else {
                    seenNumbers.add(number);
                    partners.add(partner);
                }
            } catch (IllegalArgumentException e) {
                errors.add("Line " + lineNumber + ": " + e.getMessage());
            }
        }

        if (dataLineCount == 0 && errors.isEmpty()) {
            errors.add("CSV file contains no partner data rows");
        }

        if (!errors.isEmpty()) {
            LOG.warnf("Rejecting partner import for org %s: %d error(s)", orgId, errors.size());
            return new ImportPartnersResult(0, errors);
        }

        writePartnersToFile(orgId, partners);
        reloadPartnerDataForOrg(orgId);

        LOG.infof("Replaced partners for org %s with %d partner(s)", orgId, partners.size());
        return new ImportPartnersResult(partners.size(), List.of());
    }

    /**
     * Export all partners for an organisation as CSV content.
     *
     * <p>The returned string has the same format as the import CSV: a header
     * line followed by one line per partner (including inactive ones), sorted
     * by partner number. This is suitable for downloading as a {@code .csv}
     * file that can later be re-imported via {@link #replacePartners}.</p>
     *
     * @param orgId the organisation identifier
     * @return the full CSV content, or just the header line if the
     *         organisation has no partners
     */
    public String exportPartners(String orgId) {
        if (orgId == null || orgId.isBlank()) {
            throw new IllegalArgumentException("orgId cannot be null or blank");
        }

        List<PartnerData> partners = getAllPartners(orgId);
        partners.sort(Comparator.comparing(PartnerData::partnerNumber));

        StringBuilder sb = new StringBuilder();
        sb.append(CSV_HEADER).append(System.lineSeparator());
        for (PartnerData partner : partners) {
            sb.append(formatCsvLine(partner)).append(System.lineSeparator());
        }
        return sb.toString();
    }

    /**
     * Overwrite the organisation's CSV file with the supplied partners.
     * The file is written with a header line followed by one line per partner.
     */
    private void writePartnersToFile(String orgId, List<PartnerData> partners) {
        Path filePath = getOrgFilePath(orgId);
        try {
            Files.createDirectories(filePath.getParent());

            try (BufferedWriter writer = Files.newBufferedWriter(filePath,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE)) {
                writer.write(CSV_HEADER);
                writer.newLine();
                for (PartnerData partner : partners) {
                    writer.write(formatCsvLine(partner));
                    writer.newLine();
                }
            }

            LOG.debugf("Wrote %d partners to file %s", partners.size(), filePath);
        } catch (IOException e) {
            LOG.errorf(e, "Failed to write partners to file %s", filePath);
            throw new RuntimeException("Failed to import partners: could not write to data file", e);
        }
    }

    /**
     * Compute the next available partner number, filling gaps in the sequence.
     * Partner numbers follow the format P followed by 8 digits (P00000001, etc.).
     * If P00000001 and P00000003 exist, the next number is P00000002 (gap filled).
     * If no gaps exist, the next number is max+1.
     */
    String computeNextPartnerNumber(Map<String, PartnerData> orgCache) {
        // Collect all numeric suffixes from existing partner numbers
        TreeSet<Integer> usedNumbers = new TreeSet<>();
        for (String number : orgCache.keySet()) {
            Matcher m = PARTNER_NUMBER_PATTERN.matcher(number);
            if (m.matches()) {
                usedNumbers.add(Integer.parseInt(m.group(1)));
            }
        }

        // Find the first gap starting from 1
        int expected = 1;
        for (int used : usedNumbers) {
            if (used > expected) {
                // Gap found at 'expected'
                return String.format(PARTNER_NUMBER_FORMAT, expected);
            }
            expected = used + 1;
        }

        // No gaps, use the next number after the maximum (or 1 if empty)
        return String.format(PARTNER_NUMBER_FORMAT, expected);
    }

    /**
     * Append a partner line to the organisation's CSV file.
     * Creates the file with a header if it does not exist.
     */
    private void appendPartnerToFile(String orgId, PartnerData partner) {
        Path filePath = getOrgFilePath(orgId);
        try {
            Files.createDirectories(filePath.getParent());

            boolean fileExists = Files.exists(filePath);
            String csvLine = formatCsvLine(partner);

            try (BufferedWriter writer = Files.newBufferedWriter(filePath,
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND)) {
                if (!fileExists) {
                    writer.write("\"Partner Number\",\"Name\",\"Active\"");
                    writer.newLine();
                }
                writer.write(csvLine);
                writer.newLine();
            }

            LOG.debugf("Appended partner %s to file %s", partner.partnerNumber(), filePath);
        } catch (IOException e) {
            LOG.errorf(e, "Failed to write partner %s to file %s", partner.partnerNumber(), filePath);
            throw new RuntimeException("Failed to create partner: could not write to data file", e);
        }
    }

    /**
     * Format a PartnerData as a CSV line.
     */
    String formatCsvLine(PartnerData partner) {
        // Quote fields and escape internal quotes by doubling them
        String quotedName = partner.name().replace("\"", "\"\"");
        return "\"" + partner.partnerNumber() + "\",\"" + quotedName + "\",\"" + partner.active() + "\"";
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
     * Supports the standard CSV convention of doubling quotes inside quoted
     * fields to represent a literal quote character (e.g. {@code ""} → {@code "}).
     */
    List<String> parseCsvFields(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder currentField = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);

            if (c == '"' && inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                // Doubled quote inside a quoted field → literal quote
                currentField.append('"');
                i++; // skip the next quote
            } else if (c == '"') {
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
