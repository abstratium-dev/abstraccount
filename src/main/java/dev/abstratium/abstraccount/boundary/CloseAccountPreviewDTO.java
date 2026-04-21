package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;

/**
 * Preview of a single closing entry that will be created.
 */
public record CloseAccountPreviewDTO(
    String accountId,
    String accountCodePath,
    String accountFullName,
    BigDecimal balance,
    String commodity
) {}
