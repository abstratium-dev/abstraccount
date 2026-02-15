package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;

/**
 * DTO for Entry entity with account details.
 */
public record EntryDTO(
    String id,
    int entryOrder,
    String accountId,
    String accountName,
    String accountType,
    String commodity,
    BigDecimal amount,
    String note
) {}
