package dev.abstratium.abstraccount.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class CommodityTest {

    @Test
    void validCommodityCreated() {
        Commodity commodity = new Commodity("CHF", new BigDecimal("1000.00"));
        assertEquals("CHF", commodity.code());
        assertEquals(0, new BigDecimal("1000.00").compareTo(commodity.displayPrecision()));
    }

    @Test
    void getDecimalPlacesReturnsScaleOfPrecision() {
        Commodity twoDecimals = new Commodity("CHF", new BigDecimal("1000.00"));
        Commodity threeDecimals = new Commodity("BTC", new BigDecimal("1000.000"));
        Commodity zeroDecimals = new Commodity("JPY", new BigDecimal("1000"));

        assertEquals(2, twoDecimals.getDecimalPlaces());
        assertEquals(3, threeDecimals.getDecimalPlaces());
        assertEquals(0, zeroDecimals.getDecimalPlaces());
    }

    @Test
    void nullCodeThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            new Commodity(null, new BigDecimal("1000.00")));
    }

    @Test
    void blankCodeThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            new Commodity("", new BigDecimal("1000.00")));
        assertThrows(IllegalArgumentException.class, () ->
            new Commodity("   ", new BigDecimal("1000.00")));
    }

    @Test
    void nullDisplayPrecisionThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            new Commodity("CHF", null));
    }

    @Test
    void commoditiesEqualWhenCodeAndPrecisionMatch() {
        Commodity c1 = new Commodity("CHF", new BigDecimal("1000.00"));
        Commodity c2 = new Commodity("CHF", new BigDecimal("1000.00"));
        assertEquals(c1, c2);
        assertEquals(c1.hashCode(), c2.hashCode());
    }
}
