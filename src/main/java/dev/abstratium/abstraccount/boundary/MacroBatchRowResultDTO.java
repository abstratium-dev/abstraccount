package dev.abstratium.abstraccount.boundary;

/**
 * Result of executing a macro for a single row of a batch.
 * Exactly one of {@code transactionId} or {@code error} is set, depending on {@code success}.
 */
public record MacroBatchRowResultDTO(
    int row,
    boolean success,
    String transactionId,
    String error
) {}
