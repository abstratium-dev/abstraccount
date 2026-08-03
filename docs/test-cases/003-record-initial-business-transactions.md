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
- Inventory purchases for resale (via `PaymentForGoods` macro)
- Supplier invoices with delayed payment (via `PayInvoiceFromBank` macro)
- Sales invoices with VAT (multi-entry transaction)
- Credit notes to customers (revenue reversal)
- Expense refunds from suppliers (expense reversal)
- Inventory write-downs (via `InventoryAdjustment` macro)
- Direct tax payments

This test also verifies that the user can import the built-in report templates and generate financial reports (Balance Sheet, Income Statement, Swiss Balance Sheet, Swiss Income Statement, Trial Balance, and Partner Activity) that correctly reflect the recorded transactions.

This test demonstrates the complete workflow of recording real business transactions with proper double-entry accounting, including both the expense/liability recognition and the corresponding payment transactions. It also exercises all account types in both debit and credit directions, and verifies account balances after every transaction.

## Test Data

### Partner/Vendor Information
- **P00000001:** John Smith (Founder providing short-term loan, also a customer)
- **P00000002:** Startup Help GmbH (Company formation service provider, also a supplier)
- **P00000003:** Post CH Netz AG (Swiss postal service)
- **P00000004:** PostFinance AG (Bank)
- **P00000005:** Microsoft (Supplier of IT services)
- **P00000006:** Canton Vaud Tax Authority (Tax authority)
- **P00000007:** Anthropic (Supplier of AI API services)

### Transaction Series

#### Transaction 1: Short-term Loan from Founder
- **Date:** 2024-05-25
- **Partner:** P00000001 John Smith
- **Description:** "Short term loan from John Smith, to start company"
- **Invoice:** PI00000001
- **Status:** Posted (*)
- **Entries:**
  1. **Debit:** `1000 Cash` - CHF 38.50
  2. **Credit:** `2210.001 Staff member` - CHF 38.50

#### Transaction 2a: IFJ Formation Fee (Invoice)
- **Date:** 2024-05-26
- **Partner:** P00000002 Startup Help GmbH
- **Description:** "Fee to create Sàrl paid to Startup Help GmbH"
- **Invoice:** PI00000002
- **Status:** Posted (*)
- **Entries:**
  1. **Debit:** `6500 Administrative expenses` - CHF 34.30
  2. **Credit:** `2000 Accounts payable` - CHF 34.30

#### Transaction 2b: IFJ Formation Fee (Payment)
- **Date:** 2024-05-26
- **Partner:** P00000002 Startup Help GmbH
- **Description:** "Payment of fee to create Sàrl paid to Startup Help GmbH"
- **Invoice:** PI00000002
- **Status:** Posted (*)
- **Tags:** `Payment:`
- **Entries:**
  1. **Debit:** `2000 Accounts payable` - CHF 34.30
  2. **Credit:** `1000 Cash` - CHF 34.30

#### Transaction 3a: Postal Service Fee (Invoice)
- **Date:** 2024-06-18
- **Partner:** P00000003 Post CH Netz AG
- **Description:** "Receipt for sending founding docs eingeschrieben"
- **Invoice:** PI00000003
- **Status:** Posted (*)
- **Entries:**
  1. **Debit:** `6700 Other operating expenses` - CHF 4.20
  2. **Credit:** `2000 Accounts payable` - CHF 4.20

#### Transaction 3b: Postal Service Fee (Payment)
- **Date:** 2024-06-18
- **Partner:** P00000003 Post CH Netz AG
- **Description:** "Receipt for sending founding docs eingeschrieben"
- **Invoice:** PI00000003
- **Status:** Posted (*)
- **Tags:** `Payment:`
- **Entries:**
  1. **Debit:** `2000 Accounts payable` - CHF 4.20
  2. **Credit:** `1000 Cash` - CHF 4.20

#### Transaction 4: Capital Contribution
- **Date:** 2024-06-26
- **Partner:** P00000001 John Smith
- **Description:** "Capital payment into abstratium paid into PF"
- **Invoice:** PI00000004
- **Status:** Posted (*)
- **Entries:**
  1. **Debit:** `1020 Bank Account (asset)` - CHF 2,000.00
  2. **Credit:** `2800 Share capital` - CHF 2,000.00

#### Transaction 5a: Bank Account Management Fee (Invoice)
- **Date:** 2024-07-24
- **Partner:** P00000004 PostFinance AG
- **Description:** "PRIX POUR LA GESTION DU COMPTE CONSIGNATION DU CAPITAL CRÉATION D'ENTREPRISE"
- **Invoice:** PI00000005
- **Status:** Posted (*)
- **Entries:**
  1. **Debit:** `6900 Financial expense` - CHF 15.00
  2. **Credit:** `2000 Accounts payable` - CHF 15.00

#### Transaction 5b: Bank Account Management Fee (Payment)
- **Date:** 2024-07-24
- **Partner:** P00000004 PostFinance AG
- **Description:** "PRIX POUR LA GESTION DU COMPTE CONSIGNATION DU CAPITAL CRÉATION D'ENTREPRISE"
- **Invoice:** PI00000005
- **Status:** Posted (*)
- **Tags:** `Payment:`
- **Entries:**
  1. **Debit:** `2000 Accounts payable` - CHF 15.00
  2. **Credit:** `1020 Bank Account (asset)` - CHF 15.00

#### Transaction 6: Purchase Goods for Resale (Cash Purchase via `PaymentForGoods` macro)
- **Date:** 2024-08-01
- **Partner:** P00000002 Startup Help GmbH
- **Description:** "Test 003.6 Purchase components for resale"
- **Invoice:** PI00000006
- **Status:** Posted (*)
- **Entries:**
  1. **Debit:** `1230 Goods held for resale` - CHF 50.00
  2. **Credit:** `1020 Bank Account (asset)` - CHF 50.00
- **Purpose:** Tests ASSET (inventory) debit direction and CASH credit direction. Exercises the `PaymentForGoods` macro.

#### Transaction 7: Supplier Invoice with Delayed Payment (via `PayInvoiceFromBank` macro)
- **Date:** 2024-08-03 (invoice) and 2024-08-10 (payment)
- **Partner:** P00000007 Anthropic
- **Description:** "Test 003.7 Anthropic API services invoice"
- **Invoice:** PI00000007
- **Status:** Posted (*)
- **Entries (Step 1 - Invoice, 2024-08-03):**
  1. **Debit:** `6570.002 Anthropic` - CHF 100.00
  2. **Credit:** `2000 Accounts payable` - CHF 100.00
- **Entries (Step 2 - Payment, 2024-08-10):**
  1. **Debit:** `2000 Accounts payable` - CHF 100.00
  2. **Credit:** `1020 Bank Account (asset)` - CHF 100.00
- **Purpose:** Tests A/P carrying a balance across dates (invoice on 08-03, payment on 08-10). Exercises the `PayInvoiceFromBank` macro which creates both transactions in one step.

#### Transaction 8: Sales Invoice with VAT (3-entry transaction)
- **Date:** 2024-08-06
- **Partner:** P00000001 John Smith
- **Description:** "Test 003.8 Consulting services with VAT"
- **Invoice:** SV00000001
- **Status:** Posted (*)
- **Entries:**
  1. **Debit:** `1100 Trade receivables` - CHF 108.10
  2. **Credit:** `3400 Services revenue` - CHF 100.00
  3. **Credit:** `2200 VAT payable` - CHF 8.10
- **Purpose:** Tests 3-entry transaction, ASSET (receivable) debit, REVENUE credit, and LIABILITY (VAT) credit. This is a fundamental Swiss accounting pattern. VAT is charged at the Swiss standard rate of 8.1%.

#### Transaction 9: Credit Note to Customer (Revenue Reversal)
- **Date:** 2024-08-08
- **Partner:** P00000001 John Smith
- **Description:** "Test 003.9 Credit note for partial refund of consulting services"
- **Invoice:** CN00000001
- **Status:** Posted (*)
- **Entries:**
  1. **Debit:** `3400 Services revenue` - CHF 40.00
  2. **Credit:** `1100 Trade receivables` - CHF 40.00
- **Purpose:** Tests REVENUE debit direction (reversal) and ASSET (receivable) credit direction. No previously tested transaction debits revenue.

#### Transaction 10: Expense Refund from Supplier (Expense Reversal)
- **Date:** 2024-08-12
- **Partner:** P00000002 Startup Help GmbH
- **Description:** "Test 003.10 Refund for overcharged administrative expense"
- **Invoice:** PC00000001
- **Status:** Posted (*)
- **Entries:**
  1. **Debit:** `1020 Bank Account (asset)` - CHF 25.00
  2. **Credit:** `6500 Administrative expenses` - CHF 25.00
- **Purpose:** Tests EXPENSE credit direction (reversal) and CASH debit direction. No previously tested transaction credits an expense account. The refund is credited to the same administrative expense account that was debited in Transaction 2a.

#### Transaction 11: Inventory Write-Down (via `InventoryAdjustment` macro)
- **Date:** 2024-12-13
- **Description:** "Test 003.11 Year-end inventory write-down for obsolete components"
- **Status:** Posted (*)
- **Tags:** `YearEnd:InventoryAdjustment`
- **Entries:**
  1. **Debit:** `6700 Other operating expenses` - CHF 10.00
  2. **Credit:** `1230 Goods held for resale` - CHF 10.00
- **Purpose:** Tests EXPENSE (6700) debit and ASSET (inventory) credit direction. Exercises the `InventoryAdjustment` macro. This is a year-end closing adjustment dated at the year-end closing date (2024-12-13).

#### Transaction 12a: Direct Tax Bill (Invoice)
- **Date:** 2024-12-13
- **Partner:** P00000006 Canton Vaud Tax Authority
- **Description:** "Test 003.12 Direct tax bill for 2024"
- **Invoice:** TX00000001
- **Status:** Posted (*)
- **Tags:** `TaxPayment:`
- **Entries:**
  1. **Debit:** `8900 Direct taxes` - CHF 75.00
  2. **Credit:** `2000 Accounts payable` - CHF 75.00
- **Purpose:** Records the tax charge when the bill arrives, creating an account payable to the tax authority.

#### Transaction 12b: Direct Tax Payment
- **Date:** 2024-12-13
- **Partner:** P00000006 Canton Vaud Tax Authority
- **Description:** "Payment of direct tax bill for 2024"
- **Invoice:** TX00000001
- **Status:** Posted (*)
- **Tags:** `Payment:`, `TaxPayment:`
- **Entries:**
  1. **Debit:** `2000 Accounts payable` - CHF 75.00
  2. **Credit:** `1020 Bank Account (asset)` - CHF 75.00
- **Purpose:** Pays the tax bill from the bank, clearing the account payable. Together with 12a this is a two-step tax payment (bill then pay), matching the pattern in the reference journal. This is a direct tax payment without a prior tax provision (tax provision and legal reserve allocation are tested in a later test case).

## Test Steps

### Scenario: Record initial business formation transactions

```gherkin
Feature: Initial Business Transactions

  Background:
    Given the user is signed into the application
    And the journal "Abstratium 2024" exists with a complete account tree
    And opening balances have been established for 2024-01-01
    And the user is on the journal detail page for "Abstratium 2024"

  Scenario: Record short-term loan from founder
    When the user navigates to the "Transactions" section
    And the user clicks "Create New Transaction"
    Then the transaction creation form should be displayed
    
    When the user enters "2024-05-25" as the transaction date
    And the user enters "P00000001 John Smith" as the partner
    And the user enters "Short term loan from John Smith, to start company" as the description
    And the user enters "PI00000001" as the invoice reference
    And the user sets the transaction status to "Posted"
    
    When the user clicks "Add Entry"
    And the user selects account "1000 Cash"
    And the user enters amount "38.50" CHF
    And the user selects "Debit" as the entry type
    Then the entry should be added to the transaction
    
    When the user clicks "Add Entry"
    And the user selects account "2210.001 Staff member"
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
    When the user creates a new transaction with date "2024-05-26"
    And the user enters partner "P00000002 Startup Help GmbH"
    And the user enters description "Fee to create Sàrl paid to Startup Help GmbH"
    And the user enters invoice "PI00000002"
    And the user adds a debit entry to "6500 Administrative expenses" for CHF 34.30
    And the user adds a credit entry to "2000 Accounts payable" for CHF 34.30
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the administrative expenses should increase by CHF 34.30
    And the accounts payable should increase by CHF 34.30
    
    # Record the payment
    When the user creates a new transaction with date "2024-05-26"
    And the user enters partner "P00000002 Startup Help GmbH"
    And the user enters description "Payment of fee to create Sàrl paid to Startup Help GmbH"
    And the user enters invoice "PI00000002"
    And the user adds tag "Payment:"
    And the user adds a debit entry to "2000 Accounts payable" for CHF 34.30
    And the user adds a credit entry to "1000 Cash" for CHF 34.30
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the accounts payable for IFJ should be cleared (CHF 0.00)
    And the cash account should decrease by CHF 34.30

  Scenario: Record postal service fee invoice and payment
    # Record the invoice
    When the user creates a new transaction with date "2024-06-18"
    And the user enters partner "P00000003 Post CH Netz AG"
    And the user enters description "Receipt for sending founding docs eingeschrieben"
    And the user enters invoice "PI00000003"
    And the user adds a debit entry to "6700 Other operating expenses" for CHF 4.20
    And the user adds a credit entry to "2000 Accounts payable" for CHF 4.20
    And the user saves the transaction
    Then the transaction should be saved successfully
    
    # Record the payment
    When the user creates a new transaction with date "2024-06-18"
    And the user enters partner "P00000003 Post CH Netz AG"
    And the user enters description "Receipt for sending founding docs eingeschrieben"
    And the user enters invoice "PI00000003"
    And the user adds tag "Payment:"
    And the user adds a debit entry to "2000 Accounts payable" for CHF 4.20
    And the user adds a credit entry to "1000 Cash" for CHF 4.20
    And the user saves the transaction
    Then the transaction should be saved successfully

  Scenario: Record capital contribution from founder
    When the user creates a new transaction with date "2024-06-26"
    And the user enters partner "P00000001 John Smith"
    And the user enters description "Capital payment into abstratium paid into PF"
    And the user enters invoice "PI00000004"
    And the user adds a debit entry to "1020 Bank Account (asset)" for CHF 2,000.00
    And the user adds a credit entry to "2800 Share capital" for CHF 2,000.00
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the bank account balance should be CHF 2,000.00
    And the share capital should be CHF 2,000.00

  Scenario: Record bank account management fee
    When the user creates a new transaction with date "2024-07-24"
    And the user enters partner "P00000004 PostFinance AG"
    And the user enters description "PRIX POUR LA GESTION DU COMPTE CONSIGNATION DU CAPITAL CRÉATION D'ENTREPRISE"
    And the user enters invoice "PI00000005"
    And the user adds a debit entry to "6900 Financial expense" for CHF 15.00
    And the user adds a credit entry to "2000 Accounts payable" for CHF 15.00
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the financial expenses should increase by CHF 15.00

  Scenario: Record bank account management fee payment
    When the user creates a new transaction with date "2024-07-24"
    And the user enters partner "P00000004 PostFinance AG"
    And the user enters description "PRIX POUR LA GESTION DU COMPTE CONSIGNATION DU CAPITAL CRÉATION D'ENTREPRISE"
    And the user enters invoice "PI00000005"
    And the user adds tag "Payment:"
    And the user adds a debit entry to "2000 Accounts payable" for CHF 15.00
    And the user adds a credit entry to "1020 Bank Account (asset)" for CHF 15.00
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the accounts payable should decrease by CHF 15.00
    And the bank account balance should decrease by CHF 15.00

  Scenario: Record purchase of goods for resale (PaymentForGoods macro)
    When the user navigates to the macros page and selects "PaymentForGoods"
    And the user enters date "2024-08-01"
    And the user enters partner "P00000002 Startup Help GmbH"
    And the user enters invoice "PI00000006"
    And the user enters amount "50.00"
    And the user enters description "Test 003.6 Purchase components for resale"
    And the user selects inventory account "1230 Goods held for resale"
    And the user selects bank account "1020 Bank Account (asset)"
    And the user executes the macro
    Then the transaction should be saved successfully
    And the inventory account balance should be CHF 50.00
    And the bank account balance should be CHF 1,935.00

  Scenario: Record supplier invoice with delayed payment (PayInvoiceFromBank macro)
    When the user navigates to the macros page and selects "PayInvoiceFromBank"
    And the user enters invoice date "2024-08-03"
    And the user enters payment date "2024-08-10"
    And the user enters partner "P00000007 Anthropic"
    And the user enters invoice "PI00000007"
    And the user enters amount "100.00"
    And the user enters description "Test 003.7 Anthropic API services invoice"
    And the user selects expense account "6570.002 Anthropic"
    And the user selects liability account "2000 Accounts payable"
    And the user selects bank account "1020 Bank Account (asset)"
    And the user executes the macro
    Then two transactions should be created (invoice and payment)
    And after the invoice date, accounts payable should be CHF 100.00
    And after the payment date, accounts payable should be CHF 0.00
    And the bank account balance should be CHF 1,835.00

  Scenario: Record sales invoice with VAT (3-entry transaction)
    When the user creates a new transaction with date "2024-08-06"
    And the user enters partner "P00000001 John Smith"
    And the user enters description "Test 003.8 Consulting services with VAT"
    And the user enters invoice "SV00000001"
    And the user adds a debit entry to "1100 Trade receivables" for CHF 108.10
    And the user adds a credit entry to "3400 Services revenue" for CHF 100.00
    And the user adds a credit entry to "2200 VAT payable" for CHF 8.10
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the receivables should be CHF 108.10
    And the revenue should be CHF 100.00
    And the VAT payable should be CHF 8.10

  Scenario: Record credit note to customer (revenue reversal)
    When the user creates a new transaction with date "2024-08-08"
    And the user enters partner "P00000001 John Smith"
    And the user enters description "Test 003.9 Credit note for partial refund of consulting services"
    And the user enters invoice "CN00000001"
    And the user adds a debit entry to "3400 Services revenue" for CHF 40.00
    And the user adds a credit entry to "1100 Trade receivables" for CHF 40.00
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the revenue should be CHF 60.00
    And the receivables should be CHF 68.10

  Scenario: Record expense refund from supplier (expense reversal)
    When the user creates a new transaction with date "2024-08-12"
    And the user enters partner "P00000002 Startup Help GmbH"
    And the user enters description "Test 003.10 Refund for overcharged administrative expense"
    And the user enters invoice "PC00000001"
    And the user adds a debit entry to "1020 Bank Account (asset)" for CHF 25.00
    And the user adds a credit entry to "6500 Administrative expenses" for CHF 25.00
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the administrative expenses should be CHF 9.30
    And the bank account balance should be CHF 1,860.00

  Scenario: Record inventory write-down (InventoryAdjustment macro)
    When the user navigates to the macros page and selects "InventoryAdjustment"
    And the user enters date "2024-12-13"
    And the user enters description "Test 003.11 Year-end inventory write-down for obsolete components"
    And the user enters adjustment amount "10.00"
    And the user selects inventory account "1230 Goods held for resale"
    And the user selects expense account "6700 Other operating expenses"
    And the user executes the macro
    Then the transaction should be saved successfully
    And the inventory account balance should be CHF 40.00
    And the other operating expenses should be CHF 14.20

  Scenario: Record direct tax bill and payment
    # Record the tax bill (invoice)
    When the user creates a new transaction with date "2024-12-13"
    And the user enters partner "P00000006 Canton Vaud Tax Authority"
    And the user enters description "Test 003.12 Direct tax bill for 2024"
    And the user enters invoice "TX00000001"
    And the user adds tag "TaxPayment:"
    And the user adds a debit entry to "8900 Direct taxes" for CHF 75.00
    And the user adds a credit entry to "2000 Accounts payable" for CHF 75.00
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the direct taxes should be CHF 75.00
    And the accounts payable should be CHF 75.00

    # Record the payment
    When the user creates a new transaction with date "2024-12-13"
    And the user enters partner "P00000006 Canton Vaud Tax Authority"
    And the user enters description "Payment of direct tax bill for 2024"
    And the user enters invoice "TX00000001"
    And the user adds tag "Payment:"
    And the user adds tag "TaxPayment:"
    And the user adds a debit entry to "2000 Accounts payable" for CHF 75.00
    And the user adds a credit entry to "1020 Bank Account (asset)" for CHF 75.00
    And the user saves the transaction
    Then the transaction should be saved successfully
    And the direct taxes should be CHF 75.00
    And the accounts payable should be CHF 0.00
    And the bank account balance should be CHF 1,785.00

  Scenario: Verify cumulative account balances after all transactions
    When the user views account balances as of "2024-12-13"
    Then the following balances should be displayed:
      | Account                                       | Balance       |
      | 1000 Cash                                     | CHF 0.00      |
      | 1020 Bank Account (asset)                     | CHF 1,785.00  |
      | 1100 Trade receivables            | CHF 68.10     |
      | 1230 Goods held for resale                    | CHF 40.00     |
      | 2000 Accounts payable   | CHF 0.00      |
      | 2200 VAT payable                              | CHF 8.10      |
      | 2210.001 Staff member                           | CHF 38.50     |
      | 2800 Share capital | CHF 2,000.00  |
      | 3400 Services revenue                    | CHF 60.00     |
      | 6500 Administrative expenses                  | CHF 9.30      |
      | 6570.002 Anthropic                            | CHF 100.00    |
      | 6700 Other operating expenses                 | CHF 14.20     |
      | 6900 Financial expense                        | CHF 15.00     |
      | 8900 Direct taxes            | CHF 75.00     |
    And the balance sheet equation should hold: Assets = Liabilities + Equity

  Scenario: Import built-in report templates
    Given the user has signed into the application
    And the journal "Abstratium 2024" is selected
    And any existing report templates have been deleted via the API

    When the user navigates to the "Reports" section
    And the user opens the report template options menu
    And the user clicks "Import Built-in"
    Then the built-in report templates should be fetched from the server
    And the templates should be imported via the report template import API
    And a success toast should be displayed containing "Successfully imported N report template(s)"
    And the report template dropdown should contain the imported templates
    And the "Balance Sheet" template should be available in the dropdown
    And the "Income Statement" template should be available in the dropdown
    And the "Trial Balance" template should be available in the dropdown

  Scenario: Verify Balance Sheet report
    Given the built-in report templates have been imported
    When the user navigates to the "Reports" section
    And the user selects the "Balance Sheet" report template
    Then the report should be generated and displayed
    And the report should contain a "Cash and Cash Equivalents" section
    And account "1020" should show a balance of "1,785.00" CHF
    And the report should contain an "Assets" section
    And account "1100" should show a balance of "68.10" CHF
    And account "1230" should show a balance of "40.00" CHF
    And the report should contain a "Liabilities" section
    And account "2200" should show a balance of "8.10" CHF
    And account "2210.001" should show a balance of "38.50" CHF
    And the report should contain an "Equity" section
    And account "2800" should show a balance of "2,000.00" CHF
    And the report should show a Net Loss of "153.50" CHF
    And the balance sheet should balance with Total Assets = Total Liabilities and Equity = "1,893.10" CHF
    And the Liabilities section should not contain negative values

  Scenario: Verify Income Statement report
    Given the built-in report templates have been imported
    When the user navigates to the "Reports" section
    And the user selects the "Income Statement" report template
    Then the report should be generated and displayed
    And the report should contain a "Revenue" section
    And account "3400" should show a balance of "60.00" CHF
    And the report should contain an "Expenses" section
    And account "6500" should show a balance of "9.30" CHF
    And account "6570.002" should show a balance of "100.00" CHF
    And account "6700" should show a balance of "14.20" CHF
    And account "6900" should show a balance of "15.00" CHF
    And account "8900" should show a balance of "75.00" CHF
    And the report should show a Net Loss of "153.50" CHF

  Scenario: Verify Swiss Balance Sheet (Bilan) report
    Given the built-in report templates have been imported
    When the user navigates to the "Reports" section
    And the user selects the "Swiss Balance Sheet (Bilan)" report template
    Then the report should be generated and displayed
    And the report should contain "Assets", "Liabilities", and "Equity" sections
    And account "1020" should show a balance of "1,785.00" CHF
    And account "1100" should show a balance of "68.10" CHF
    And account "1230" should show a balance of "40.00" CHF
    And account "2200" should show a balance of "8.10" CHF
    And account "2210.001" should show a balance of "38.50" CHF
    And account "2800" should show a balance of "2,000.00" CHF
    And the Liabilities and Equity sections should not contain negative values
    And the balance sheet should balance with Total = "1,893.10" CHF

  Scenario: Verify Swiss Income Statement (Compte de résultat) report
    Given the built-in report templates have been imported
    When the user navigates to the "Reports" section
    And the user selects the "Compte de résultat" report template
    Then the report should be generated and displayed
    And the report should contain "Revenue" and "Expenses" sections

  Scenario: Verify Trial Balance report
    Given the built-in report templates have been imported
    When the user navigates to the "Reports" section
    And the user selects the "Trial Balance" report template
    Then the report should be generated and displayed
    And the report should contain "Cash", "Assets", "Liabilities", "Equity", and "Expenses" sections
    And the report should contain account "1020" with balance "1,785.00"
    And the report should contain account "1100" with balance "68.10"
    And the report should contain account "1230" with balance "40.00"
    And the report should contain account "2210.001" with balance "38.50"
    And the report should contain account "2800" with balance "2,000.00"
    And the report should contain account "3400" with balance "60.00"
    And the report should contain account "6500" with balance "9.30"
    And the report should contain account "8900" with balance "75.00"
    And the report should contain account "6900" with balance "15.00"

  Scenario: Verify Partner Activity report
    Given the built-in report templates have been imported
    When the user navigates to the "Reports" section
    And the user selects the "Partner Activity" report template
    Then the report should be generated and displayed
    And the report should contain "Income", "Expenses", and "Net" columns
```

## Expected Results

1. **Transaction Recording:**
   - All transactions (1-12) are created successfully
   - Each transaction is properly dated and marked as posted
   - Partner/vendor information is correctly associated
   - Invoice references are stored and retrievable
   - Tags (`Payment:`, `YearEnd:InventoryAdjustment`) are properly applied where specified

2. **Double-Entry Accounting:**
   - Every transaction is balanced (debits = credits)
   - Accounts payable increases with invoices and decreases with payments
   - Cash and bank accounts reflect all movements correctly
   - Expense accounts accumulate properly and decrease with refunds
   - Revenue accounts increase with invoices and decrease with credit notes
   - Inventory accounts increase with purchases and decrease with write-downs
   - VAT payable tracks tax collected on sales

3. **Account Balances After Each Transaction:**

   Balances are shown as the raw sum of entry amounts (positive = debit, negative = credit). For credit-normal accounts (LIABILITY, EQUITY, REVENUE), a negative balance represents a credit balance (the normal direction).

   **After Transaction 1 (2024-05-25): Short-term Loan from Founder**

   | Account    | Balance  |
   |------------|----------|
   | 1000 Cash  | 38.50    |
   | 2210.001   | -38.50   |

   **After Transaction 2a (2024-05-26): Admin Fee Invoice**

   | Account    | Balance  |
   |------------|----------|
   | 1000 Cash  | 38.50    |
   | 2000 A/P   | -34.30   |
   | 6500 Admin | 34.30    |
   | 2210.001   | -38.50   |

   **After Transaction 2b (2024-05-26): Admin Fee Payment**

   | Account    | Balance  |
   |------------|----------|
   | 1000 Cash  | 4.20     |
   | 2000 A/P   | 0.00     |
   | 6500 Admin | 34.30    |
   | 2210.001   | -38.50   |

   **After Transaction 3a (2024-06-18): Postal Fee Invoice**

   | Account    | Balance  |
   |------------|----------|
   | 1000 Cash  | 4.20     |
   | 2000 A/P   | -4.20    |
   | 6500 Admin | 34.30    |
   | 6700 OOE   | 4.20     |
   | 2210.001   | -38.50   |

   **After Transaction 3b (2024-06-18): Postal Fee Payment**

   | Account    | Balance  |
   |------------|----------|
   | 1000 Cash  | 0.00     |
   | 2000 A/P   | 0.00     |
   | 6500 Admin | 34.30    |
   | 6700 OOE   | 4.20     |
   | 2210.001   | -38.50   |

   **After Transaction 4 (2024-06-26): Capital Contribution**

   | Account    | Balance   |
   |------------|-----------|
   | 1000 Cash  | 0.00      |
   | 1020 Bank  | 2,000.00  |
   | 2000 A/P   | 0.00      |
   | 2210.001   | -38.50    |
   | 2800       | -2,000.00 |
   | 6500 Admin | 34.30     |
   | 6700 OOE   | 4.20      |

   **After Transaction 5a (2024-07-24): Bank Fee Invoice**

   | Account    | Balance   |
   |------------|-----------|
   | 1000 Cash  | 0.00      |
   | 1020 Bank  | 2,000.00  |
   | 2000 A/P   | -15.00    |
   | 2210.001   | -38.50    |
   | 2800       | -2,000.00 |
   | 6500 Admin | 34.30     |
   | 6700 OOE   | 4.20      |
   | 6900 Fin   | 15.00     |

   **After Transaction 5b (2024-07-24): Bank Fee Payment**

   | Account    | Balance   |
   |------------|-----------|
   | 1000 Cash  | 0.00      |
   | 1020 Bank  | 1,985.00  |
   | 2000 A/P   | 0.00      |
   | 2210.001   | -38.50    |
   | 2800       | -2,000.00 |
   | 6500 Admin | 34.30     |
   | 6700 OOE   | 4.20      |
   | 6900 Fin   | 15.00     |

   **After Transaction 6 (2024-08-01): Purchase Goods for Resale**

   | Account    | Balance   |
   |------------|-----------|
   | 1000 Cash  | 0.00      |
   | 1020 Bank  | 1,935.00  |
   | 1230 Inv   | 50.00     |
   | 2000 A/P   | 0.00      |
   | 2210.001   | -38.50    |
   | 2800       | -2,000.00 |
   | 6500 Admin | 34.30     |
   | 6700 OOE   | 4.20      |
   | 6900 Fin   | 15.00     |

   **After Transaction 7a (2024-08-03): Supplier Invoice (PayInvoiceFromBank step 1)**

   | Account    | Balance   |
   |------------|-----------|
   | 1000 Cash  | 0.00      |
   | 1020 Bank  | 1,935.00  |
   | 1230 Inv   | 50.00     |
   | 2000 A/P   | -100.00   |
   | 2210.001   | -38.50    |
   | 2800       | -2,000.00 |
   | 6500 Admin | 34.30     |
   | 6570.002   | 100.00    |
   | 6700 OOE   | 4.20      |
   | 6900 Fin   | 15.00     |

   **After Transaction 7b (2024-08-10): Supplier Payment (PayInvoiceFromBank step 2)**

   | Account    | Balance   |
   |------------|-----------|
   | 1000 Cash  | 0.00      |
   | 1020 Bank  | 1,835.00  |
   | 1230 Inv   | 50.00     |
   | 2000 A/P   | 0.00      |
   | 2210.001   | -38.50    |
   | 2800       | -2,000.00 |
   | 6500 Admin | 34.30     |
   | 6570.002   | 100.00    |
   | 6700 OOE   | 4.20      |
   | 6900 Fin   | 15.00     |

   **After Transaction 8 (2024-08-06): Sales Invoice with VAT**

   | Account    | Balance   |
   |------------|-----------|
   | 1000 Cash  | 0.00      |
   | 1020 Bank  | 1,835.00  |
   | 1100 A/R   | 108.10    |
   | 1230 Inv   | 50.00     |
   | 2000 A/P   | 0.00      |
   | 2200 VAT   | -8.10     |
   | 2210.001   | -38.50    |
   | 2800       | -2,000.00 |
   | 3400 Rev   | -100.00   |
   | 6500 Admin | 34.30     |
   | 6570.002   | 100.00    |
   | 6700 OOE   | 4.20      |
   | 6900 Fin   | 15.00     |

   **After Transaction 9 (2024-08-08): Credit Note to Customer**

   | Account    | Balance   |
   |------------|-----------|
   | 1000 Cash  | 0.00      |
   | 1020 Bank  | 1,835.00  |
   | 1100 A/R   | 68.10     |
   | 1230 Inv   | 50.00     |
   | 2000 A/P   | 0.00      |
   | 2200 VAT   | -8.10     |
   | 2210.001   | -38.50    |
   | 2800       | -2,000.00 |
   | 3400 Rev   | -60.00    |
   | 6500 Admin | 34.30     |
   | 6570.002   | 100.00    |
   | 6700 OOE   | 4.20      |
   | 6900 Fin   | 15.00     |

   **After Transaction 10 (2024-08-12): Expense Refund from Supplier**

   | Account    | Balance   |
   |------------|-----------|
   | 1000 Cash  | 0.00      |
   | 1020 Bank  | 1,860.00  |
   | 1100 A/R   | 68.10     |
   | 1230 Inv   | 50.00     |
   | 2000 A/P   | 0.00      |
   | 2200 VAT   | -8.10     |
   | 2210.001   | -38.50    |
   | 2800       | -2,000.00 |
   | 3400 Rev   | -60.00    |
   | 6500 Admin | 9.30      |
   | 6570.002   | 100.00    |
   | 6700 OOE   | 4.20      |
   | 6900 Fin   | 15.00     |

   **After Transaction 11 (2024-12-13): Inventory Write-Down**

   | Account    | Balance   |
   |------------|-----------|
   | 1000 Cash  | 0.00      |
   | 1020 Bank  | 1,860.00  |
   | 1100 A/R   | 68.10     |
   | 1230 Inv   | 40.00     |
   | 2000 A/P   | 0.00      |
   | 2200 VAT   | -8.10     |
   | 2210.001   | -38.50    |
   | 2800       | -2,000.00 |
   | 3400 Rev   | -60.00    |
   | 6500 Admin | 9.30      |
   | 6570.002   | 100.00    |
   | 6700 OOE   | 14.20     |
   | 6900 Fin   | 15.00     |

   **After Transaction 12a (2024-12-13): Direct Tax Bill**

   | Account    | Balance   |
   |------------|-----------|
   | 1000 Cash  | 0.00      |
   | 1020 Bank  | 1,860.00  |
   | 1100 A/R   | 68.10     |
   | 1230 Inv   | 40.00     |
   | 2000 A/P   | -75.00    |
   | 2200 VAT   | -8.10     |
   | 2210.001   | -38.50    |
   | 2800       | -2,000.00 |
   | 3400 Rev   | -60.00    |
   | 6500 Admin | 9.30      |
   | 6570.002   | 100.00    |
   | 6700 OOE   | 14.20     |
   | 6900 Fin   | 15.00     |
   | 8900 Tax   | 75.00     |

   **After Transaction 12b (2024-12-13): Direct Tax Payment (Final)**

   | Account    | Balance   |
   |------------|-----------|
   | 1000 Cash  | 0.00      |
   | 1020 Bank  | 1,785.00  |
   | 1100 A/R   | 68.10     |
   | 1230 Inv   | 40.00     |
   | 2000 A/P   | 0.00      |
   | 2200 VAT   | -8.10     |
   | 2210.001   | -38.50    |
   | 2800       | -2,000.00 |
   | 3400 Rev   | -60.00    |
   | 6500 Admin | 9.30      |
   | 6570.002   | 100.00    |
   | 6700 OOE   | 14.20     |
   | 6900 Fin   | 15.00     |
   | 8900 Tax   | 75.00     |

   **Accounting Equation Verification (Final):**
   - Total Assets: 0.00 + 1,785.00 + 68.10 + 40.00 = 1,893.10
   - Total Liabilities: 8.10 (VAT) + 38.50 (John Smith) = 46.60
   - Total Equity: 2,000.00 (Share Capital) + Net Income
   - Net Income: Revenue (60.00) - Expenses (9.30 + 100.00 + 14.20 + 15.00 + 75.00 = 213.50) = -153.50 (net loss)
   - Total Equity: 2,000.00 - 153.50 = 1,846.50
   - Total L + E: 46.60 + 1,846.50 = 1,893.10 ✓ (matches Total Assets)

4. **Data Integrity:**
   - All transactions are persisted to the database
   - Transaction IDs are unique and stored
   - Invoice references link related transactions
   - Payment tags distinguish payment transactions from invoices
   - Transaction history is complete and queryable
   - Account balances are verified after every transaction

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
- [ ] User can import built-in report templates via the "Import Built-in" menu button
- [ ] A success toast is displayed confirming the number of imported report templates
- [ ] User can generate reports showing expense breakdown
- [ ] User can generate reports showing cash flow
- [ ] Balance Sheet report correctly shows assets, liabilities, and equity
- [ ] Income Statement report correctly shows revenue and expenses
- [ ] Swiss Balance Sheet (Bilan) report correctly reflects account balances
- [ ] Trial Balance report correctly shows all accounts with their balances
- [ ] Partner Activity report shows income, expenses, and net columns

## Notes

- This test demonstrates the **accrual accounting pattern**: expenses are recognized when incurred (invoice), and separately when paid (payment transaction)
- The pattern of paired transactions (invoice + payment) is common in business accounting
- Tags like `Payment:` help categorize and filter transactions
- Partner/vendor tracking enables relationship management and reporting
- Invoice references enable tracking of payables and receivables
- The test shows realistic company formation costs in Switzerland
- Transactions 6-12 exercise all account types in both debit and credit directions:
  - **ASSET (inventory)**: debited in transaction 6 (purchase), credited in transaction 11 (write-down)
  - **REVENUE**: credited in transaction 8 (invoice), debited in transaction 9 (credit note)
  - **EXPENSE**: debited in multiple transactions, credited in transaction 10 (refund)
  - **LIABILITY (VAT)**: credited in transaction 8 (VAT collected on sale)
  - **LIABILITY (A/P)**: carries a balance across dates in transaction 7 (invoice on 08-03, payment on 08-10)
- Transactions 6, 7, and 11 use built-in macros (`PaymentForGoods`, `PayInvoiceFromBank`, `InventoryAdjustment`)
- Transaction 8 is a 3-entry transaction (receivable debit, revenue credit, VAT credit)
- Tax provision and legal reserve allocation are tested in a later test case
- The built-in report templates are imported via the "Import Built-in" menu button on the Reports page before any report verification scenarios. Existing templates are deleted via the API first to avoid import conflicts. The import fetches `/builtin/report-templates-export.yaml` and posts it to the report template import API.

## Technical Notes

### Account Paths Used

```
Full paths for accounts referenced in this test:

Assets:
- 1 Assets:10 Current Assets:100 Cash and cash equivalents:1000 Cash
- 1 Assets:10 Current Assets:100 Cash and cash equivalents:1020 Bank Account (asset)
- 1 Assets:10 Current Assets:110 Accounts Receivable:1100 Trade receivables
- 1 Assets:10 Current Assets:120 Inventories:1230 Goods held for resale

Liabilities:
- 2 Liabilities:20 Current liabilities:200 Accounts payable:2000 Accounts payable
- 2 Liabilities:20 Current liabilities:220 Other short-term liabilities:2200 VAT payable
- 2 Liabilities:20 Current liabilities:220 Other short-term liabilities:2210 Other short-term liabilities:2210.001 Staff member

Equity:
- 2 Equity:28 Shareholders Equity:280 Share capital:2800 Share capital

Revenue:
- 3 Revenue:3400 Services revenue

Expenses:
- 6 Other operating expenses:6500 Administrative expenses
- 6 Other operating expenses:6570 IT and computing expenses
- 6 Other operating expenses:6570 IT and computing expenses:6570.002 Anthropic
- 6 Other operating expenses:6700 Other operating expenses
- 6 Other operating expenses:6900 Financial expense
- 8 Non-operating expenses:8900 Direct taxes
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
