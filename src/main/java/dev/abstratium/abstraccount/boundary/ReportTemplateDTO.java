package dev.abstratium.abstraccount.boundary;

/**
 * DTO for report template.
 */
public record ReportTemplateDTO(
    String id,
    String name,
    String description,
    String templateType,
    String templateContent
) {
}
