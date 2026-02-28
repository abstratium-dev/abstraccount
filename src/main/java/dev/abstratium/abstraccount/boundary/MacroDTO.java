package dev.abstratium.abstraccount.boundary;

import java.util.List;

/**
 * DTO for Macro.
 */
public record MacroDTO(
    String id,
    String journalId,
    String name,
    String description,
    List<MacroParameterDTO> parameters,
    String template,
    MacroValidationDTO validation,
    String notes,
    String createdDate,
    String modifiedDate
) {}
