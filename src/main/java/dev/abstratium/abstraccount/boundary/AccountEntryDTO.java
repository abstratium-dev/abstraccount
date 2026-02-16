package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;

/**
 * DTO for account entry with transaction details.
 */
public record AccountEntryDTO(
    String entryId,
    String transactionId,
    String transactionDate,
    String description,
    String commodity,
    BigDecimal amount,
    BigDecimal runningBalance
) {
}
