# Test Case 007: Year-End Closing - Tax Provision and Legal Reserve Allocation

**Feature:** Year-end closing entries via macros  
**Date:** 2026-04-07  

## Preconditions

See [PRECONDITIONS.md](./PRECONDITIONS.md) for general preconditions.

**CRITICAL:** This test case depends on:
- [Test Case 001](./001-create-journal-with-accounts.md) - Journal and account tree must exist
- [Test Case 002](./002-open-the-books.md) - Opening balances must be established
- [Test Case 003](./003-record-initial-business-transactions.md) - Initial transactions recorded
- [Test Case 004](./004.1-test-macros.md) - Macro transactions recorded (including 004.9 TaxPayment)
- [Test Case 005](./005-test-filters.md) - Filter tests completed
- [Test Case 006](./006-test-collapsed-balances.md) - Collapsed balance tests completed

The built-in macros must have been imported in test 004.1 (the "Import built-in macros" scenario).

## Test Objective

Verify that the year-end closing macros (TaxProvision and LegalReserveAllocation) correctly create the year-end closing entries needed before closing the books:

1. **TaxProvision** - Records an additional tax provision at year-end for tax estimated to be owed but not yet billed. This is distinct from the TaxPayment macro (test 004.9) which pays a tax bill that arrives during the year.
2. **LegalReserveAllocation** - Allocates 5% of annual profit to legal reserves, as required by Swiss corporate law (CO Art. 671-671a).

The test also verifies that financial reports (Balance Sheet, Income Statement, Trial Balance) correctly reflect the state of the journal after these year-end closing entries.

See [YEAR_END_CLOSING_GUIDE.md](../YEAR_END_CLOSING_GUIDE.md) for the full year-end closing process context.

## Initial State (After Test 004)

After tests 003 and 004 (including 004.9 TaxPayment with no prior provision), the journal has the following balances:

### Assets
- **1000 Cash**: 0.00 CHF
- **1020 Bank Account**: 1,680.50 CHF
- **1100 Trade receivables**: 179.10 CHF
- **1230 Goods held for resale**: 40.00 CHF
- **Total Assets**: 1,899.60 CHF

### Liabilities
- **2000 Accounts payable**: 0.00 CHF
- **2200 VAT payable**: 8.10 CHF
- **2208 Tax liabilities**: 0.00 CHF
- **2210.001 Staff member**: 0.00 CHF
- **Total Liabilities**: 8.10 CHF

### Equity
- **2800 Share capital**: 2,000.00 CHF
- **2950 Legal reserves**: 0.00 CHF
- **2979 Annual profit/loss**: 0.00 CHF
- **Total Equity (excl. net income)**: 2,000.00 CHF

### Income Statement
- **Revenue**: 178.00 CHF (3400 Services revenue)
- **Expenses**:
  - 6500 Administrative expenses: 9.30 CHF
  - 6570.001 IT expense: 17.00 CHF
  - 6570.002 Anthropic: 100.00 CHF
  - 6700 Advertising costs: 14.20 CHF
  - 6900 Financial expense: 16.00 CHF
  - 8900 Direct taxes: 130.00 CHF (75.00 from T12a + 55.00 from 004.9)
- **Total Expenses**: 286.50 CHF
- **Net Loss**: 108.50 CHF

## Macro Under Test: TaxProvision

### Scenarios: Execute TaxProvision macro to record year-end tax provision

```gherkin
Feature: Year-End Closing - TaxProvision

  Background:
    Given the user is signed into the application
    And the journal "Abstratium 2024" exists with a complete account tree
    And opening balances have been established for 2024-01-01
    And initial business transactions have been recorded (test 003)
    And macro transactions 004.1 through 004.9 have been recorded
    And the user is on the journal detail page for "Abstratium 2024"

  Scenario: Record year-end tax provision using TaxProvision macro
    When the user navigates to the "Macros" section
    Then the macro selection interface should be displayed
    And the TaxProvision macro should be available in the macro list

    When the user selects the "TaxProvision" macro
    Then the macro parameter form should be displayed
    And all 3 parameters should be displayed with appropriate UI controls
    And the form should show the following fields:
      | Field | Type | Default Value | Required |
      | Transaction date | Date picker | {year}-12-31 | Yes |
      | Description of tax provision | Text input | Tax provision for {year} | Yes |
      | Total tax provision (income + capital) | Number input | (empty) | Yes |
    And default values should be pre-filled where specified
    And required fields should be clearly marked

    When the user enters "2024-12-31" as the transaction date
    And the user enters "Test 007 tax provision for 2024" as the description
    And the user enters "50.00" as the total tax provision amount
    Then all required fields should be filled
    And the form should pass validation

    When the user clicks "Execute Macro"
    Then the transaction should be created successfully via the macro system
    And the transaction should be persisted to the database
    And the transaction should be balanced (debits = credits)
    And the journal should be displayed

    When the user views the newly created transaction
    Then the transaction should have the following properties:
      | Property | Value |
      | Date | 2024-12-31 |
      | Description | Test 007 tax provision for 2024 |
      | Status | Posted (*) |
      | Tags | YearEnd:TaxProvision |
    And the transaction should have 2 entries
    And entry 1 should debit account "8900 Direct taxes" for CHF 50.00
    And entry 2 should credit account "2208 Tax liabilities (provisions)" for CHF -50.00
    And the tag `YearEnd:TaxProvision` should be automatically added
    And the transaction should have a unique ID

    When the user views account balances
    Then the "8900 Direct taxes" account should show a balance of 180.00
      # 130.00 (from test 004) + 50.00 (from this provision)
    And the "2208 Tax liabilities" account should show a balance of 50.00
      # 0.00 + 50.00 provision
    And the balance sheet equation should hold
```

## Macro Under Test: LegalReserveAllocation

### Scenarios: Execute LegalReserveAllocation macro to allocate to legal reserves

```gherkin
Feature: Year-End Closing - LegalReserveAllocation

  Background:
    Given the user is signed into the application
    And the journal "Abstratium 2024" exists with a complete account tree
    And the TaxProvision macro has been executed (test 007.1)
    And the user is on the journal detail page for "Abstratium 2024"

  Scenario: Allocate profit to legal reserves using LegalReserveAllocation macro
    When the user navigates to the "Macros" section
    Then the macro selection interface should be displayed
    And the LegalReserveAllocation macro should be available in the macro list

    When the user selects the "LegalReserveAllocation" macro
    Then the macro parameter form should be displayed
    And all 3 parameters should be displayed with appropriate UI controls
    And the form should show the following fields:
      | Field | Type | Default Value | Required |
      | Allocation date | Date picker | {year}-12-31 | Yes |
      | Amount to allocate | Number input | (empty) | Yes |
      | Description | Text input | Legal reserve allocation for {year} (5% of profit) | Yes |
    And default values should be pre-filled where specified
    And required fields should be clearly marked

    When the user enters "2024-12-31" as the allocation date
    And the user enters "10.00" as the allocation amount
    And the user enters "Test 007 legal reserve allocation for 2024" as the description
    Then all required fields should be filled
    And the form should pass validation

    When the user clicks "Execute Macro"
    Then the transaction should be created successfully via the macro system
    And the transaction should be persisted to the database
    And the transaction should be balanced (debits = credits)
    And the journal should be displayed

    When the user views the newly created transaction
    Then the transaction should have the following properties:
      | Property | Value |
      | Date | 2024-12-31 |
      | Description | Test 007 legal reserve allocation for 2024 |
      | Status | Posted (*) |
      | Tags | YearEnd:LegalReserve |
    And the transaction should have 2 entries
    And entry 1 should debit account "2979 Annual profit/loss" for CHF 10.00
      # Reduces distributable profit
    And entry 2 should credit account "2950 Legal reserves" for CHF -10.00
      # Increases legal reserves
    And the tag `YearEnd:LegalReserve` should be automatically added
    And the transaction should have a unique ID

    When the user views account balances
    Then the "2979 Annual profit/loss" account should show a debit balance of 10.00
      # 0.00 + 10.00 debit = 10.00 (reduces distributable profit)
    And the "2950 Legal reserves" account should show a credit balance of 10.00
      # 0.00 + 10.00 credit = 10.00 (increases reserves)
    And the balance sheet equation should hold
```

## Phase 2.6: Print Financial Statements for Tax Declaration

**CRITICAL:** These reports must be captured BEFORE Phase 3 closing entries zero out
the revenue and expense accounts. Once Phase 3 is executed, the income statement
will be blank. These are the financial statements that would be filed with the
Canton Vaud tax authorities.

### Scenarios: Verify reports reflect year-end closing entries (every line)

```gherkin
Feature: Year-End Closing - Report Verification (Phase 2.6)

  Background:
    Given the user is signed into the application
    And the journal "Abstratium 2024" exists with all transactions from tests 001-004
    And the TaxProvision macro has been executed (test 007.1)
    And the LegalReserveAllocation macro has been executed (test 007.2)
    And the user is on the journal detail page for "Abstratium 2024"

  Scenario: Verify Balance Sheet report after year-end closing (every line)
    When the user navigates to the "Reports" section
    And the user selects the "Balance Sheet" report template
    Then the report should be generated and displayed

    # Cash and Cash Equivalents section
    And the report should contain a "Cash and Cash Equivalents" section
    And account "1020" should show a balance of "1,680.50" CHF
      # 1000 Cash = 0.00 (hidden — zero balance)
    And the "Cash and Cash Equivalents Total" should be "1,680.50" CHF

    # Other Assets section
    And the report should contain an "Other Assets" section
    And account "1100" should show a balance of "179.10" CHF
    And account "1230" should show a balance of "40.00" CHF
    And the "Other Assets Total" should be "219.10" CHF

    # Total Assets
    And the "Total Assets" should be "1,899.60" CHF

    # Liabilities section
    And the report should contain a "Liabilities" section
      # 2000 Accounts payable = 0.00 (hidden)
      # 2210.001 Staff member = 0.00 (hidden)
    And account "2200" should show a balance of "8.10" CHF
    And account "2208" should show a balance of "50.00" CHF
      # From test 007.1 TaxProvision
    And the "Liabilities Total" should be "58.10" CHF
    And the Liabilities section should not contain negative values

    # Equity section
    And the report should contain an "Equity" section
    And account "2800" should show a balance of "2,000.00" CHF
    And account "2950" should show a balance of "10.00" CHF
      # From test 007.2 LegalReserveAllocation
    And account "2979" should show a balance of "-10.00" CHF
      # Debit balance from LegalReserveAllocation (reduces distributable profit)
    And the "Equity Total" should be "2,000.00" CHF

    # Net Loss
    And the report should show a Net Loss of "158.50" CHF
      # 178.00 revenue - 336.50 expenses (including 50.00 tax provision) = 158.50

    # Total Liabilities and Equity (must balance with Total Assets)
    And the "Total Liabilities and Equity" should be "1,899.60" CHF

  Scenario: Verify Income Statement report after year-end closing (every line)
    When the user navigates to the "Reports" section
    And the user selects the "Income Statement" report template
    Then the report should be generated and displayed

    # Revenue section
    And the report should contain a "Revenue" section
    And account "3400" should show a balance of "178.00" CHF
    And the "Revenue Total" should be "178.00" CHF

    # Expenses section
    And the report should contain an "Expenses" section
    And account "6500" should show a balance of "9.30" CHF
    And account "6570.001" should show a balance of "17.00" CHF
    And account "6570.002" should show a balance of "100.00" CHF
    And account "6700" should show a balance of "14.20" CHF
    And account "6900" should show a balance of "16.00" CHF
    And account "8900" should show a balance of "180.00" CHF
      # 130.00 (75.00 from test 003 T12a + 55.00 from test 004.9 TaxPayment)
      # + 50.00 (from test 007.1 TaxProvision) = 180.00
    And the "Expenses Total" should be "336.50" CHF

    # Net Loss
    And the report should show a Net Loss of "158.50" CHF
      # 178.00 revenue - 336.50 expenses = 158.50

  Scenario: Verify Trial Balance report after year-end closing
    When the user navigates to the "Reports" section
    And the user selects the "Trial Balance" report template
    Then the report should be generated and displayed
    And the report should contain "Cash", "Assets", "Equity", "Revenue", and "Expenses" sections
    And the report should contain account "1020" with balance "1,680.50"
    And the report should contain account "1100" with balance "179.10"
    And the report should contain account "2800" with balance "2,000.00"
    And the report should contain account "3400" with balance "178.00"
    And the report should contain account "8900" with balance "180.00"
    And the report should contain account "2208" with balance "50.00"
    And the report should contain account "2950" with balance "10.00"
```

## Phase 3: Close the Books

This phase closes all income and expense accounts by transferring their
balances to the equity account 2979 (Annual profit/loss). The closing is
dated 2024-12-31. All transactions in the test suite are dated in 2024,
so the closing captures every income/expense entry.

### Scenarios: Close the books and verify the result

```gherkin
Feature: Year-End Closing - Phase 3: Close the Books

  Background:
    Given the user is signed into the application
    And the journal "Abstratium 2024" exists with all transactions from tests 001-004
    And the TaxProvision macro has been executed (test 007.1)
    And the LegalReserveAllocation macro has been executed (test 007.2)
    And the pre-closing financial statements have been verified (tests 7.3-7.5)
    And the user is on the journal detail page for "Abstratium 2024"

  Scenario: Close the books at year end
    When the user opens the "More options" menu
    And the user clicks "close books at end of year"
    Then the "Year-End: Close the Books" page should be displayed

    When the user enters "2024-12-31" as the closing date
    And the user selects "2:290:2979" as the equity account
    And the user clicks "Preview Closing Entries"
    Then a confirmation modal should be displayed
    And the modal should show 7 accounts to be closed

    # Revenue (credit balance, displayed as negative)
    And the preview should contain account "3400" with balance "-178.00"
    # Expenses (debit balances, displayed as positive)
    And the preview should contain account "6500" with balance "9.30"
    And the preview should contain account "6570.001" with balance "17.00"
    And the preview should contain account "6570.002" with balance "100.00"
    And the preview should contain account "6700" with balance "14.20"
    And the preview should contain account "6900" with balance "16.00"
    # 8900 = 180.00 (75.00 from T12a + 55.00 from 004.9 TaxPayment
    #   + 50.00 from TaxProvision — all dated in 2024)
    And the preview should contain account "8900" with balance "180.00"

    When the user clicks "Confirm & Close the Books"
    Then 7 closing transactions should be created
    And each transaction should be tagged with "Closing"
    And each transaction should have a description starting with "Close "
    And the journal should be locked (closing the books auto-locks the journal)
    And the 🔒 lock icon should appear in the header next to the journal name
    And the user should be navigated to the journal page

  Scenario: Verify Income Statement after closing
    When the user navigates to the "Reports" section
    And the user selects the "Income Statement" report template
    Then the report should be generated and displayed
    # All revenue and expense accounts are zeroed (hidden by hideZeroBalances)
    And the report should contain "Revenue" and "Expenses" sections
    And the net result should be zero (no non-zero Net Loss/Income line)

  Scenario: Verify Balance Sheet after closing
    When the user navigates to the "Reports" section
    And the user selects the "Balance Sheet" report template
    Then the report should be generated and displayed
    # Assets unchanged
    And account "1020" should show a balance of "1,680.50" CHF
    And account "1100" should show a balance of "179.10" CHF
    And account "1230" should show a balance of "40.00" CHF
    And the "Total Assets" should be "1,899.60" CHF
    # Liabilities unchanged
    And account "2200" should show a balance of "8.10" CHF
    And account "2208" should show a balance of "50.00" CHF
    And the "Liabilities Total" should be "58.10" CHF
    # Equity: 2979 now absorbs the full 2024 net loss
    And account "2800" should show a balance of "2,000.00" CHF
    And account "2950" should show a balance of "10.00" CHF
    # 2979 = 10.00 (LegalReserveAllocation) + 158.50 (net loss from closing) = 168.50 (debit)
    And account "2979" should show a balance of "-168.50" CHF
    And the "Equity Total" should be "1,841.50" CHF
    # Net result = 0 (all accounts closed)
    And the "Total Liabilities and Equity" should be "1,899.60" CHF
```

## Expected Account Balances After Year-End Closing

### After TaxProvision (test 007.1)

| Account | Before | After | Change |
|---------|--------|-------|--------|
| 8900 Direct taxes | 130.00 | 180.00 | +50.00 (debit) |
| 2208 Tax liabilities | 0.00 | 50.00 | +50.00 (credit) |

### After LegalReserveAllocation (test 007.2)

| Account | Before | After | Change |
|---------|--------|-------|--------|
| 2979 Annual profit/loss | 0.00 | 10.00 (debit) | +10.00 (debit reduces distributable profit) |
| 2950 Legal reserves | 0.00 | 10.00 (credit) | +10.00 (credit increases reserves) |

### Final State After All Year-End Closing Entries

| Account | Balance | Type |
|---------|---------|------|
| 1000 Cash | 0.00 | Asset |
| 1020 Bank Account | 1,680.50 | Asset |
| 1100 Trade receivables | 179.10 | Asset |
| 1230 Goods held for resale | 40.00 | Asset |
| 2000 Accounts payable | 0.00 | Liability |
| 2200 VAT payable | 8.10 | Liability |
| 2208 Tax liabilities | 50.00 | Liability |
| 2210.001 Staff member | 0.00 | Liability |
| 2800 Share capital | 2,000.00 | Equity |
| 2950 Legal reserves | 10.00 | Equity |
| 2979 Annual profit/loss | 10.00 (debit) | Equity |
| 3400 Services revenue | 178.00 | Revenue |
| 6500 Administrative expenses | 9.30 | Expense |
| 6570.001 IT expense | 17.00 | Expense |
| 6570.002 Anthropic | 100.00 | Expense |
| 6700 Advertising costs | 14.20 | Expense |
| 6900 Financial expense | 16.00 | Expense |
| 8900 Direct taxes | 180.00 | Expense |

- **Total Assets**: 1,899.60 CHF
- **Total Liabilities**: 58.10 CHF (8.10 + 50.00)
- **Total Equity**: 2,000.00 + 10.00 - 10.00 = 2,000.00 CHF
- **Net Loss**: 178.00 - 336.50 = 158.50 CHF
- **Balance Sheet Check**: 1,899.60 = 58.10 + 2,000.00 - 158.50 ✓

## Acceptance Criteria

- [ ] TaxProvision macro is available in macro selection
- [ ] TaxProvision parameter form displays all 3 required fields with correct types
- [ ] TaxProvision default value `{year}-12-31` is displayed in the date field
- [ ] TaxProvision default value `Tax provision for {year}` is displayed in the description field
- [ ] TaxProvision transaction debits direct tax expense account (8900)
- [ ] TaxProvision transaction credits tax liability account (2208)
- [ ] Tag `YearEnd:TaxProvision` is automatically added
- [ ] LegalReserveAllocation macro is available in macro selection
- [ ] LegalReserveAllocation parameter form displays all 3 required fields with correct types
- [ ] LegalReserveAllocation default value `{year}-12-31` is displayed in the date field
- [ ] LegalReserveAllocation default value `Legal reserve allocation for {year} (5% of profit)` is displayed in the description field
- [ ] LegalReserveAllocation transaction debits annual profit/loss account (2979)
- [ ] LegalReserveAllocation transaction credits legal reserves account (2950)
- [ ] Tag `YearEnd:LegalReserve` is automatically added

### Phase 2.6: Balance Sheet (every line verified)

- [ ] Cash and Cash Equivalents section: 1020 = 1,680.50, subtotal = 1,680.50
- [ ] Other Assets section: 1100 = 179.10, 1230 = 40.00, subtotal = 219.10
- [ ] Total Assets = 1,899.60
- [ ] Liabilities section: 2200 = 8.10, 2208 = 50.00, subtotal = 58.10
- [ ] Liabilities section has no negative values (sign inversion check)
- [ ] Equity section: 2800 = 2,000.00, 2950 = 10.00, 2979 = -10.00, subtotal = 2,000.00
- [ ] Net Loss = 158.50 CHF
- [ ] Total Liabilities and Equity = 1,899.60 (balances with Total Assets)

### Phase 2.6: Income Statement (every line verified)

- [ ] Revenue section: 3400 = 178.00, subtotal = 178.00
- [ ] Expenses section: 6500 = 9.30, 6570.001 = 17.00, 6570.002 = 100.00, 6700 = 14.20, 6900 = 16.00, 8900 = 180.00
- [ ] Expenses subtotal = 336.50
- [ ] Net Loss = 158.50 CHF

### Trial Balance

- [ ] Trial Balance report shows all accounts with correct balances
- [ ] Balance sheet equation holds after all year-end closing entries

### Phase 3: Close the Books

- [ ] "close books at end of year" menu item navigates to the close-books page
- [ ] Closing date field defaults to {year}-12-31
- [ ] Equity account autocomplete allows selecting 2:290:2979
- [ ] Preview shows 7 accounts with correct balances (3400=-178.00, 6500=9.30, 6570.001=17.00, 6570.002=100.00, 6700=14.20, 6900=16.00, 8900=180.00)
- [ ] 8900 preview balance is 180.00 (75.00 T12a + 55.00 TaxPayment + 50.00 TaxProvision, all dated in 2024)
- [ ] Confirming creates 7 closing transactions, each tagged with "Closing"
- [ ] Each closing transaction has a description starting with "Close "
- [ ] After closing, the journal is locked (confirmed via API)
- [ ] After closing, the 🔒 lock icon appears in the header next to the journal name

### Phase 3: Post-Closing Reports

- [ ] Income Statement: all revenue and expense accounts zeroed, net result = 0
- [ ] Balance Sheet: 2979 = -168.50 (10.00 LegalReserveAllocation + 158.50 net loss from closing)
- [ ] Balance Sheet: Equity Total = 1,841.50
- [ ] Balance Sheet: Total L+E = 1,899.60 (still balances)

## Notes

- This test case covers Phase 2.4 (Tax provisions), Phase 2.5 (Legal reserve allocation), Phase 2.6 (Print financial statements), and Phase 3 (Closing entries) of the year-end closing process described in [YEAR_END_CLOSING_GUIDE.md](../YEAR_END_CLOSING_GUIDE.md)
- The TaxProvision macro records a tax provision at year-end for additional tax estimated to be owed. This is distinct from the TaxPayment macro (test 004.9) which pays a tax bill that arrives during the year.
- The LegalReserveAllocation macro is **MANDATORY for Swiss Sàrl** under CO Art. 671-671a: 5% of annual profit must be allocated to legal reserves until reserves reach 20% of share capital
- In this test, the company has a net loss, so in practice no legal reserve allocation would be required. However, we test the macro mechanics with a small amount (CHF 10.00) to verify it works correctly
- The year-end closing entries use date `2024-12-31` (the last day of the fiscal year)
- **All test transactions are dated in 2024**: every transaction in tests 003 and 004 (including the 004.9 TaxPayment, dated 2024-11-15) falls within fiscal year 2024, so the 2024-12-31 closing captures all of them. This keeps the test suite internally consistent: after Phase 3 closing, the income statement is completely blank and the balance sheet absorbs the full net loss into 2979.
- **Phase 2.6 is critical**: The Balance Sheet and Income Statement are verified line by line BEFORE Phase 3 closing, because after Phase 3 the income statement will be blank (all revenue and expense accounts zeroed out). These are the financial statements that would be filed with the Canton Vaud tax authorities.
- **2979 after closing**: 2979 = 10.00 (debit from LegalReserveAllocation) + 158.50 (net loss from closing all 2024 accounts: 178.00 revenue − 336.50 expenses) = 168.50 (debit)
- **Journal locking**: Closing the books automatically locks the journal. This protects the closed period from further changes (no transactions, accounts, or macros can be created, modified, or deleted). The lock is visible in the header (🔒 icon) and on the journal-management page. See [test 008](./008-journal-locking.md) for comprehensive locking tests.
- After Phase 3, the next step in the year-end closing process is:
  - Phase 4: Transfer profit/loss to retained earnings (January 1 of next year)
- Phase 4 is not yet covered by this test case
