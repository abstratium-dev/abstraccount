package dev.abstratium.abstraccount.model;

/**
 * Status of a transaction indicating its reconciliation state.
 */
public enum TransactionStatus {
    /**
     * Transaction has been cleared/reconciled (marked with *).
     */
    CLEARED,
    
    /**
     * Transaction is pending (marked with !).
     */
    PENDING,
    
    /**
     * Transaction is uncleared (no status marker).
     */
    UNCLEARED
}
