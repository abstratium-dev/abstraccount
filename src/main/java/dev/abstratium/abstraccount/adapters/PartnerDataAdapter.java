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
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Adapter for loading and watching partner data from a CSV file.
 * Caches partner data in memory and automatically reloads when the file changes.
 * Thread-safe with read-write locking.
 */
@ApplicationScoped
@Startup
public class PartnerDataAdapter {

    private static final Logger LOG = Logger.getLogger(PartnerDataAdapter.class);

    @ConfigProperty(name = "partner.data.file.path")
    String partnerDataFilePath;

    private final Map<String, PartnerData> partnerCache = new ConcurrentHashMap<>();
    private final ReadWriteLock cacheLock = new ReentrantReadWriteLock();
    
    private WatchService watchService;
    private Thread watchThread;
    private volatile boolean running = false;

    @PostConstruct
    void init() {
        LOG.info("Initializing PartnerDataAdapter with file: " + partnerDataFilePath);
        
        // Load initial data
        loadPartnerData();
        
        // Start file watcher
        startFileWatcher();
    }

    @PreDestroy
    void cleanup() {
        LOG.info("Shutting down PartnerDataAdapter");
        stopFileWatcher();
    }

    /**
     * Get partner data by partner number.
     * Thread-safe read access with read lock.
     */
    public Optional<PartnerData> getPartner(String partnerNumber) {
        cacheLock.readLock().lock();
        try {
            return Optional.ofNullable(partnerCache.get(partnerNumber));
        } finally {
            cacheLock.readLock().unlock();
        }
    }

    /**
     * Get all partner data.
     * Thread-safe read access with read lock.
     */
    public List<PartnerData> getAllPartners() {
        cacheLock.readLock().lock();
        try {
            return new ArrayList<>(partnerCache.values());
        } finally {
            cacheLock.readLock().unlock();
        }
    }

    /**
     * Load partner data from CSV file.
     * Thread-safe write access with write lock.
     */
    void loadPartnerData() {
        Path filePath = Paths.get(partnerDataFilePath);
        
        if (!Files.exists(filePath)) {
            LOG.warn("Partner data file does not exist: " + partnerDataFilePath);
            return;
        }

        cacheLock.writeLock().lock();
        try {
            LOG.info("Loading partner data from: " + partnerDataFilePath);
            
            // Clear existing cache
            partnerCache.clear();
            
            // Read and parse CSV file
            try (BufferedReader reader = Files.newBufferedReader(filePath)) {
                String line;
                boolean isFirstLine = true;
                int lineNumber = 0;
                
                while ((line = reader.readLine()) != null) {
                    lineNumber++;
                    
                    // Skip header line
                    if (isFirstLine) {
                        isFirstLine = false;
                        continue;
                    }
                    
                    // Skip empty lines
                    if (line.trim().isEmpty()) {
                        continue;
                    }
                    
                    try {
                        PartnerData partner = parseCsvLine(line);
                        partnerCache.put(partner.partnerNumber(), partner);
                    } catch (Exception e) {
                        LOG.error("Error parsing line " + lineNumber + ": " + line, e);
                    }
                }
                
                LOG.info("Loaded " + partnerCache.size() + " partners from file");
            } catch (IOException e) {
                LOG.error("Error reading partner data file: " + partnerDataFilePath, e);
            }
        } finally {
            cacheLock.writeLock().unlock();
        }
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
     * Start watching the partner data file for changes.
     */
    void startFileWatcher() {
        try {
            Path filePath = Paths.get(partnerDataFilePath);
            Path directory = filePath.getParent();
            
            if (directory == null) {
                directory = Paths.get(".");
            }
            
            // Create directory if it doesn't exist
            if (!Files.exists(directory)) {
                Files.createDirectories(directory);
                LOG.info("Created directory: " + directory);
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
     * Stop watching the partner data file.
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
     * Watch for file changes and reload data when the file is modified.
     */
    void watchForChanges() {
        Path fileName = Paths.get(partnerDataFilePath).getFileName();
        
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
                    
                    // Check if the changed file is our partner data file
                    if (changedFile.equals(fileName)) {
                        LOG.info("Partner data file changed, reloading: " + changedFile);
                        
                        // Small delay to ensure file write is complete
                        Thread.sleep(100);
                        
                        loadPartnerData();
                    }
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
}
