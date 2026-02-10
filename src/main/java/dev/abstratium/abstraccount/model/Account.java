package dev.abstratium.abstraccount.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Represents an account in the chart of accounts with hierarchical structure.
 * Accounts are organized in a tree structure using colon (:) as separator.
 * 
 * Example:
 * account 1 Actifs / Assets:10 Actif circulants / Current Assets
 *   ; type:Asset
 *   ; note:Current assets description
 */
public record Account(
    @JsonProperty("accountNumber") String accountNumber,
    @JsonProperty("fullName") String fullName,
    @JsonProperty("type") AccountType type,
    @JsonProperty("note") String note,
    @JsonProperty("parent") Account parent
) {
    public Account {
        if (accountNumber == null || accountNumber.isBlank()) {
            throw new IllegalArgumentException("Account number cannot be null or blank");
        }
        if (fullName == null || fullName.isBlank()) {
            throw new IllegalArgumentException("Full name cannot be null or blank");
        }
        if (type == null) {
            throw new IllegalArgumentException("Account type cannot be null");
        }
    }
    
    /**
     * Creates an account without a parent (root account).
     */
    public static Account root(String accountNumber, String fullName, AccountType type, String note) {
        return new Account(accountNumber, fullName, type, note, null);
    }
    
    /**
     * Creates an account with a parent.
     */
    public static Account child(String accountNumber, String fullName, AccountType type, String note, Account parent) {
        return new Account(accountNumber, fullName, type, note, parent);
    }
    
    /**
     * Checks if this is a root account (no parent).
     */
    public boolean isRoot() {
        return parent == null;
    }
    
    /**
     * Gets the depth level of this account in the hierarchy.
     * Root accounts have depth 0.
     */
    public int getDepth() {
        int depth = 0;
        Account current = this.parent;
        while (current != null) {
            depth++;
            current = current.parent;
        }
        return depth;
    }
}
