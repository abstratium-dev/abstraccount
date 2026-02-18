package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;

import dev.abstratium.abstraccount.model.TransactionStatus;

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
    BigDecimal runningBalance,
    String note,
    String accountId,
    String partnerId,
    TransactionStatus status
) {
}
