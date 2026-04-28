package dev.abstratium.abstraccount.boundary;

import java.util.List;

/**
 * Preview of the new year journal creation operation.
 *
 * @param sourceJournalId            the ID of the source journal
 * @param sourceJournalTitle         the title of the source journal
 * @param newJournalTitle            the title for the new journal
 * @param openingDate                the date for opening balance transactions
 * @param retainedEarningsCodePath   code path of the retained earnings account (e.g., "2:290:2970")
 * @param retainedEarningsFullName   full name of the retained earnings account
 * @param annualProfitLossCodePath   code path of the annual profit/loss account (e.g., "2:290:2979")
 * @param annualProfitLossFullName   full name of the annual profit/loss account
 * @param accounts                   list of accounts that will be created with their opening balances
 * @param accountCount               total number of accounts to be created
 * @param openingBalanceCount        number of opening balance transactions to be created
 */
public record NewYearPreviewDTO(
    String sourceJournalId,
    String sourceJournalTitle,
    String newJournalTitle,
    String openingDate,
    String retainedEarningsCodePath,
    String retainedEarningsFullName,
    String annualProfitLossCodePath,
    String annualProfitLossFullName,
    List<NewYearAccountPreviewDTO> accounts,
    int accountCount,
    int openingBalanceCount
) {}
