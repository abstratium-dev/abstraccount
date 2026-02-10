package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for posting information in REST responses.
 * Flattened view combining transaction and posting details for easy display.
 */
public record PostingDTO(
    LocalDate transactionDate,
    String transactionStatus,
    String transactionDescription,
    String transactionId,
    String accountNumber,
    String accountName,
    String accountType,
    String commodity,
    BigDecimal amount,
    BigDecimal runningBalance
) {
}
