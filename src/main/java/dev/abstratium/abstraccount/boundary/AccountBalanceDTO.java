package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;
import java.util.Map;

/**
 * DTO for account balance information in REST responses.
 */
public record AccountBalanceDTO(
    String accountNumber,
    String accountName,
    String accountType,
    Map<String, BigDecimal> balances
) {
}
