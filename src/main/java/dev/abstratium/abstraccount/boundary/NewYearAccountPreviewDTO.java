package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;

/**
 * Preview of a single account that will be created in the new journal
 * with its opening balance.
 *
 * @param accountId        the ID of the account in the source journal
 * @param accountCodePath  the hierarchical code path (e.g. "1:10:100:1020")
 * @param accountFullName  the full colon-separated account name
 * @param openingBalance   the balance to set as opening balance
 * @param commodity        the commodity code (e.g. "CHF")
 */
public record NewYearAccountPreviewDTO(
    String accountId,
    String accountCodePath,
    String accountFullName,
    BigDecimal openingBalance,
    String commodity
) {}
