package dev.abstratium.abstraccount.boundary;

/**
 * DTO for partner data exposed to the UI.
 */
public record PartnerDTO(
    String partnerNumber,
    String name
) {
}
