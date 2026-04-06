# Test Case 002: Open the Books with Opening Balances

**Feature:** Journal Opening Balances Transaction  
**Date:** 2026-04-04  

## Preconditions

See [PRECONDITIONS.md](./PRECONDITIONS.md) for general preconditions.

**CRITICAL:** This test case depends on [Test Case 001](./001-create-journal-with-accounts.md) being completed first. The journal "Abstratium 2026" and its complete account tree must exist before executing this test.

## Test Objective

Verify that a user can "open the books" by creating an opening balances transaction that initializes all accounts with their starting balances for the fiscal year. This transaction establishes the initial financial position of the entity at the beginning of the accounting period (2024-01-01).

## Test Data

### Transaction Details
- **Transaction Date:** 2024-01-01
- **Transaction Type:** Opening Balances
- **Transaction ID:** fdde1faa-b9b9-45cf-959b-122a39cf72a3
- **Description:** "Opening Balances"
- **Status:** Posted/Cleared (marked with `*` in hledger format)

### Opening Balance Entries

All accounts are initialized with CHF 0.00 to establish the opening position. The transaction must balance (debits = credits = 0.00).

#### Equity Accounts (Credit side - establishing the baseline)
1. **2800 Basic, shareholder or foundation capital**
   - Full path: `2 Equity:28 Shareholders Equity (legal entities):280 Basic, shareholder or foundation capital:2800 Basic, shareholder or foundation capital`
   - Amount: CHF 0.00

2. **2970 Profit carried forward or loss carried forward**
   - Full path: `2 Equity:290 Reserves and retained earnings, own capital shares and disposable profit:2970 Profit carried forward or loss carried forward as negative item`
   - Amount: CHF 0.00

3. **2979 Annual profit or loss**
   - Full path: `2 Equity:290 Reserves and retained earnings, own capital shares and disposable profit:2979 Annual profit or loss as negative items`
   - Amount: CHF 0.00

#### Asset Accounts (Debit side)
4. **1000 Cash**
   - Full path: `1 Assets:10 Current Assets:100 Cash and cash equivalents:1000 Cash`
   - Amount: CHF 0.00

5. **1020 Bank Account**
   - Full path: `1 Assets:10 Current Assets:100 Cash and cash equivalents:1020 Bank Account (asset)`
   - Amount: CHF 0.00

6. **1100 Accounts receivable (Debtors)**
   - Full path: `1 Assets:10 Current Assets:110 Accounts Receivable:1100 Accounts receivable (Debtors)`
   - Amount: CHF 0.00

7. **120 Inventories and non-invoiced services**
   - Full path: `1 Assets:10 Current Assets:120 Inventories and non-invoiced services`
   - Amount: CHF 0.00

8. **150 Movable tangible fixed assets**
   - Full path: `1 Assets:14 Non-current assets:150 Movable tangible fixed assets`
   - Amount: CHF 0.00

#### Liability Accounts (Credit side)
9. **2000 Accounts payable (suppliers & creditors)**
   - Full path: `2 Liabilities:20 Current liabilities:200 Accounts payable (A/P):2000 Accounts payable (suppliers&creditors)`
   - Amount: CHF 0.00

10. **2210 Other short-term liabilities**
    - Full path: `2 Liabilities:20 Current liabilities:220 Other short-term liabilities:2210 Other short-term liabilities`
    - Amount: CHF 0.00

11. **2210.001 John Smith** (sub-account of 2210)
    - Full path: `2 Liabilities:20 Current liabilities:220 Other short-term liabilities:2210 Other short-term liabilities:2210.001 John Smith`
    - Amount: CHF 0.00

## Test Steps

### Scenario: Create opening balances transaction

```gherkin
Feature: Opening Balances Transaction

  Background:
    Given the user is signed into the application
    And the journal "Abstratium 2026" exists with a complete account tree
    And the user is on the journal detail page for "Abstratium 2026"

  Scenario: Create opening balances transaction to open the books
    When the user navigates to the "Transactions" section
    And the user clicks "Create New Transaction"
    Then the transaction creation form should be displayed
    
    When the user enters "2026-01-01" as the transaction date
    And the user enters "Opening Balances" as the transaction description
    And the user sets the transaction status to "Posted" or "Cleared"
    Then the transaction form should accept these values
    
    # Add Equity account entries (establishing the baseline)
    When the user clicks "Add Entry"
    And the user searches for and selects account "2800 Basic, shareholder or foundation capital"
    And the user enters amount "0.00" CHF
    And the user selects "Credit" as the entry type
    Then the entry should be added to the transaction
    
    When the user clicks "Add Entry"
    And the user searches for and selects account "2970 Profit carried forward or loss carried forward as negative item"
    And the user enters amount "0.00" CHF
    And the user selects "Credit" as the entry type
    Then the entry should be added to the transaction
    
    When the user clicks "Add Entry"
    And the user searches for and selects account "2979 Annual profit or loss as negative items"
    And the user enters amount "0.00" CHF
    And the user selects "Credit" as the entry type
    Then the entry should be added to the transaction
    
    # Add Asset account entries
    When the user clicks "Add Entry"
    And the user searches for and selects account "1000 Cash"
    And the user enters amount "0.00" CHF
    And the user selects "Debit" as the entry type
    Then the entry should be added to the transaction
    
    When the user clicks "Add Entry"
    And the user searches for and selects account "1020 Bank Account (asset)"
    And the user enters amount "0.00" CHF
    And the user selects "Debit" as the entry type
    Then the entry should be added to the transaction
    
    When the user clicks "Add Entry"
    And the user searches for and selects account "1100 Accounts receivable (Debtors)"
    And the user enters amount "0.00" CHF
    And the user selects "Debit" as the entry type
    Then the entry should be added to the transaction
    
    When the user clicks "Add Entry"
    And the user searches for and selects account "120 Inventories and non-invoiced services"
    And the user enters amount "0.00" CHF
    And the user selects "Debit" as the entry type
    Then the entry should be added to the transaction
    
    When the user clicks "Add Entry"
    And the user searches for and selects account "150 Movable tangible fixed assets"
    And the user enters amount "0.00" CHF
    And the user selects "Debit" as the entry type
    Then the entry should be added to the transaction
    
    # Add Liability account entries
    When the user clicks "Add Entry"
    And the user searches for and selects account "2000 Accounts payable (suppliers&creditors)"
    And the user enters amount "0.00" CHF
    And the user selects "Credit" as the entry type
    Then the entry should be added to the transaction
    
    When the user clicks "Add Entry"
    And the user searches for and selects account "2210 Other short-term liabilities"
    And the user enters amount "0.00" CHF
    And the user selects "Credit" as the entry type
    Then the entry should be added to the transaction
    
    When the user clicks "Add Entry"
    And the user searches for and selects account "2210.001 John Smith"
    And the user enters amount "0.00" CHF
    And the user selects "Credit" as the entry type
    Then the entry should be added to the transaction
    
    # Verify and save the transaction
    When the user reviews the transaction
    Then the transaction should show 11 entries
    And the total debits should equal "0.00" CHF
    And the total credits should equal "0.00" CHF
    And the transaction should be balanced
    And a balance indicator should show "Balanced" or similar confirmation
    
    When the user clicks "Save Transaction" or "Post Transaction"
    Then the transaction should be saved successfully
    And a success message "Opening balances transaction created successfully" should be displayed
    And the user should see the transaction in the transactions list
    And the transaction should be dated "2026-01-01"
    And the transaction should be marked as "Posted" or "Cleared"
    
    # Verify account balances
    When the user navigates to the "Accounts" section
    And the user views the account balances as of "2026-01-01"
    Then all accounts included in the opening balances transaction should show a balance of "0.00" CHF
    And the balance sheet should be balanced (Assets = Liabilities + Equity)
```

## Expected Results

1. **Transaction Creation:**
   - Opening balances transaction is created with date 2026-01-01
   - Transaction contains 11 entries (3 equity, 5 asset, 3 liability)
   - Transaction is marked as posted/cleared
   - Transaction ID is stored if provided

2. **Transaction Balance:**
   - Total debits = CHF 0.00
   - Total credits = CHF 0.00
   - Transaction is balanced (debits = credits)
   - System validates balance before allowing save

3. **Account Balances:**
   - All accounts in the transaction show opening balance of CHF 0.00
   - Account balances are queryable as of 2026-01-01
   - Balance sheet equation holds: Assets = Liabilities + Equity

4. **Data Integrity:**
   - Transaction is persisted to the database
   - All entries are linked to the correct transaction
   - All entries reference valid accounts from the account tree
   - Transaction appears in transaction history
   - Transaction can be viewed, edited (if not locked), or exported

## Acceptance Criteria

- [ ] User can create a transaction with multiple entries
- [ ] User can select accounts from the existing account tree
- [ ] User can specify debit or credit for each entry
- [ ] System validates that transaction is balanced before saving
- [ ] System displays running balance total as entries are added
- [ ] Transaction date can be set to any valid date
- [ ] Transaction can be marked as posted/cleared
- [ ] All entries are saved with correct account references
- [ ] Account balances are updated after transaction is posted
- [ ] Transaction appears in transaction list sorted by date
- [ ] User can view transaction details after creation
- [ ] System prevents saving unbalanced transactions

## Notes

- This test establishes the "opening the books" pattern with zero balances
- In real-world scenarios, opening balances would typically have non-zero amounts reflecting the actual financial position
- This transaction serves as the foundation for all subsequent accounting entries
- The hledger format uses `:` as the account hierarchy separator and supports multi-level nesting

## Technical Notes

### Account Path Mapping

The UI should support both:
1. **Short display names** (e.g., "1000 Cash")
2. **Full hierarchical paths** for internal storage and hledger export

Example mapping:
```
UI Display: "1000 Cash"
Full Path:  "1 Assets:10 Current Assets:100 Cash and cash equivalents:1000 Cash"
```

