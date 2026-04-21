package dev.abstratium.abstraccount.boundary;

/**
 * Request DTO for both preview and execute close-books operations.
 */
public record CloseBooksRequestDTO(
    String journalId,
    String closingDate,
    String equityAccountCodePath
) {}
