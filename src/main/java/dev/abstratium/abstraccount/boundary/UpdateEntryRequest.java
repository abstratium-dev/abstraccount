package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;

/**
 * Request DTO for updating an entry within a transaction.
 * If id is null, a new entry will be created.
 */
public record UpdateEntryRequest(
    String id,
    int entryOrder,
    String accountId,
    String commodity,
    BigDecimal amount,
    String note
) {}
