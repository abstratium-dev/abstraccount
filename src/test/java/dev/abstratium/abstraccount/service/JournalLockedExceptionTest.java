package dev.abstratium.abstraccount.service;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

/**
 * Plain unit tests for {@link JournalLockedException} covering both
 * constructors and all getters.
 */
class JournalLockedExceptionTest {

    @Test
    void singleArgConstructor_storesJournalIdAndNullTitle() {
        JournalLockedException ex = new JournalLockedException("journal-123");

        assertEquals("journal-123", ex.getJournalId());
        assertNull(ex.getJournalTitle());
        assertNotNull(ex.getMessage());
        assertTrue(ex.getMessage().contains("journal-123"));
    }

    @Test
    void twoArgConstructor_storesJournalIdAndTitle() {
        JournalLockedException ex = new JournalLockedException("journal-456", "FY 2024");

        assertEquals("journal-456", ex.getJournalId());
        assertEquals("FY 2024", ex.getJournalTitle());
        assertNotNull(ex.getMessage());
        assertTrue(ex.getMessage().contains("FY 2024"));
        assertTrue(ex.getMessage().contains("journal-456"));
    }

    @Test
    void twoArgConstructor_withNullTitle_usesIdInMessage() {
        JournalLockedException ex = new JournalLockedException("journal-789", null);

        assertEquals("journal-789", ex.getJournalId());
        assertNull(ex.getJournalTitle());
        assertTrue(ex.getMessage().contains("journal-789"));
    }

    @Test
    void isRuntimeException() {
        JournalLockedException ex = new JournalLockedException("journal-123");
        assertInstanceOf(RuntimeException.class, ex);
    }
}
