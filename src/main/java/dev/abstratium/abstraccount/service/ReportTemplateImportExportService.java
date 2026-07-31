package dev.abstratium.abstraccount.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import dev.abstratium.abstraccount.boundary.ImportConflictDTO;
import dev.abstratium.abstraccount.boundary.ImportResult;
import dev.abstratium.abstraccount.boundary.ImportedItemSummary;
import dev.abstratium.abstraccount.boundary.ReportTemplateImportExportDTO;
import dev.abstratium.abstraccount.boundary.ReportTemplateImportExportWrapperDTO;
import dev.abstratium.abstraccount.entity.ReportTemplateEntity;
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
 * Service for importing and exporting report templates in YAML format.
 */
@ApplicationScoped
public class ReportTemplateImportExportService {

    private static final Logger LOG = Logger.getLogger(ReportTemplateImportExportService.class);
    private static final String ARTEFACT_TYPE = "report_templates";
    private static final String EXPORT_VERSION = "1.0";

    @PersistenceContext
    EntityManager em;

    @Inject
    ObjectMapper jsonMapper;

    private final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());

    /**
     * Exports all report templates for the current organisation as YAML.
     */
    @Transactional
    public String exportReportTemplates() {
        LOG.debug("Exporting report templates");

        List<ReportTemplateEntity> templates = em.createQuery(
                "SELECT rt FROM ReportTemplateEntity rt ORDER BY rt.name",
                ReportTemplateEntity.class
            )
            .getResultList();

        List<ReportTemplateImportExportDTO> items = new ArrayList<>();
        for (ReportTemplateEntity template : templates) {
            items.add(new ReportTemplateImportExportDTO(
                template.getName(),
                template.getDescription(),
                template.getTemplateContent()
            ));
        }

        ReportTemplateImportExportWrapperDTO wrapper = new ReportTemplateImportExportWrapperDTO(
            EXPORT_VERSION,
            ARTEFACT_TYPE,
            items
        );

        try {
            return yamlMapper.writeValueAsString(wrapper);
        } catch (IOException e) {
            LOG.error("Failed to serialize report templates to YAML", e);
            throw new IllegalStateException("Failed to serialize report templates to YAML", e);
        }
    }

    /**
     * Imports report templates from YAML content.
     *
     * @param yamlContent the YAML file content
     * @param replaceIds optional list of existing report template IDs to replace
     * @param autoRename if true, duplicate names not covered by {@code replaceIds}
     *                   are imported with a counter suffix instead of returning conflicts
     * @return import result; if conflicts are present and {@code autoRename} is false,
     *         nothing was persisted
     */
    @Transactional
    public ImportResult importReportTemplates(String yamlContent, List<String> replaceIds, boolean autoRename) {
        LOG.infof("Importing report templates, replaceIds=%s, autoRename=%s", replaceIds, autoRename);

        ReportTemplateImportExportWrapperDTO wrapper;
        try {
            wrapper = yamlMapper.readValue(yamlContent, ReportTemplateImportExportWrapperDTO.class);
        } catch (IOException e) {
            LOG.errorf(e, "Failed to parse report template YAML");
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
            throw new IllegalArgumentException("No report templates found in import file");
        }

        List<ReportTemplateImportExportDTO> trimmedItems = new ArrayList<>(wrapper.items().size());
        for (ReportTemplateImportExportDTO template : wrapper.items()) {
            trimmedItems.add(new ReportTemplateImportExportDTO(
                template.name() != null ? template.name().trim() : null,
                template.description() != null ? template.description().trim() : null,
                template.templateContent()
            ));
        }

        for (ReportTemplateImportExportDTO template : trimmedItems) {
            validateReportTemplate(template);
        }

        List<ReportTemplateEntity> existingTemplates = em.createQuery(
                "SELECT rt FROM ReportTemplateEntity rt ORDER BY rt.name",
                ReportTemplateEntity.class
            )
            .getResultList();
        Set<String> usedNames = new HashSet<>();
        for (ReportTemplateEntity existing : existingTemplates) {
            usedNames.add(existing.getName());
        }

        Set<String> replaceIdSet = replaceIds == null ? Set.of() : new HashSet<>(replaceIds);

        List<ImportConflictDTO> conflicts = new ArrayList<>();
        Set<String> conflictNames = new HashSet<>();
        for (ReportTemplateImportExportDTO template : trimmedItems) {
            if (usedNames.contains(template.name()) && !replaceIdSetRemovesName(template.name(), existingTemplates, replaceIdSet)) {
                if (autoRename) {
                    continue;
                }
                ReportTemplateEntity existing = findByName(existingTemplates, template.name());
                if (existing != null && conflictNames.add(template.name())) {
                    conflicts.add(new ImportConflictDTO(existing.getId(), template.name(), "report_template"));
                }
            }
        }

        if (!conflicts.isEmpty()) {
            LOG.infof("Detected %d report template import conflicts", conflicts.size());
            return new ImportResult(conflicts, List.of());
        }

        // Remove replaced templates from the used-name set and from the database.
        for (String replaceId : replaceIdSet) {
            ReportTemplateEntity toDelete = em.find(ReportTemplateEntity.class, replaceId);
            if (toDelete != null) {
                usedNames.remove(toDelete.getName());
                em.remove(toDelete);
            }
        }

        List<ImportedItemSummary> imported = new ArrayList<>();
        for (ReportTemplateImportExportDTO template : trimmedItems) {
            String finalName = findUniqueName(template.name(), usedNames);

            ReportTemplateEntity entity = new ReportTemplateEntity();
            entity.setName(finalName);
            entity.setDescription(template.description());
            entity.setTemplateContent(template.templateContent());

            em.persist(entity);
            imported.add(new ImportedItemSummary(template.name(), finalName, entity.getId()));
            usedNames.add(finalName);
        }

        LOG.infof("Successfully imported %d report templates", imported.size());
        return new ImportResult(List.of(), imported);
    }

    private boolean replaceIdSetRemovesName(String name, List<ReportTemplateEntity> existingTemplates, Set<String> replaceIdSet) {
        for (ReportTemplateEntity existing : existingTemplates) {
            if (existing.getName().equals(name) && replaceIdSet.contains(existing.getId())) {
                return true;
            }
        }
        return false;
    }

    private ReportTemplateEntity findByName(List<ReportTemplateEntity> templates, String name) {
        for (ReportTemplateEntity template : templates) {
            if (template.getName().equals(name)) {
                return template;
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

    private void validateReportTemplate(ReportTemplateImportExportDTO template) {
        if (template.name() == null || template.name().isBlank()) {
            throw new IllegalArgumentException("Report template name is required");
        }
        if (template.templateContent() == null || template.templateContent().isBlank()) {
            throw new IllegalArgumentException("Report template content is required for template: " + template.name());
        }

        validateJson("template_content", template.templateContent(), template.name());
    }

    private void validateJson(String fieldName, String json, String templateName) {
        try {
            jsonMapper.readTree(json);
        } catch (Exception e) {
            throw new IllegalArgumentException(
                "Invalid JSON in " + fieldName + " for template " + templateName + ": " + e.getMessage(),
                e
            );
        }
    }
}
