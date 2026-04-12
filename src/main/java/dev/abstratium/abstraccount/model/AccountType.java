package dev.abstratium.abstraccount.model;

/**
 * Enumeration of account types used in the chart of accounts.
 * Based on the fundamental accounting equation and plain text accounting conventions.
 * See https://en.wikipedia.org/wiki/Debits_and_credits
 *
 * <p><b>Debit / Credit and positive / negative amount conventions:</b></p>
 * <ul>
 *   <li><b>ASSET, EXPENSE, CASH</b> – debit-normal accounts.
 *       A <em>positive</em> amount represents a <em>debit</em> (increases the account value);
 *       a <em>negative</em> amount represents a <em>credit</em> (decreases the account value).</li>
 *   <li><b>LIABILITY, EQUITY, REVENUE</b> – credit-normal accounts.
 *       A <em>positive</em> amount represents a <em>credit</em> (increases the account value);
 *       a <em>negative</em> amount represents a <em>debit</em> (decreases the account value).</li>
 * </ul>
 *
 * <p>In other words: debits increase assets/expenses and reduce liabilities/equity/revenue;
 * credits do the opposite (Wikipedia: Debits and credits).</p>
 */
public enum AccountType {
    /**
     * Assets owned by the company (debit normal balance).
     * Positive amount = debit (increase); negative amount = credit (decrease).
     */
    ASSET,
    
    /**
     * Obligations owed by the company (credit normal balance).
     * Positive amount = credit (increase); negative amount = debit (decrease).
     */
    LIABILITY,
    
    /**
     * Owner's claims on assets after liabilities (credit normal balance).
     * Positive amount = credit (increase); negative amount = debit (decrease).
     */
    EQUITY,
    
    /**
     * Income from operations (credit normal balance).
     * Positive amount = credit (increase); negative amount = debit (decrease).
     */
    REVENUE,
    
    /**
     * Costs of operations (debit normal balance).
     * Positive amount = debit (increase); negative amount = credit (decrease).
     */
    EXPENSE,
    
    /**
     * Special type for cash accounts used in cash flow reporting.
     * Typically a subtype of ASSET (debit normal balance).
     * Positive amount = debit (increase); negative amount = credit (decrease).
     */
    CASH
}
