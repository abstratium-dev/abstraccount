package dev.abstratium.abstraccount.boundary;

/**
 * DTO for updating an existing account.
 */
public record UpdateAccountRequestDTO(
    String name,
    String type,
    String note,
    String parentAccountId,
    Integer accountOrder
) {
}
