package dev.abstratium.abstraccount.boundary;

import java.util.List;

/**
 * DTO for the response of creating a partner.
 *
 * <p>Contains the created partner (or the existing duplicate) and a list of
 * warnings to display to the user (e.g. duplicate name skipped).</p>
 */
public record CreatePartnerResponseDTO(
    String partnerNumber,
    String name,
    List<String> warnings
) {
}
