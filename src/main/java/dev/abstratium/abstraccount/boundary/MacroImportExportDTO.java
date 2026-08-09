package dev.abstratium.abstraccount.boundary;

import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * DTO used for YAML import/export of a single macro.
 * Omits database-specific fields (id, createdDate, modifiedDate) so that
 * exported files are portable between organisations and journals.
 */
@RegisterForReflection
public record MacroImportExportDTO(
    String name,
    String description,
    String parameters,
    String template,
    String validation,
    String notes
) {
}
