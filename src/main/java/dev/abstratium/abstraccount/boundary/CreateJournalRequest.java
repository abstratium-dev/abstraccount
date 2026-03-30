package dev.abstratium.abstraccount.boundary;

import java.util.Map;

/**
 * DTO for creating a new journal.
 * Contains the minimal required fields to create a journal.
 */
public record CreateJournalRequest(
    String logo,
    String title,
    String subtitle,
    String currency,
    Map<String, String> commodities
) {
    public CreateJournalRequest {
        if (currency == null || currency.isBlank()) {
            throw new IllegalArgumentException("Currency is required");
        }
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }
    }
}
