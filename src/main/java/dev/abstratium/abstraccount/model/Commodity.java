package dev.abstratium.abstraccount.model;

import java.math.BigDecimal;

/**
 * Represents a currency or commodity declaration with display formatting rules.
 * 
 * Example: commodity CHF 1000.00
 * This declares CHF with 2 decimal places precision.
 */
public record Commodity(
    String code,
    BigDecimal displayPrecision
) {
    public Commodity {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Commodity code cannot be null or blank");
        }
        if (displayPrecision == null) {
            throw new IllegalArgumentException("Display precision cannot be null");
        }
    }
    
    /**
     * Gets the number of decimal places from the display precision.
     * For example, 1000.00 returns 2, 1000.000 returns 3.
     */
    public int getDecimalPlaces() {
        return displayPrecision.scale();
    }
}
