package dev.abstratium.abstraccount.boundary;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * DTO used for YAML import/export of a single report template.
 * Omits database-specific fields (id, createdAt, updatedAt) so that
 * exported files are portable between organisations.
 */
@RegisterForReflection
public record ReportTemplateImportExportDTO(
    String name,
    String description,

    @JsonProperty("template_content")
    String templateContent
) {
}
