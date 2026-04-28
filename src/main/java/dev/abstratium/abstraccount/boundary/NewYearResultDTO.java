package dev.abstratium.abstraccount.boundary;

/**
 * Result of executing the new year journal creation operation.
 *
 * @param newJournalId             the ID of the newly created journal
 * @param newJournalTitle          the title of the newly created journal
 * @param accountCount             number of accounts copied
 * @param openingBalanceCount      number of opening balance transactions created
 * @param retainedEarningsTransferId ID of the retained earnings transfer transaction (if created)
 */
public record NewYearResultDTO(
    String newJournalId,
    String newJournalTitle,
    int accountCount,
    int openingBalanceCount,
    String retainedEarningsTransferId
) {}
