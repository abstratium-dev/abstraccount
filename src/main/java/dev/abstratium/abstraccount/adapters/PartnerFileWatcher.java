package dev.abstratium.abstraccount.adapters;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.nio.file.*;
import java.util.function.Consumer;

/**
 * Watches the partner data directory for changes to {@code .csv} files and
 * notifies a callback with the organisation ID (file name without extension)
 * of the changed file.
 *
 * <p>This class encapsulates all {@link WatchService} logic so that it can be
 * tested in isolation and mocked in tests that exercise
 * {@link PartnerDataAdapter}. The watcher is an
 * {@code @ApplicationScoped} bean so it can be injected (and replaced with a
 * mock) by CDI.</p>
 *
 * <p>The watcher is active by default. It can be disabled by setting the
 * configuration property {@code partner.watcher.enabled=false}, which is used
 * in tests that do not need (and do not want) asynchronous file-watching
 * interference.</p>
 */
@ApplicationScoped
public class PartnerFileWatcher {

    private static final Logger LOG = Logger.getLogger(PartnerFileWatcher.class);

    @ConfigProperty(name = "partner.data.dir")
    String partnerDataDir;

    @ConfigProperty(name = "partner.watcher.enabled", defaultValue = "true")
    boolean watcherEnabled;

    private WatchService watchService;
    private Thread watchThread;
    private volatile boolean running = false;

    private Consumer<String> changeListener;

    /**
     * Set the callback that is invoked (on the watcher thread) whenever a
     * partner CSV file changes. The callback receives the organisation ID
     * derived from the file name.
     */
    public void setChangeListener(Consumer<String> listener) {
        this.changeListener = listener;
    }

    @PostConstruct
    void init() {
        if (!watcherEnabled) {
            LOG.info("PartnerFileWatcher is disabled (partner.watcher.enabled=false)");
            return;
        }
        start();
    }

    @PreDestroy
    void cleanup() {
        stop();
    }

    /**
     * Start watching the partner data directory. Called automatically by
     * {@link #init()} when the watcher is enabled. Public so tests can start
     * the watcher explicitly after configuring the listener.
     */
    public void start() {
        if (running) {
            return;
        }
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
     * Stop watching and release resources.
     */
    public void stop() {
        running = false;

        if (watchThread != null) {
            watchThread.interrupt();
            try {
                watchThread.join(5000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            watchThread = null;
        }

        if (watchService != null) {
            try {
                watchService.close();
            } catch (IOException e) {
                LOG.error("Error closing watch service", e);
            }
            watchService = null;
        }
    }

    /**
     * Whether the watcher is currently running.
     */
    public boolean isRunning() {
        return running;
    }

    /**
     * Main loop of the watcher thread.
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

                    if (changeListener != null) {
                        changeListener.accept(orgId);
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
