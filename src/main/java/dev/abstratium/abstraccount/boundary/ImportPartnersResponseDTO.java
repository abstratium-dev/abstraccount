package dev.abstratium.abstraccount.boundary;

import io.quarkus.runtime.annotations.RegisterForReflection;

import java.util.List;

/**
 * DTO for the response of importing (replacing) partners from a CSV file.
 *
 * <p>Contains the number of partners imported and a list of validation errors.
 * When {@code errors} is non-empty the import was rejected and the existing
 * partner file was left unchanged.</p>
 */
@RegisterForReflection
public record ImportPartnersResponseDTO(
    int importedCount,
    List<String> errors
) {
}
