package dev.abstratium.abstraccount.boundary;

/**
 * Request DTO for creating a new year journal.
 *
 * @param sourceJournalId          the ID of the journal to copy accounts from
 * @param newJournalTitle          the title for the new journal (defaults to source journal title if not provided)
 * @param openingDate              the date for opening balance transactions (typically January 1 of new year)
 * @param retainedEarningsCodePath code path of the retained earnings account (e.g. "2:290:2970")
 * @param annualProfitLossCodePath code path of the annual profit/loss account (e.g. "2:290:2979")
 */
public record NewYearRequestDTO(
    String sourceJournalId,
    String newJournalTitle,
    String openingDate,
    String retainedEarningsCodePath,
    String annualProfitLossCodePath
) {}
