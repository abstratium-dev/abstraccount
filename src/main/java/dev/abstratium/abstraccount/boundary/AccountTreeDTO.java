package dev.abstratium.abstraccount.boundary;

import java.util.List;

/**
 * DTO for account tree structure in REST responses.
 * Represents a hierarchical tree of accounts.
 */
public record AccountTreeDTO(
    String id,
    String name,
    String type,
    String note,
    String parentId,
    List<AccountTreeDTO> children
) {
}
