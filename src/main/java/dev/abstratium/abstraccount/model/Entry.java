package dev.abstratium.abstraccount.model;

import java.util.List;

/**
 * Represents a single entry (line) in a transaction affecting one account.
 * Each transaction must have at least two entries, and all entries must balance to zero.
 */
public record Entry(
    Account account,
    Amount amount,
    String note
) {
    public Entry {
        if (account == null) {
            throw new IllegalArgumentException("Account cannot be null");
        }
        if (amount == null) {
            throw new IllegalArgumentException("Amount cannot be null");
        }
    }
    
    /**
     * Creates a entry without note or tags.
     */
    public static Entry simple(Account account, Amount amount) {
        return new Entry(account, amount, null);
    }
    
    /**
     * Creates a entry with a note but no tags.
     */
    public static Entry withNote(Account account, Amount amount, String note) {
        return new Entry(account, amount, note);
    }
    
    /**
     * Creates a entry with tags but no note.
     */
    public static Entry withTags(Account account, Amount amount, List<Tag> tags) {
        return new Entry(account, amount, null);
    }
}
