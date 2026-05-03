package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;

/**
 * KPI summary for a journal, showing balance-sheet totals
 * (excluding any transactions tagged with "Closing").
 *
 * @param totalAssets      sum of all ASSET and CASH account balances (positive = assets held)
 * @param totalLiabilities sum of all LIABILITY account balances (positive = liabilities owed)
 * @param totalEquity      sum of all EQUITY account balances (positive = equity)
 * @param totalRevenue     sum of all REVENUE account balances
 * @param totalExpenses    sum of all EXPENSE account balances
 * @param currency         the journal's primary currency
 */
public record JournalKpiDTO(
    BigDecimal totalAssets,
    BigDecimal totalLiabilities,
    BigDecimal totalEquity,
    BigDecimal totalRevenue,
    BigDecimal totalExpenses,
    String currency
) {}
