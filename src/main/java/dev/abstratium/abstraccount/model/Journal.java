package dev.abstratium.abstraccount.model;

import java.util.List;
import java.util.Optional;

/**
 * Represents the root entity of a plain text accounting journal file.
 * Contains metadata, commodity declarations, account declarations, and transactions.
 */
public record Journal(
    String logo,
    String title,
    String subtitle,
    String currency,
    List<Commodity> commodities,
    List<Account> accounts,
    List<Transaction> transactions
) {
    public Journal {
        // Make collections immutable
        commodities = commodities == null ? List.of() : List.copyOf(commodities);
        accounts = accounts == null ? List.of() : List.copyOf(accounts);
        transactions = transactions == null ? List.of() : List.copyOf(transactions);
    }
    
    /**
     * Creates a minimal journal with only required fields.
     */
    public static Journal minimal(String currency) {
        return new Journal(null, null, null, currency, List.of(), List.of(), List.of());
    }
    
    /**
     * Finds a commodity by its code.
     */
    public Optional<Commodity> findCommodity(String code) {
        return commodities.stream()
            .filter(c -> c.code().equals(code))
            .findFirst();
    }
    
    public Optional<Account> findAccount(String accountId) {
        return accounts.stream()
            .filter(a -> a.id().equals(accountId))
            .findFirst();
    }
    
    /**
     * Finds a transaction by its ID.
     */
    public Optional<Transaction> findTransaction(String id) {
        return transactions.stream()
            .filter(t -> id.equals(t.id()))
            .findFirst();
    }
    
    /**
     * Gets all transactions with a specific tag.
     */
    public List<Transaction> findTransactionsByTag(String tagKey) {
        return transactions.stream()
            .filter(t -> t.hasTag(tagKey))
            .toList();
    }
}
