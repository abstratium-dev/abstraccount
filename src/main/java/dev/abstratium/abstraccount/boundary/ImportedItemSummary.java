package dev.abstratium.abstraccount.boundary;

import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * Summary of one successfully imported item.
 */
@RegisterForReflection
public record ImportedItemSummary(
    String originalName,
    String finalName,
    String id
) {
}
