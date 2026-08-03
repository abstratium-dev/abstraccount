# Test Case 001: Create Journal with Account Tree

**Feature:** Journal and Account Management  
**Date:** 2026-04-03  

## Preconditions

See [PRECONDITIONS.md](./PRECONDITIONS.md) for general preconditions.

## Test Objective

Verify that a user can create a new journal (which automatically receives a starter chart of accounts) and then add the additional accounts needed by later test cases, following Swiss accounting standards (Swiss GAAP FER).

## Test Data

### Journal Details
- **Journal Name:** "Abstratium 2024"
- **Currency:** CHF (Swiss Franc)
- **Fiscal Year Start:** 2024-01-01
- **Fiscal Year End:** 2024-12-31

### Starter Chart of Accounts (created automatically)

When a new journal is created, the backend (`JournalCreationService`) automatically
creates a starter chart of accounts. The test does **not** create these accounts
manually — it only verifies that they exist after journal creation.

#### 1. Assets
```
1 Assets
├── 10 Current Assets
│   ├── 100 Cash and cash equivalents
│   │   ├── 1000 Cash
│   │   └── 1020 Bank Account
│   ├── 110 Accounts Receivable
│   │   └── 1100 Trade receivables
│   ├── 120 Inventories
│   │   └── 1200 Inventory of hardware and components
│   ├── 130 Receivables from shareholders
│   └── 14 Non-current assets
│       ├── 140 Participations
│       └── 150 Fixed assets
```

#### 2. Liabilities
```
2 Liabilities
└── 20 Current liabilities
    ├── 200 Accounts payable
    │   └── 2000 Accounts payable
    ├── 220 Other short-term liabilities
    │   ├── 2208 Direct taxes
    │   └── 2210 Other short-term liabilities
    │       └── 2210.001 Staff member
    ├── 230 Transitory liabilities
    └── 240 Provisions
```

#### 2. Equity
```
2 Equity
├── 28 Shareholders Equity
│   └── 280 Share capital
│       └── 2800 Share capital
└── 290 Reserves and retained earnings
    ├── 2950 Legal reserves
    ├── 2970 Profit carried forward
    └── 2979 Annual profit or loss
```

> **Note on the duplicate root code `2`:** Both Liabilities and Equity use root
> account code `2`. This is intentional and correct per Swiss SME accounting
> practice (Swiss GAAP FER): both are "Passif" (the credit side of the balance
> sheet) and share the `2x` numbering range. They are distinguished by account
> *name* (`2 Liabilities` vs `2 Equity`), not by code.

#### 3. Revenue
```
3 Revenue
├── 3400 Services revenue
└── 3600 Other operating income
```

#### 4. Expenses
```
4 Cost of materials and goods
└── 4000 Purchases of materials and components

5 Personnel expenses
└── 5000 Salaries

6 Other operating expenses
├── 6300 Insurance expense
├── 6500 Administrative expenses
├── 6570 IT and computing expenses
├── 6700 Other operating expenses
├── 6800 Depreciation
└── 6900 Financial expense

8 Non-operating expenses
└── 8900 Direct taxes
```

### Additional Accounts (created manually by this test)

The following accounts are **not** part of the starter chart and must be created
manually. They are required by later test cases (002–006).

#### Under 120 Inventories
```
1230 Goods held for resale
```

#### Under 220 Other short-term liabilities
```
2200 VAT payable
2201 VAT settlement
2206 Withholding tax payable
```

#### Under 6570 IT and computing expenses
```
6570.001 Microsoft
6570.002 Anthropic
```

#### Under 8 Non-operating expenses
```
8910 Taxes from prior periods
```

> **Note on the tax accounts (2208, 8900, 8910):** These three accounts model
> the direct-tax lifecycle for a Swiss legal entity:
> - **8900 Direct taxes** — the *expense* account (from starter chart). Debited when
>   a tax charge is recognised (either on receipt of the tax bill, or at year-end
>   via a tax provision).
> - **2208 Direct taxes** — the *liability* account on the balance sheet (from
>   starter chart). Credited at year-end when a tax provision is recorded
>   (Dr 8900 / Cr 2208), and debited when the provision is released against the
>   actual tax payment. It holds the tax still owed at the end of the year.
> - **8910 Taxes from prior periods** — the expense account for tax charges
>   relating to prior fiscal years (created manually by this test). It is created
>   for completeness; the example journal does not currently post any amount to it.
>
> The reference journal shows the typical pattern: the tax bill arrives and is
> booked as an expense against accounts payable (Dr 8900 / Cr 2000), then paid a
> few days later (Dr 2000 / Cr 1020); separately, a year-end tax provision
> transaction (Dr 8900 / Cr 2208) records any tax still owed at year-end. A
> provision-then-release cycle (create provision, later reverse it against the
> actual payment) is exercised in a later test case.

## Test Steps

### Scenario: Create a new journal with starter chart and additional accounts

```gherkin
Feature: Journal and Account Management

  Background:
    Given the user is signed into the application
    And the user is on the journals overview page

  Scenario: Create new journal (receives starter chart automatically)
    When the user clicks on "Create New Journal"
    Then the journal creation form should be displayed
    
    When the user enters "Abstratium 2024" as the journal name
    And the user selects "CHF" as the currency
    And the user sets the fiscal year start date to "2024-01-01"
    And the user sets the fiscal year end date to "2024-12-31"
    And the user clicks "Create Journal"
    Then the journal "Abstratium 2024" should be created successfully
    And the user should be redirected to the journal detail page
    And a success message "Journal created successfully" should be displayed
    # The backend automatically creates the starter chart of accounts at this point

  Scenario: Navigate to accounts page and create additional accounts
    When the user navigates to the "Accounts" section
    Then the accounts page should be displayed
    And the starter chart accounts should already be present

    # Create 1230 Goods held for resale under 120 Inventories
    When the user selects account "120 Inventories"
    And the user clicks "Add Child Account"
    And the user enters account code "1230"
    And the user enters account name "Goods held for resale"
    And the user clicks "Save Account"
    Then the account "1230 Goods held for resale" should be created as a child of "120 Inventories"

    # Create 2200 VAT payable under 220 Other short-term liabilities
    When the user selects account "220 Other short-term liabilities"
    And the user clicks "Add Child Account"
    And the user enters account code "2200"
    And the user enters account name "VAT payable"
    And the user clicks "Save Account"
    Then the account "2200 VAT payable" should be created

    # Create 2201 VAT settlement under 220 Other short-term liabilities
    When the user selects account "220 Other short-term liabilities"
    And the user clicks "Add Child Account"
    And the user enters account code "2201"
    And the user enters account name "VAT settlement"
    And the user clicks "Save Account"
    Then the account "2201 VAT settlement" should be created

    # Create 2206 Withholding tax payable under 220 Other short-term liabilities
    When the user selects account "220 Other short-term liabilities"
    And the user clicks "Add Child Account"
    And the user enters account code "2206"
    And the user enters account name "Withholding tax payable"
    And the user clicks "Save Account"
    Then the account "2206 Withholding tax payable" should be created

    # Create 6570.001 Microsoft under 6570 IT and computing expenses
    When the user selects account "6570 IT and computing expenses"
    And the user clicks "Add Child Account"
    And the user enters account code "6570.001"
    And the user enters account name "Microsoft"
    And the user clicks "Save Account"
    Then the account "6570.001 Microsoft" should be created

    # Create 6570.002 Anthropic under 6570 IT and computing expenses
    When the user selects account "6570 IT and computing expenses"
    And the user clicks "Add Child Account"
    And the user enters account code "6570.002"
    And the user enters account name "Anthropic"
    And the user clicks "Save Account"
    Then the account "6570.002 Anthropic" should be created

    # Create 8910 Taxes from prior periods under 8 Non-operating expenses
    When the user selects account "8 Non-operating expenses"
    And the user clicks "Add Child Account"
    And the user enters account code "8910"
    And the user enters account name "Taxes from prior periods"
    And the user clicks "Save Account"
    Then the account "8910 Taxes from prior periods" should be created

  Scenario: Verify the complete account tree
    When the user views the complete account tree
    Then the account tree should display all accounts in hierarchical order
    And each account should show its code and name
    And the parent-child relationships should be correctly displayed

    # Verify starter chart accounts
    Then the following accounts should exist:
      | Code   | Name                              |
      | 1      | Assets                            |
      | 10     | Current Assets                    |
      | 100    | Cash and cash equivalents         |
      | 1000   | Cash                              |
      | 1020   | Bank Account                      |
      | 110    | Accounts Receivable               |
      | 1100   | Trade receivables                 |
      | 120    | Inventories                       |
      | 2      | Liabilities                       |
      | 20     | Current liabilities               |
      | 200    | Accounts payable                  |
      | 2000   | Accounts payable                  |
      | 220    | Other short-term liabilities      |
      | 2208   | Direct taxes                      |
      | 2210   | Other short-term liabilities      |
      | 2210.001 | Staff member                    |
      | 2      | Equity                            |
      | 28     | Shareholders Equity               |
      | 280    | Share capital                     |
      | 2800   | Share capital                     |
      | 290    | Reserves and retained earnings    |
      | 2950   | Legal reserves                    |
      | 2970   | Profit carried forward            |
      | 2979   | Annual profit or loss             |
      | 3      | Revenue                           |
      | 3400   | Services revenue                  |
      | 6      | Other operating expenses          |
      | 6500   | Administrative expenses           |
      | 6570   | IT and computing expenses         |
      | 6700   | Other operating expenses          |
      | 6900   | Financial expense                 |
      | 8      | Non-operating expenses            |
      | 8900   | Direct taxes                      |

    # Verify additional accounts created by this test
    Then the following accounts should exist:
      | Code     | Name                      |
      | 1230     | Goods held for resale     |
      | 2200     | VAT payable               |
      | 2201     | VAT settlement            |
      | 2206     | Withholding tax payable   |
      | 6570.001 | Microsoft                 |
      | 6570.002 | Anthropic                 |
      | 8910     | Taxes from prior periods  |
```

## Expected Results

1. **Journal Creation:**
   - Journal "Abstratium 2024" is created with CHF currency
   - Fiscal year dates are correctly set
   - Journal appears in the journals list
   - Starter chart of accounts is automatically created by the backend

2. **Additional Account Creation:**
   - All 7 additional accounts are created with correct codes and names
   - Parent-child relationships are correctly established
   - Each additional account is placed under the correct parent from the starter chart

3. **Account Tree Structure:**
   - All accounts (starter + additional) are present in the tree
   - Parent-child relationships are correctly displayed in the UI
   - Accounts follow Swiss GAAP FER numbering convention

4. **Data Integrity:**
   - All accounts are associated with the correct journal
   - Account codes are unique within the journal
   - No orphaned accounts exist
   - Tree structure is navigable and expandable/collapsible

## Acceptance Criteria

- [ ] User can create a new journal with all required fields
- [ ] Starter chart of accounts is automatically created by the backend
- [ ] User can create child accounts under parent accounts from the starter chart
- [ ] Account tree displays correct hierarchy
- [ ] Account codes and names are stored correctly
- [ ] Multiple levels of nesting are supported (at least 4 levels deep)
- [ ] UI provides clear feedback for successful account creation
- [ ] Account tree can be expanded and collapsed
- [ ] All accounts are persisted to the database

## Notes

- Account codes use a hierarchical numbering system where child accounts extend parent codes
- The starter chart is created by `JournalCreationService.java` in the backend
- Only 7 additional accounts need to be created manually; the rest come from the starter chart
- The `2` code is used for both `2 Liabilities` and `2 Equity` — they are distinguished by name
