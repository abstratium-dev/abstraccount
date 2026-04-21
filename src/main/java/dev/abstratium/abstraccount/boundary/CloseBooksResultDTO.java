package dev.abstratium.abstraccount.boundary;

import java.util.List;

/**
 * Result of a close-books execution: list of created transaction IDs.
 */
public record CloseBooksResultDTO(
    List<String> transactionIds,
    int transactionCount
) {}
