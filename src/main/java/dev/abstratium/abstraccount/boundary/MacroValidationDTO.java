package dev.abstratium.abstraccount.boundary;

/**
 * DTO for Macro Validation.
 */
public record MacroValidationDTO(
    boolean balanceCheck,
    Integer minPostings
) {}
