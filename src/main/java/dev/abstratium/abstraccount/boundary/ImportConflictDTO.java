package dev.abstratium.abstraccount.boundary;

import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * DTO describing a single import conflict caused by a duplicate name.
 */
@RegisterForReflection
public record ImportConflictDTO(
    String existingId,
    String name,
    String artefactType
) {
}
