package dev.abstratium.abstraccount.boundary;

import io.quarkus.runtime.annotations.RegisterForReflection;

import java.util.List;

/**
 * Result of an import operation.
 * If {@link #conflicts()} is non-empty, no items were imported and the caller
 * must resolve the conflicts first.
 */
@RegisterForReflection
public record ImportResult(
    List<ImportConflictDTO> conflicts,
    List<ImportedItemSummary> importedItems
) {
}
