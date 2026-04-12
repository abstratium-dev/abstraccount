# Test Case 003: Record Initial Business Transactions

**Feature:** Recording Initial Business Formation Transactions  
**Date:** 2026-04-05  

## Preconditions

See [PRECONDITIONS.md](./PRECONDITIONS.md) for general preconditions.

**CRITICAL:** This test case depends on:
- [Test Case 001](./001-create-journal-with-accounts.md) - Journal and account tree must exist
- [Test Case 002](./002-open-the-books.md) - Opening balances must be established

## Test Objective

Verify that a user can record a series of initial business transactions during company formation, including:
- Short-term loans from founders
- Administrative fees and payments
- Capital contributions
- Bank fees

This test demonstrates the complete workflow of recording real business transactions with proper double-entry accounting, including both the expense/liability recognition and the corresponding payment transactions.

## Test Data

### Partner/Vendor Information
- **P00000001:** John Smith (Founder providing short-term loan)
- **P00000002:** Startup Help GmbH (Company formation service provider)
- **P00000003:** Post CH Netz AG (Swiss postal service)
- **P00000004:** PostFinance AG (Bank)

### Transaction Series

#### Transaction 1: Short-term Loan from Founder
- **Date:** 2026-05-25
- **Partner:** P00000001 John Smith
- **Description:** "Short term loan from John Smith, to start company"
- **Invoice:** PI00000001
- **Status:** Posted (*)
- **Entries:**
  1. **Debit:** `1000 Cash` - CHF 38.50
  2. **Credit:** `2210.001 John Smith` - CHF 38.50

#### Transaction 2a: IFJ Formation Fee (Invoice)
- **Date:** 2026-05-26
- **Partner:** P00000002 Startup Help GmbH
- **Description:** "Fee to create Sàrl paid to Startup Help GmbH"
- **Invoice:** PI00000002
- **Status:** Posted (*)
- **Entries:**
  1. **Debit:** `6500 Administrative expenses` - CHF 34.30
  2. **Credit:** `2000 Accounts payable (suppliers&creditors)` - CHF 34.30

#### Transaction 2b: IFJ Formation Fee (Payment)
- **Date:** 2026-05-26
- **Partner:** P00000002 Startup Help GmbH
- **Description:** "Payment of fee to create Sàrl paid to Startup Help GmbH"
- **Invoice:** PI00000002
- **Status:** Posted (*)
- **Tags:** `Payment:`
- **Entries:**
  1. **Debit:** `2000 Accounts payable (suppliers&creditors)` - CHF 34.30
  2. **Credit:** `1000 Cash` - CHF 34.30

#### Transaction 3a: Postal Service Fee (Invoice)
- **Date:** 2026-06-18
- **Partner:** P00000003 Post CH Netz AG
- **Description:** "Receipt for sending founding docs eingeschrieben"
- **Invoice:** PI00000003
- **Status:** Posted (*)
- **Entries:**
  1. **Debit:** `6700 Other operating expenses` - CHF 4.20
  2. **Credit:** `2000 Accounts payable (suppliers&creditors)` - CHF 4.20

#### Transaction 3b: Postal Service Fee (Payment)
- **Date:** 2026-06-18
- **Partner:** P00000003 Post CH Netz AG
- **Description:** "Receipt for sending founding docs eingeschrieben"
- **Invoice:** PI00000003
- **Status:** Posted (*)
- **Tags:** `Payment:`
- **Entries:**
  1. **Debit:** `2000 Accounts payable (suppliers&creditors)` - CHF 4.20
  2. **Credit:** `1000 Cash` - CHF 4.20

#### Transaction 4: Capital Contribution
- **Date:** 2026-06-26
- **Partner:** P00000001 John Smith
- **Description:** "Capital payment into abstratium paid into PF"
- **Invoice:** PI00000004
- **Status:** Posted (*)
- **Entries:**
  1. **Debit:** `1020 Bank Account (asset)` - CHF 2,000.00
  2. **Credit:** `2800 Basic, shareholder or foundation capital` - CHF 2,000.00

#### Transaction 5a: Bank Account Management Fee (Invoice)
- **Date:** 2026-07-24
- **Partner:** P00000004 PostFinance AG
- **Description:** "PRIX POUR LA GESTION DU COMPTE CONSIGNATION DU CAPITAL CRÉATION D'ENTREPRISE"
- **Invoice:** PI00000005
- **Status:** Posted (*)
- **Tags:** `Payment:`
- **Entries:**
  1. **Debit:** `6900 Financial expense` - CHF 15.00
  2. **Credit:** `2000 Accounts payable (suppliers&creditors)` - CHF 15.00

#### Transaction 5b: Bank Account Management Fee (Payment)
- **Date:** 2026-07-24
- **Partner:** P00000004 PostFinance AG
- **Description:** "PRIX POUR LA GESTION DU COMPTE CONSIGNATION DU CAPITAL CRÉATION D'ENTREPRISE"
- **Invoice:** PI00000005
- **Status:** Posted (*)
- **Tags:** `Payment:`
- **Entries:**
  1. **Debit:** `2000 Accounts payable (suppliers&creditors)` - CHF 15.00
  2. **Credit:** `1020 Bank Account (asset)` - CHF 15.00

## Test Steps

### Scenario: Record initial business formation transactions

```gherkin
Feature: Initial Business Transactions

  Background:
    Given the user is signed into the application
    And the journal "Abstratium 2026" exists with a complete account tree
    And opening balances have been established for 2026-01-01
    And the user is on the journal detail page for "Abstratium 2026"

  Scenario: Record short-term loan from founder
    When the user navigates to the "Transactions" section
    And the user clicks "Create New Transaction"
    Then the transaction creation form should be displayed
    
    When the user enters "2025-05-25" as the transaction date
    And the user enters "P00000001 John Smith" as the partner
    And the user enters "Short term loan from J. Smith, to start company" as the description
    And the user enters "PI00000001" as the invoice reference
    And the user sets the transaction status to "Posted"
    
    When the user clicks "Add Entry"
    And the user selects account "1000 Cash"
    And the user enters amount "38.50" CHF
    And the user selects "Debit" as the entry type
    Then the entry should be added to the transaction
    
    When the user clicks "Add Entry"
    And the user selects account "2210.001 John Smith"
    And the user enters amount "38.50" CHF
    And the user selects "Credit" as the entry type
    Then the entry should be added to the transaction
    
    When the user reviews the transaction
    Then the transaction should be balanced
    And the total debits should equal "38.50" CHF
    And the total credits should equal "38.50" CHF
    
    When the user clicks "Save Transaction"
    Then the transaction should be saved successfully
    And the cash account balance should increase by CHF 38.50
    And the John Smith liability account should show CHF 38.50

  Scenario: Record administrative fee invoice and payment
    # Record the invoice
    When the user creates a new transaction with date "2026-05-26"
    And the user enters partner "P00000002 Startup Help GmbH"
    And the user enters description "Fee to create Sàrl paid to Startup Help GmbH"
    And the user enters invoice "PI00000002"
    And the user adds a debit entry to "6500 Administrative expenses" for CHF 34.30
    And the user adds a credit entry to "2000 Accounts payable (suppliers&creditors)" for CHF 34.30
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the administrative expenses should increase by CHF 34.30
    And the accounts payable should increase by CHF 34.30
    
    # Record the payment
    When the user creates a new transaction with date "2026-05-26"
    And the user enters partner "P00000002 Startup Help GmbH"
    And the user enters description "Payment of fee to create Sàrl paid to Startup Help GmbH"
    And the user enters invoice "PI00000002"
    And the user adds tag "Payment:"
    And the user adds a debit entry to "2000 Accounts payable (suppliers&creditors)" for CHF 34.30
    And the user adds a credit entry to "1000 Cash" for CHF 34.30
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the accounts payable for IFJ should be cleared (CHF 0.00)
    And the cash account should decrease by CHF 34.30

  Scenario: Record postal service fee invoice and payment
    # Record the invoice
    When the user creates a new transaction with date "2026-06-18"
    And the user enters partner "P00000003 Post CH Netz AG"
    And the user enters description "Receipt for sending founding docs eingeschrieben"
    And the user enters invoice "PI00000003"
    And the user adds a debit entry to "6700 Other operating expenses" for CHF 4.20
    And the user adds a credit entry to "2000 Accounts payable (suppliers&creditors)" for CHF 4.20
    And the user saves the transaction
    Then the transaction should be saved successfully
    
    # Record the payment
    When the user creates a new transaction with date "2026-06-18"
    And the user enters partner "P00000003 Post CH Netz AG"
    And the user enters description "Receipt for sending founding docs eingeschrieben"
    And the user enters invoice "PI00000003"
    And the user adds tag "Payment:"
    And the user adds a debit entry to "2000 Accounts payable (suppliers&creditors)" for CHF 4.20
    And the user adds a credit entry to "1000 Cash" for CHF 4.20
    And the user saves the transaction
    Then the transaction should be saved successfully

  Scenario: Record capital contribution from founder
    When the user creates a new transaction with date "2026-06-26"
    And the user enters partner "P00000001 John Smith"
    And the user enters description "Capital payment into abstratium paid into PF"
    And the user enters invoice "PI00000004"
    And the user adds a debit entry to "1020 Bank Account (asset)" for CHF 2,000.00
    And the user adds a credit entry to "2800 Basic, shareholder or foundation capital" for CHF 2,000.00
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the bank account balance should be CHF 2,000.00
    And the share capital should be CHF 2,000.00

  Scenario: Record bank account management fee
    When the user creates a new transaction with date "2026-07-24"
    And the user enters partner "P00000004 PostFinance AG"
    And the user enters description "PRIX POUR LA GESTION DU COMPTE CONSIGNATION DU CAPITAL CRÉATION D'ENTREPRISE"
    And the user enters invoice "PI00000005"
    And the user adds tag "Payment:"
    And the user adds a debit entry to "6900 Financial expense" for CHF 15.00
    And the user adds a credit entry to "2000 Accounts payable (suppliers&creditors)" for CHF 15.00
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the financial expenses should increase by CHF 15.00

  Scenario: Record bank account management fee payment
    When the user creates a new transaction with date "2026-07-24"
    And the user enters partner "P00000004 PostFinance AG"
    And the user enters description "PRIX POUR LA GESTION DU COMPTE CONSIGNATION DU CAPITAL CRÉATION D'ENTREPRISE"
    And the user enters invoice "PI00000005"
    And the user adds tag "Payment:"
    And the user adds a debit entry to "2000 Accounts payable (suppliers&creditors)" for CHF 15.00
    And the user adds a credit entry to "1020 Bank Account (asset)" for CHF 15.00
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the accounts payable should decrease by CHF 15.00
    And the bank account balance should decrease by CHF 15.00

  Scenario: Verify cumulative account balances after all transactions
    When the user views account balances as of "2026-07-24"
    Then the following balances should be displayed:
      | Account                                       | Balance       |
      | 1000 Cash                                     | CHF 0.00      |
      | 1020 Bank Account (asset)                     | CHF 1,985.00  |
      | 2000 Accounts payable (suppliers&creditors)   | CHF 0.00      |
      | 2210.001 John Smith                           | CHF 38.50    |
      | 2800 Basic, shareholder or foundation capital | CHF 2,000.00  |
      | 6500 Administrative expenses                  | CHF 34.30     |
      | 6700 Other operating expenses                 | CHF 4.20      |
      | 6900 Financial expense                        | CHF 15.00     |
    And the balance sheet equation should hold: Assets = Liabilities + Equity
```

## Expected Results

1. **Transaction Recording:**
   - All 9 transactions are created successfully
   - Each transaction is properly dated and marked as posted
   - Partner/vendor information is correctly associated
   - Invoice references are stored and retrievable
   - Tags (`Payment:`) are properly applied where specified

2. **Double-Entry Accounting:**
   - Every transaction is balanced (debits = credits)
   - Accounts payable increases with invoices and decreases with payments
   - Cash and bank accounts reflect all movements correctly
   - Expense accounts accumulate properly

3. **Account Balances (as of 2026-07-24):**
   - Cash: CHF 0.00 (38.50 in - 38.50 out)
   - Bank Account: CHF 1,985.00 (2,000.00 in - 15.00 out)
   - Accounts Payable: CHF 0.00 (15.00 in - 15.00 out)
   - John Smith (liability): CHF 38.50
   - Share Capital: CHF 2,000.00
   - Total Administrative Expenses: CHF 34.30 (34.30)
   - Other Operating Expenses: CHF 4.20
   - Financial Expenses: CHF 15.00

4. **Data Integrity:**
   - All transactions are persisted to the database
   - Transaction IDs are unique and stored
   - Invoice references link related transactions
   - Payment tags distinguish payment transactions from invoices
   - Transaction history is complete and queryable

## Acceptance Criteria

- [ ] User can create transactions with partner/vendor information
- [ ] User can add invoice references to transactions
- [ ] User can add tags to transactions (e.g., `Payment:`)
- [ ] User can record paired invoice and payment transactions
- [ ] System correctly updates account balances after each transaction
- [ ] System maintains running balances for all affected accounts
- [ ] User can view transaction history filtered by date range
- [ ] User can view transaction history filtered by partner
- [ ] User can view transaction history filtered by invoice reference
- [ ] Account balances reflect all posted transactions
- [ ] Balance sheet remains balanced after all transactions
- [ ] User can generate reports showing expense breakdown
- [ ] User can generate reports showing cash flow

## Notes

- This test demonstrates the **accrual accounting pattern**: expenses are recognized when incurred (invoice), and separately when paid (payment transaction)
- The pattern of paired transactions (invoice + payment) is common in business accounting
- Tags like `Payment:` help categorize and filter transactions
- Partner/vendor tracking enables relationship management and reporting
- Invoice references enable tracking of payables and receivables
- The test shows realistic company formation costs in Switzerland

## Technical Notes

### Account Paths Used

```
Full paths for accounts referenced in this test:

Assets:
- 1 Assets:10 Current Assets:100 Cash and cash equivalents:1000 Cash
- 1 Assets:10 Current Assets:100 Cash and cash equivalents:1020 Bank Account (asset)

Liabilities:
- 2 Liabilities:20 Current liabilities:200 Accounts payable (A/P):2000 Accounts payable (suppliers&creditors)
- 2 Liabilities:20 Current liabilities:220 Other short-term liabilities:2210 Other short-term liabilities:2210.001 John Smith

Equity:
- 2 Equity:28 Shareholders Equity (legal entities):280 Basic, shareholder or foundation capital:2800 Basic, shareholder or foundation capital

Expenses:
- 6 Other Operating Expenses, Depreciations and Value Adjustments, Financial result:6500 Administrative expenses
- 6 Other Operating Expenses, Depreciations and Value Adjustments, Financial result:6700 Other operating expenses
- 6 Other Operating Expenses, Depreciations and Value Adjustments, Financial result:6900 Financial expense
```

### Transaction Metadata

The system should support:
- **Partner/Vendor field**: Free text or selected from a partner registry
- **Invoice reference**: Free text field for tracking invoice numbers
- **Tags**: Colon-delimited tags (e.g., `Payment:`, `:Recurring:`)
- **Transaction ID**: UUID for unique identification
- **Status**: Pending, Posted/Cleared, Reconciled

### Validation Rules

- Transaction date must be valid and within the fiscal year
- All transactions must balance (sum of debits = sum of credits)
- Account references must exist in the account tree
- Amounts must be positive numbers with up to 2 decimal places
- Currency must be specified (CHF in this case)
