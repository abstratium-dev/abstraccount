package dev.abstratium.abstraccount.model;

import java.util.List;

/**
 * Result of creating a partner.
 *
 * <p>Contains the created partner (with its assigned partner number) and a list
 * of warnings encountered during creation (e.g. duplicate partner names that
 * were skipped).</p>
 */
public record CreatePartnerResult(
    PartnerData partner,
    List<String> warnings
) {
    public CreatePartnerResult {
        if (partner == null) {
            throw new IllegalArgumentException("partner cannot be null");
        }
        warnings = warnings == null ? List.of() : List.copyOf(warnings);
    }
}
