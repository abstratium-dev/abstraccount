package dev.abstratium.abstraccount.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import dev.abstratium.abstraccount.boundary.ImportConflictDTO;
import dev.abstratium.abstraccount.boundary.ImportResult;
import dev.abstratium.abstraccount.boundary.ImportedItemSummary;
import dev.abstratium.abstraccount.boundary.MacroImportExportDTO;
import dev.abstratium.abstraccount.boundary.MacroImportExportWrapperDTO;
import dev.abstratium.abstraccount.entity.MacroEntity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Service for importing and exporting macros in YAML format.
 */
@ApplicationScoped
public class MacroImportExportService {

    private static final Logger LOG = Logger.getLogger(MacroImportExportService.class);
    private static final String ARTEFACT_TYPE = "macros";
    private static final String EXPORT_VERSION = "1.0";

    @PersistenceContext
    EntityManager em;

    @Inject
    ObjectMapper jsonMapper;

    private final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());

    /**
     * Exports all macros for the current organisation as YAML.
     */
    @Transactional
    public String exportMacros() {
        LOG.debug("Exporting macros");

        List<MacroEntity> macros = em.createQuery(
                "SELECT m FROM MacroEntity m ORDER BY m.name",
                MacroEntity.class
            )
            .getResultList();

        List<MacroImportExportDTO> items = new ArrayList<>();
        for (MacroEntity macro : macros) {
            items.add(new MacroImportExportDTO(
                macro.getName(),
                macro.getDescription(),
                macro.getParameters(),
                macro.getTemplate(),
                macro.getValidation(),
                macro.getNotes(),
                macro.isMachineRunnable()
            ));
        }

        MacroImportExportWrapperDTO wrapper = new MacroImportExportWrapperDTO(
            EXPORT_VERSION,
            ARTEFACT_TYPE,
            items
        );

        try {
            return yamlMapper.writeValueAsString(wrapper);
        } catch (IOException e) {
            LOG.error("Failed to serialize macros to YAML", e);
            throw new IllegalStateException("Failed to serialize macros to YAML", e);
        }
    }

    /**
     * Imports macros from YAML content.
     *
     * @param yamlContent the YAML file content
     * @param replaceIds optional list of existing macro IDs to replace
     * @param autoRename if true, duplicate names not covered by {@code replaceIds}
     *                   are imported with a counter suffix instead of returning conflicts
     * @return import result; if conflicts are present and {@code autoRename} is false,
     *         nothing was persisted
     */
    @Transactional
    public ImportResult importMacros(String yamlContent, List<String> replaceIds, boolean autoRename) {
        LOG.infof("Importing macros, replaceIds=%s, autoRename=%s", replaceIds, autoRename);

        MacroImportExportWrapperDTO wrapper;
        try {
            wrapper = yamlMapper.readValue(yamlContent, MacroImportExportWrapperDTO.class);
        } catch (IOException e) {
            LOG.errorf(e, "Failed to parse macro YAML");
            throw new IllegalArgumentException("Failed to parse YAML: " + e.getMessage(), e);
        }

        if (wrapper == null) {
            throw new IllegalArgumentException("Import file is empty");
        }
        if (!ARTEFACT_TYPE.equals(wrapper.artefactType())) {
            throw new IllegalArgumentException(
                "Expected artefact_type '" + ARTEFACT_TYPE + "', got '" + wrapper.artefactType() + "'"
            );
        }
        if (wrapper.items() == null || wrapper.items().isEmpty()) {
            throw new IllegalArgumentException("No macros found in import file");
        }

        List<MacroImportExportDTO> trimmedItems = new ArrayList<>(wrapper.items().size());
        for (MacroImportExportDTO macro : wrapper.items()) {
            trimmedItems.add(new MacroImportExportDTO(
                macro.name() != null ? macro.name().trim() : null,
                macro.description() != null ? macro.description().trim() : null,
                macro.parameters(),
                macro.template(),
                macro.validation(),
                macro.notes(),
                macro.machineRunnable()
            ));
        }

        for (MacroImportExportDTO macro : trimmedItems) {
            validateMacro(macro);
        }

        List<MacroEntity> existingMacros = em.createQuery(
                "SELECT m FROM MacroEntity m ORDER BY m.name",
                MacroEntity.class
            )
            .getResultList();
        Set<String> usedNames = new HashSet<>();
        for (MacroEntity existing : existingMacros) {
            usedNames.add(existing.getName());
        }

        Set<String> replaceIdSet = replaceIds == null ? Set.of() : new HashSet<>(replaceIds);

        List<ImportConflictDTO> conflicts = new ArrayList<>();
        Set<String> conflictNames = new HashSet<>();
        for (MacroImportExportDTO macro : trimmedItems) {
            if (usedNames.contains(macro.name()) && !replaceIdSetRemovesName(macro.name(), existingMacros, replaceIdSet)) {
                if (autoRename) {
                    continue;
                }
                MacroEntity existing = findByName(existingMacros, macro.name());
                if (existing != null && conflictNames.add(macro.name())) {
                    conflicts.add(new ImportConflictDTO(existing.getId(), macro.name(), "macro"));
                }
            }
        }

        if (!conflicts.isEmpty()) {
            LOG.infof("Detected %d macro import conflicts", conflicts.size());
            return new ImportResult(conflicts, List.of());
        }

        // Remove replaced macros from the used-name set and from the database.
        for (String replaceId : replaceIdSet) {
            MacroEntity toDelete = em.find(MacroEntity.class, replaceId);
            if (toDelete != null) {
                usedNames.remove(toDelete.getName());
                em.remove(toDelete);
            }
        }

        List<ImportedItemSummary> imported = new ArrayList<>();
        for (MacroImportExportDTO macro : trimmedItems) {
            String finalName = findUniqueName(macro.name(), usedNames);

            MacroEntity entity = new MacroEntity();
            entity.setName(finalName);
            entity.setDescription(macro.description());
            entity.setParameters(macro.parameters());
            entity.setTemplate(macro.template());
            entity.setValidation(macro.validation());
            entity.setNotes(macro.notes());
            entity.setMachineRunnable(macro.machineRunnable());

            em.persist(entity);
            imported.add(new ImportedItemSummary(macro.name(), finalName, entity.getId()));
            usedNames.add(finalName);
        }

        LOG.infof("Successfully imported %d macros", imported.size());
        return new ImportResult(List.of(), imported);
    }

    private boolean replaceIdSetRemovesName(String name, List<MacroEntity> existingMacros, Set<String> replaceIdSet) {
        for (MacroEntity existing : existingMacros) {
            if (existing.getName().equals(name) && replaceIdSet.contains(existing.getId())) {
                return true;
            }
        }
        return false;
    }

    private MacroEntity findByName(List<MacroEntity> macros, String name) {
        for (MacroEntity macro : macros) {
            if (macro.getName().equals(name)) {
                return macro;
            }
        }
        return null;
    }

    private String findUniqueName(String baseName, Set<String> usedNames) {
        if (!usedNames.contains(baseName)) {
            return baseName;
        }
        int counter = 1;
        while (true) {
            String candidate = baseName + " (" + counter + ")";
            if (!usedNames.contains(candidate)) {
                return candidate;
            }
            counter++;
        }
    }

    private void validateMacro(MacroImportExportDTO macro) {
        if (macro.name() == null || macro.name().isBlank()) {
            throw new IllegalArgumentException("Macro name is required");
        }
        if (macro.description() == null || macro.description().isBlank()) {
            throw new IllegalArgumentException("Macro description is required for macro: " + macro.name());
        }
        if (macro.parameters() == null || macro.parameters().isBlank()) {
            throw new IllegalArgumentException("Macro parameters are required for macro: " + macro.name());
        }
        if (macro.template() == null || macro.template().isBlank()) {
            throw new IllegalArgumentException("Macro template is required for macro: " + macro.name());
        }

        validateJson("parameters", macro.parameters(), macro.name());
        if (macro.validation() != null && !macro.validation().isBlank()) {
            validateJson("validation", macro.validation(), macro.name());
        }
    }

    private void validateJson(String fieldName, String json, String macroName) {
        try {
            jsonMapper.readTree(json);
        } catch (Exception e) {
            throw new IllegalArgumentException(
                "Invalid JSON in " + fieldName + " for macro " + macroName + ": " + e.getMessage(),
                e
            );
        }
    }
}
