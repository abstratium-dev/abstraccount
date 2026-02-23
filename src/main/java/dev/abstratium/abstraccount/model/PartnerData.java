package dev.abstratium.abstraccount.model;

/**
 * Represents partner data loaded from CSV file.
 * Immutable value object.
 */
public record PartnerData(
    String partnerNumber,
    String name,
    boolean active
) {
    public PartnerData {
        if (partnerNumber == null || partnerNumber.isBlank()) {
            throw new IllegalArgumentException("Partner number cannot be null or blank");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name cannot be null or blank");
        }
    }
}
