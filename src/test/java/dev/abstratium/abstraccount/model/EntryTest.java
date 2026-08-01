package dev.abstratium.abstraccount.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class EntryTest {

    private Account account() {
        return Account.root("acc1", "1020 Cash", AccountType.ASSET, null);
    }

    private Amount amount() {
        return Amount.of("CHF", "100.00");
    }

    @Test
    void simpleCreatesEntryWithNullNote() {
        Entry entry = Entry.simple(account(), amount());
        assertEquals("acc1", entry.account().id());
        assertEquals(0, new BigDecimal("100.00").compareTo(entry.amount().quantity()));
        assertNull(entry.note());
    }

    @Test
    void withNoteCreatesEntryWithNote() {
        Entry entry = Entry.withNote(account(), amount(), "Payment for services");
        assertEquals("Payment for services", entry.note());
    }

    @Test
    void withTagsCreatesEntryWithNullNote() {
        Entry entry = Entry.withTags(account(), amount(), List.of(Tag.simple("OpeningBalances")));
        assertNull(entry.note());
    }

    @Test
    void nullAccountThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            new Entry(null, amount(), null));
    }

    @Test
    void nullAmountThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            new Entry(account(), null, null));
    }

    @Test
    void entriesEqualWhenFieldsMatch() {
        Account acc = account();
        Amount amt = amount();
        Entry e1 = new Entry(acc, amt, "note");
        Entry e2 = new Entry(acc, amt, "note");
        assertEquals(e1, e2);
        assertEquals(e1.hashCode(), e2.hashCode());
    }
}
