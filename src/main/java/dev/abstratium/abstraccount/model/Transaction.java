package dev.abstratium.abstraccount.model;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.math.BigDecimal;

/**
 * Represents a financial transaction with multiple entries.
 * All entries in a transaction must balance to zero for each commodity.
 */
public record Transaction(
    LocalDate date,
    TransactionStatus status,
    String description,
    String partnerId,
    String id,
    List<Tag> tags,
    List<Entry> entries
) {
    public Transaction {
        if (date == null) {
            throw new IllegalArgumentException("Transaction date cannot be null");
        }
        if (status == null) {
            throw new IllegalArgumentException("Status cannot be null");
        }
        if (description == null || description.isBlank()) {
            throw new IllegalArgumentException("Description cannot be null or blank");
        }
        if (entries == null || entries.size() < 2) {
            throw new IllegalArgumentException("Transaction must have at least 2 entries");
        }
        // Make collections immutable
        tags = tags == null ? List.of() : List.copyOf(tags);
        entries = List.copyOf(entries);
    }
    
    /**
     * Creates a transaction with minimal information.
     */
    public static Transaction simple(LocalDate date, TransactionStatus status, String description, List<Entry> entries) {
        return new Transaction(date, status, description, null, null, List.of(), entries);
    }
    
    /**
     * Creates a transaction with an ID.
     */
    public static Transaction withId(LocalDate date, TransactionStatus status, String description, String id, List<Entry> entries) {
        return new Transaction(date, status, description, null, id, List.of(), entries);
    }
    
    /**
     * Validates that all entries balance to zero for each commodity.
     * Returns true if balanced, false otherwise.
     */
    public boolean isBalanced() {
        Map<String, BigDecimal> balances = entries.stream()
            .collect(Collectors.groupingBy(
                p -> p.amount().commodity(),
                Collectors.reducing(
                    BigDecimal.ZERO,
                    p -> p.amount().quantity(),
                    BigDecimal::add
                )
            ));
        
        return balances.values().stream()
            .allMatch(balance -> balance.compareTo(BigDecimal.ZERO) == 0);
    }
    
    /**
     * Gets the tag value for a given key, or null if not found.
     */
    public String getTagValue(String key) {
        return tags.stream()
            .filter(tag -> tag.key().equals(key))
            .map(Tag::value)
            .findFirst()
            .orElse(null);
    }
    
    /**
     * Checks if this transaction has a specific simple tag.
     */
    public boolean hasTag(String key) {
        return tags.stream()
            .anyMatch(tag -> tag.key().equals(key));
    }
}
