package dev.abstratium.abstraccount.boundary;

/**
 * DTO for creating a new account.
 */
public record CreateAccountRequestDTO(
    String name,
    String type,
    String note,
    String parentAccountId,
    String journalId,
    Integer accountOrder
) {
}
