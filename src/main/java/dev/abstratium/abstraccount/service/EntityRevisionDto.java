package dev.abstratium.abstraccount.service;

/**
 * DTO representing one Envers revision of a single entity.
 */
public record EntityRevisionDto(
    Long rev,
    Long revtstmp,
    String username,
    String revisionType
) {
}
