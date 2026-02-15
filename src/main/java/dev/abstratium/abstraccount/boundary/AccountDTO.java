package dev.abstratium.abstraccount.boundary;

/**
 * DTO for account summary information in REST responses.
 */
public record AccountDTO(
    String name,
    String type,
    String note
) {
}
