package dev.abstratium.abstraccount.model;

import java.util.List;

/**
 * Result of replacing all partners for an organisation from an imported CSV file.
 *
 * <p>Contains the number of partners that were imported and a list of validation
 * errors encountered while parsing the file. When {@code errors} is non-empty the
 * import is aborted and the existing file is left untouched.</p>
 */
public record ImportPartnersResult(
    int importedCount,
    List<String> errors
) {
    public ImportPartnersResult {
        errors = errors == null ? List.of() : List.copyOf(errors);
    }

    /**
     * Whether the import is valid (no validation errors) and may be applied.
     */
    public boolean isValid() {
        return errors.isEmpty();
    }
}
