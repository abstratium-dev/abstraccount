package dev.abstratium.abstraccount.model;

/**
 * Enumeration of account types used in the chart of accounts.
 * Based on the fundamental accounting equation and plain text accounting conventions.
 */
public enum AccountType {
    /**
     * Assets owned by the company (debit normal balance).
     */
    ASSET,
    
    /**
     * Obligations owed by the company (credit normal balance).
     */
    LIABILITY,
    
    /**
     * Owner's claims on assets after liabilities (credit normal balance).
     */
    EQUITY,
    
    /**
     * Income from operations (credit normal balance).
     */
    REVENUE,
    
    /**
     * Costs of operations (debit normal balance).
     */
    EXPENSE,
    
    /**
     * Special type for cash accounts used in cash flow reporting.
     * Typically a subtype of ASSET.
     */
    CASH
}
