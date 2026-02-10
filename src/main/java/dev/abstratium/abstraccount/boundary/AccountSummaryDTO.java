package dev.abstratium.abstraccount.boundary;

/**
 * DTO for account summary information in REST responses.
 */
public record AccountSummaryDTO(
    String accountNumber,
    String accountName,
    String accountType,
    String note
) {
}
