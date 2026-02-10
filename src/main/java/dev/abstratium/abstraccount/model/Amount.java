package dev.abstratium.abstraccount.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

/**
 * Represents a monetary amount with its commodity/currency.
 * Uses BigDecimal to avoid floating-point precision errors.
 */
public record Amount(
    @JsonProperty("commodity") String commodity,
    @JsonProperty("quantity") BigDecimal quantity
) {
    public Amount {
        if (commodity == null || commodity.isBlank()) {
            throw new IllegalArgumentException("Commodity cannot be null or blank");
        }
        if (quantity == null) {
            throw new IllegalArgumentException("Quantity cannot be null");
        }
    }
    
    /**
     * Creates an amount with the given commodity and quantity.
     */
    public static Amount of(String commodity, BigDecimal quantity) {
        return new Amount(commodity, quantity);
    }
    
    /**
     * Creates an amount with the given commodity and quantity from a string.
     */
    public static Amount of(String commodity, String quantity) {
        return new Amount(commodity, new BigDecimal(quantity));
    }
    
    /**
     * Returns the negated amount.
     */
    public Amount negate() {
        return new Amount(commodity, quantity.negate());
    }
    
    /**
     * Adds another amount. Both amounts must have the same commodity.
     */
    public Amount add(Amount other) {
        if (!this.commodity.equals(other.commodity)) {
            throw new IllegalArgumentException(
                "Cannot add amounts with different commodities: " + 
                this.commodity + " and " + other.commodity
            );
        }
        return new Amount(commodity, quantity.add(other.quantity));
    }
    
    /**
     * Checks if this amount is zero.
     */
    public boolean isZero() {
        return quantity.compareTo(BigDecimal.ZERO) == 0;
    }
}
