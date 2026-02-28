package dev.abstratium.abstraccount.boundary;

/**
 * DTO for Macro Parameter.
 */
public record MacroParameterDTO(
    String name,
    String type,
    String prompt,
    String defaultValue,
    boolean required,
    String filter
) {}
