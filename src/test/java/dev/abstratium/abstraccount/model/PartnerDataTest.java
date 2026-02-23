package dev.abstratium.abstraccount.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PartnerDataTest {

    @Test
    void testCreateValidPartnerData() {
        // When
        PartnerData partner = new PartnerData("P00000001", "Kutschera Anton", true);

        // Then
        assertEquals("P00000001", partner.partnerNumber());
        assertEquals("Kutschera Anton", partner.name());
        assertTrue(partner.active());
    }

    @Test
    void testCreateInactivePartner() {
        // When
        PartnerData partner = new PartnerData("P00000002", "Test Company", false);

        // Then
        assertEquals("P00000002", partner.partnerNumber());
        assertEquals("Test Company", partner.name());
        assertFalse(partner.active());
    }

    @Test
    void testNullPartnerNumberThrowsException() {
        // When/Then
        assertThrows(IllegalArgumentException.class, () -> {
            new PartnerData(null, "Name", true);
        });
    }

    @Test
    void testBlankPartnerNumberThrowsException() {
        // When/Then
        assertThrows(IllegalArgumentException.class, () -> {
            new PartnerData("", "Name", true);
        });

        assertThrows(IllegalArgumentException.class, () -> {
            new PartnerData("   ", "Name", true);
        });
    }

    @Test
    void testNullNameThrowsException() {
        // When/Then
        assertThrows(IllegalArgumentException.class, () -> {
            new PartnerData("P00000001", null, true);
        });
    }

    @Test
    void testBlankNameThrowsException() {
        // When/Then
        assertThrows(IllegalArgumentException.class, () -> {
            new PartnerData("P00000001", "", true);
        });

        assertThrows(IllegalArgumentException.class, () -> {
            new PartnerData("P00000001", "   ", true);
        });
    }

    @Test
    void testPartnerDataEquality() {
        // Given
        PartnerData partner1 = new PartnerData("P00000001", "Kutschera Anton", true);
        PartnerData partner2 = new PartnerData("P00000001", "Kutschera Anton", true);
        PartnerData partner3 = new PartnerData("P00000002", "Other Name", false);

        // Then
        assertEquals(partner1, partner2);
        assertNotEquals(partner1, partner3);
    }

    @Test
    void testPartnerDataHashCode() {
        // Given
        PartnerData partner1 = new PartnerData("P00000001", "Kutschera Anton", true);
        PartnerData partner2 = new PartnerData("P00000001", "Kutschera Anton", true);

        // Then
        assertEquals(partner1.hashCode(), partner2.hashCode());
    }

    @Test
    void testPartnerDataToString() {
        // Given
        PartnerData partner = new PartnerData("P00000001", "Kutschera Anton", true);

        // When
        String toString = partner.toString();

        // Then
        assertNotNull(toString);
        assertTrue(toString.contains("P00000001"));
        assertTrue(toString.contains("Kutschera Anton"));
        assertTrue(toString.contains("true"));
    }

    @Test
    void testPartnerDataWithSpecialCharacters() {
        // When
        PartnerData partner = new PartnerData("P00000002", "abstratium informatique sàrl", true);

        // Then
        assertEquals("P00000002", partner.partnerNumber());
        assertEquals("abstratium informatique sàrl", partner.name());
        assertTrue(partner.active());
    }
}
