package dev.abstratium.abstraccount.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Represents a single posting (line) in a transaction affecting one account.
 * Each transaction must have at least two postings, and all postings must balance to zero.
 */
public record Posting(
    @JsonProperty("account") Account account,
    @JsonProperty("amount") Amount amount,
    @JsonProperty("note") String note,
    @JsonProperty("tags") List<Tag> tags
) {
    public Posting {
        if (account == null) {
            throw new IllegalArgumentException("Account cannot be null");
        }
        if (amount == null) {
            throw new IllegalArgumentException("Amount cannot be null");
        }
        // Make tags immutable
        tags = tags == null ? List.of() : List.copyOf(tags);
    }
    
    /**
     * Creates a posting without note or tags.
     */
    public static Posting simple(Account account, Amount amount) {
        return new Posting(account, amount, null, List.of());
    }
    
    /**
     * Creates a posting with a note but no tags.
     */
    public static Posting withNote(Account account, Amount amount, String note) {
        return new Posting(account, amount, note, List.of());
    }
    
    /**
     * Creates a posting with tags but no note.
     */
    public static Posting withTags(Account account, Amount amount, List<Tag> tags) {
        return new Posting(account, amount, null, tags);
    }
}
