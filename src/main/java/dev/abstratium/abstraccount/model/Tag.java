package dev.abstratium.abstraccount.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Represents a metadata tag attached to transactions or postings.
 * Tags can be simple (key only) or key-value pairs.
 * 
 * Examples:
 * - Simple tag: :OpeningBalances:
 * - Key-value tag: invoice:PI00000017
 */
public record Tag(
    @JsonProperty("key") String key,
    @JsonProperty("value") String value
) {
    /**
     * Creates a simple tag with only a key.
     */
    public static Tag simple(String key) {
        return new Tag(key, null);
    }
    
    /**
     * Creates a key-value tag.
     */
    public static Tag keyValue(String key, String value) {
        return new Tag(key, value);
    }
    
    /**
     * Checks if this is a simple tag (no value).
     */
    public boolean isSimple() {
        return value == null || value.isEmpty();
    }
}
