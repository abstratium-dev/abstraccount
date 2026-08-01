package dev.abstratium.abstraccount.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class AmountTest {

    @Test
    void ofCommodityAndBigDecimalCreatesAmount() {
        Amount amount = Amount.of("CHF", new BigDecimal("100.50"));
        assertEquals("CHF", amount.commodity());
        assertEquals(0, new BigDecimal("100.50").compareTo(amount.quantity()));
    }

    @Test
    void ofCommodityAndStringCreatesAmount() {
        Amount amount = Amount.of("EUR", "200.25");
        assertEquals("EUR", amount.commodity());
        assertEquals(0, new BigDecimal("200.25").compareTo(amount.quantity()));
    }

    @Test
    void negateReturnsNegatedQuantity() {
        Amount amount = Amount.of("CHF", "100.00");
        Amount negated = amount.negate();
        assertEquals("CHF", negated.commodity());
        assertEquals(0, new BigDecimal("-100.00").compareTo(negated.quantity()));
    }

    @Test
    void negateOfNegativeReturnsPositive() {
        Amount amount = Amount.of("CHF", "-50.00");
        Amount negated = amount.negate();
        assertEquals(0, new BigDecimal("50.00").compareTo(negated.quantity()));
    }

    @Test
    void addReturnsSumForSameCommodity() {
        Amount a = Amount.of("CHF", "100.00");
        Amount b = Amount.of("CHF", "50.00");
        Amount sum = a.add(b);
        assertEquals("CHF", sum.commodity());
        assertEquals(0, new BigDecimal("150.00").compareTo(sum.quantity()));
    }

    @Test
    void addWithNegativeValueSubtracts() {
        Amount a = Amount.of("CHF", "100.00");
        Amount b = Amount.of("CHF", "-30.00");
        Amount sum = a.add(b);
        assertEquals(0, new BigDecimal("70.00").compareTo(sum.quantity()));
    }

    @Test
    void addWithDifferentCommoditiesThrows() {
        Amount a = Amount.of("CHF", "100.00");
        Amount b = Amount.of("EUR", "50.00");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> a.add(b));
        assertTrue(ex.getMessage().contains("CHF"));
        assertTrue(ex.getMessage().contains("EUR"));
    }

    @Test
    void isZeroReturnsTrueForZeroQuantity() {
        assertTrue(Amount.of("CHF", "0").isZero());
        assertTrue(Amount.of("CHF", "0.00").isZero());
        assertTrue(Amount.of("CHF", new BigDecimal("0.000")).isZero());
    }

    @Test
    void isZeroReturnsFalseForNonZeroQuantity() {
        assertFalse(Amount.of("CHF", "0.01").isZero());
        assertFalse(Amount.of("CHF", "-100.00").isZero());
    }

    @Test
    void nullCommodityThrows() {
        assertThrows(IllegalArgumentException.class, () -> new Amount(null, BigDecimal.ZERO));
    }

    @Test
    void blankCommodityThrows() {
        assertThrows(IllegalArgumentException.class, () -> new Amount("", BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class, () -> new Amount("   ", BigDecimal.ZERO));
    }

    @Test
    void nullQuantityThrows() {
        assertThrows(IllegalArgumentException.class, () -> new Amount("CHF", null));
    }
}
