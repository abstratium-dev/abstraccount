package dev.abstratium.abstraccount.boundary;

import java.util.List;

/**
 * DTO for Macro.
 * Macros are independent of journals and can be used across all journals.
 */
public record MacroDTO(
    String id,
    String name,
    String description,
    List<MacroParameterDTO> parameters,
    String template,
    MacroValidationDTO validation,
    String notes,
    boolean machineRunnable,
    String createdDate,
    String modifiedDate
) {}
