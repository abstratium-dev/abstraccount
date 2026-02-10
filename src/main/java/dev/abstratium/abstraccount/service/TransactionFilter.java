package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.model.Transaction;

/**
 * Functional interface for filtering transactions.
 * Follows the Strategy pattern to allow flexible filtering criteria.
 */
@FunctionalInterface
public interface TransactionFilter {
    
    /**
     * Tests whether a transaction matches this filter's criteria.
     * 
     * @param transaction the transaction to test
     * @return true if the transaction matches, false otherwise
     */
    boolean matches(Transaction transaction);
    
    /**
     * Combines this filter with another using AND logic.
     */
    default TransactionFilter and(TransactionFilter other) {
        return transaction -> this.matches(transaction) && other.matches(transaction);
    }
    
    /**
     * Combines this filter with another using OR logic.
     */
    default TransactionFilter or(TransactionFilter other) {
        return transaction -> this.matches(transaction) || other.matches(transaction);
    }
    
    /**
     * Negates this filter.
     */
    default TransactionFilter negate() {
        return transaction -> !this.matches(transaction);
    }
}
