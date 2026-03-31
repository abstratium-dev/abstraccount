package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;

/**
 * Request DTO for creating a new entry within a transaction.
 */
public record CreateEntryRequest(
    int entryOrder,
    String accountId,
    String commodity,
    BigDecimal amount,
    String note
) {}
