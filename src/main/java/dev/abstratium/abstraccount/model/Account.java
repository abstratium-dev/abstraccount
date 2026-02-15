package dev.abstratium.abstraccount.model;

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
    String id,
    String name,
    AccountType type,
    String note,
    String parentId,
    Account parent
) {
    public Account {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("Account id cannot be null or blank");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Account name cannot be null or blank");
        }
        if (type == null) {
            throw new IllegalArgumentException("Account type cannot be null");
        }
    }
    
    /**
     * Creates an account without a parent (root account).
     */
    public static Account root(String id, String name, AccountType type, String note) {
        return new Account(id, name, type, note, null, null);
    }
    
    /**
     * Creates an account with a parent.
     */
    public static Account child(String id, String name, AccountType type, String note, Account parent) {
        return new Account(id, name, type, note, parent.id(), parent);
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
