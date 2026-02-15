package dev.abstratium.abstraccount.boundary;

import java.util.Map;

/**
 * DTO for journal metadata (without accounts or transactions).
 */
public record JournalDTO(
    String id,
    String title,
    String subtitle,
    String currency,
    Map<String, String> commodities
) {}
