# Test Case 001: Create Journal with Account Tree

**Feature:** Journal and Account Management  
**Date:** 2026-04-03  

## Preconditions

See [PRECONDITIONS.md](./PRECONDITIONS.md) for general preconditions.

## Test Objective

Verify that a user can create a new journal and establish a complete account tree structure following Swiss accounting standards (Swiss GAAP FER), including assets, liabilities, equity, and expense accounts.

## Test Data

### Journal Details
- **Journal Name:** "Abstratium 2026"
- **Currency:** CHF (Swiss Franc)
- **Fiscal Year Start:** 2026-01-01
- **Fiscal Year End:** 2026-12-31

### Account Tree Structure

The following account hierarchy should be created, inspired by the Swiss chart of accounts:

#### 1. Assets (Actifs)
```
1 Assets
├── 10 Current Assets
│   ├── 100 Cash and cash equivalents
│   │   ├── 1000 Cash
│   │   └── 1020 Bank Account
│   ├── 110 Accounts Receivable
│   │   └── 1100 Accounts receivable (Debtors)
│   └── 120 Inventories and non-invoiced services
│       └── 1230 Goods held for resale
```

#### 2. Liabilities (Passif - Liabilities)
```
2 Liabilities
└── 20 Current liabilities
    ├── 200 Accounts payable (A/P)
    │   └── 2000 Accounts payable (suppliers & creditors)
    └── 220 Other short-term liabilities
        ├── 2200 VAT payable
        ├── 2201 VAT settlement
        ├── 2206 Withholding tax payable
        └── 2210 Other short-term liabilities
            └── 2210.001 John Smith

```

#### 2. Equity (Passif - Equity)
```
2 Equity
├── 28 Shareholders Equity (legal entities)
│   └── 280 Basic, shareholder or foundation capital
│       └── 2800 Basic, shareholder or foundation capital
└── 290 Reserves and retained earnings
    ├── 2950 Legal reserves from profit
    ├── 2970 Profit carried forward or loss carried forward
    └── 2979 Annual profit or loss
```

#### 3. Income
```
3 Net proceeds from sales of goods and services
├── 3400 Revenues from services
```

#### 6. Operating Expenses
```
6 Other Operating Expenses, Depreciations and Value Adjustments, Financial result
├── 6570 IT and computing expenses, including leasing
│   ├── 6570.001 Microsoft
│   ├── 6570.002 Anthropic
└── 6900 Financial expense
```

#### 8. Non-Operational Expenses
```
8 Non-Operational, Extraordinary, Non-Recurring or Prior-Period Expenses and Income
├── 8900 Direct taxes (legal entities)
└── 8910 Taxes from prior periods
```

## Test Steps

### Scenario: Create a new journal with complete account tree

```gherkin
Feature: Journal and Account Management

  Background:
    Given the user is signed into the application
    And the user is on the journals overview page

  Scenario: Create new journal with Swiss chart of accounts
    When the user clicks on "Create New Journal"
    Then the journal creation form should be displayed
    
    When the user enters "Abstratium 2026" as the journal name
    And the user selects "CHF" as the currency
    And the user sets the fiscal year start date to "2026-01-01"
    And the user sets the fiscal year end date to "2026-12-31"
    And the user clicks "Create Journal"
    Then the journal "Abstratium 2026" should be created successfully
    And the user should be redirected to the journal detail page
    And a success message "Journal created successfully" should be displayed
    
    # Create Assets hierarchy
    When the user navigates to the "Accounts" section
    And the user clicks "Add Root Account"
    And the user enters account code "1"
    And the user enters account name "Assets"
    And the user clicks "Save Account"
    Then the account "1 Assets" should be created
    
    When the user selects account "1 Assets"
    And the user clicks "Add Child Account"
    And the user enters account code "10"
    And the user enters account name "Current Assets"
    And the user clicks "Save Account"
    Then the account "10 Current Assets" should be created as a child of "1 Assets"
    
    When the user selects account "10 Current Assets"
    And the user clicks "Add Child Account"
    And the user enters account code "100"
    And the user enters account name "Cash and cash equivalents"
    And the user clicks "Save Account"
    Then the account "100 Cash and cash equivalents" should be created
    
    When the user selects account "100 Cash and cash equivalents"
    And the user clicks "Add Child Account"
    And the user enters account code "1000"
    And the user enters account name "Cash"
    And the user clicks "Save Account"
    Then the account "1000 Cash" should be created
    
    When the user selects account "100 Cash and cash equivalents"
    And the user clicks "Add Child Account"
    And the user enters account code "1020"
    And the user enters account name "Bank Account"
    And the user clicks "Save Account"
    Then the account "1020 Bank Account" should be created
    
    # Create Accounts Receivable
    When the user selects account "10 Current Assets"
    And the user clicks "Add Child Account"
    And the user enters account code "110"
    And the user enters account name "Accounts Receivable"
    And the user clicks "Save Account"
    Then the account "110 Accounts Receivable" should be created
    
    When the user selects account "110 Accounts Receivable"
    And the user clicks "Add Child Account"
    And the user enters account code "1100"
    And the user enters account name "Accounts receivable (Debtors)"
    And the user clicks "Save Account"
    Then the account "1100 Accounts receivable (Debtors)" should be created
    
    # Create Inventory accounts
    When the user selects account "10 Current Assets"
    And the user clicks "Add Child Account"
    And the user enters account code "120"
    And the user enters account name "Inventories and non-invoiced services"
    And the user clicks "Save Account"
    Then the account "120 Inventories and non-invoiced services" should be created
    
    When the user selects account "120 Inventories and non-invoiced services"
    And the user clicks "Add Child Account"
    And the user enters account code "1200"
    And the user enters account name "Inventory of hardware and components"
    And the user clicks "Save Account"
    Then the account "1200 Inventory of hardware and components" should be created
    
    When the user selects account "120 Inventories and non-invoiced services"
    And the user clicks "Add Child Account"
    And the user enters account code "1210"
    And the user enters account name "Finished goods"
    And the user clicks "Save Account"
    Then the account "1210 Finished goods" should be created
    
    When the user selects account "120 Inventories and non-invoiced services"
    And the user clicks "Add Child Account"
    And the user enters account code "1220"
    And the user enters account name "Work in progress"
    And the user clicks "Save Account"
    Then the account "1220 Work in progress" should be created
    
    When the user selects account "120 Inventories and non-invoiced services"
    And the user clicks "Add Child Account"
    And the user enters account code "1230"
    And the user enters account name "Goods held for resale"
    And the user clicks "Save Account"
    Then the account "1230 Goods held for resale" should be created
    
    # Create Non-current assets
    When the user selects account "1 Actifs / Assets"
    And the user clicks "Add Child Account"
    And the user enters account code "14"
    And the user enters account name "Non-current assets"
    And the user clicks "Save Account"
    Then the account "14 Non-current assets" should be created
    
    When the user selects account "14 Non-current assets"
    And the user clicks "Add Child Account"
    And the user enters account code "150"
    And the user enters account name "Movable tangible fixed assets"
    And the user clicks "Save Account"
    Then the account "150 Movable tangible fixed assets" should be created
    
    # Create Liabilities root and structure
    When the user navigates to the "Accounts" section
    And the user clicks "Add Root Account"
    And the user enters account code "2"
    And the user enters account name "Liabilities"
    And the user clicks "Save Account"
    Then the account "2 Liabilities" should be created
    
    When the user selects account "2 Liabilities"
    And the user clicks "Add Child Account"
    And the user enters account code "20"
    And the user enters account name "Current liabilities"
    And the user clicks "Save Account"
    Then the account "20 Current liabilities" should be created
    
    When the user selects account "20 Current liabilities"
    And the user clicks "Add Child Account"
    And the user enters account code "200"
    And the user enters account name "Accounts payable (A/P)"
    And the user clicks "Save Account"
    Then the account "200 Accounts payable (A/P)" should be created
    
    When the user selects account "200 Accounts payable (A/P)"
    And the user clicks "Add Child Account"
    And the user enters account code "2000"
    And the user enters account name "Accounts payable (suppliers & creditors)"
    And the user clicks "Save Account"
    Then the account "2000 Accounts payable (suppliers & creditors)" should be created
    
    When the user selects account "20 Current liabilities"
    And the user clicks "Add Child Account"
    And the user enters account code "220"
    And the user enters account name "Other short-term liabilities"
    And the user clicks "Save Account"
    Then the account "220 Other short-term liabilities" should be created
    
    When the user selects account "220 Other short-term liabilities"
    And the user clicks "Add Child Account"
    And the user enters account code "2200"
    And the user enters account name "VAT payable"
    And the user clicks "Save Account"
    Then the account "2200 VAT payable" should be created
    
    When the user selects account "220 Other short-term liabilities"
    And the user clicks "Add Child Account"
    And the user enters account code "2201"
    And the user enters account name "VAT settlement"
    And the user clicks "Save Account"
    Then the account "2201 VAT settlement" should be created
    
    When the user selects account "220 Other short-term liabilities"
    And the user clicks "Add Child Account"
    And the user enters account code "2206"
    And the user enters account name "Withholding tax payable"
    And the user clicks "Save Account"
    Then the account "2206 Withholding tax payable" should be created
    
    When the user selects account "220 Other short-term liabilities"
    And the user clicks "Add Child Account"
    And the user enters account code "2210"
    And the user enters account name "Other short-term liabilities"
    And the user clicks "Save Account"
    Then the account "2210 Other short-term liabilities" should be created

    When the user selects account "2210 Other short-term liabilities"
    And the user clicks "Add Child Account"
    And the user enters account code "2210.001"
    And the user enters account name "John Smith"
    And the user clicks "Save Account"
    Then the account "2210.001 John Smith" should be created
    
    # Note: Continue with remaining account hierarchies following the same pattern
    # This test case demonstrates the pattern - the full implementation would continue
    # with Equity accounts (2 Equity), Expense accounts (6), and Non-operational (8)
    
    # Verification
    When the user views the complete account tree
    Then the account tree should display all created accounts in hierarchical order
    And each account should show its code and name
    And the parent-child relationships should be correctly displayed
    And the total number of root accounts should be at least 3 (Assets, Liabilities, Equity)
```

## Expected Results

1. **Journal Creation:**
   - Journal "Abstratium 2026" is created with CHF currency
   - Fiscal year dates are correctly set
   - Journal appears in the journals list

2. **Account Tree Structure:**
   - All accounts are created with correct codes and names
   - Parent-child relationships are correctly established
   - Account hierarchy is displayed correctly in the UI
   - Accounts follow Swiss GAAP FER numbering convention

3. **Data Integrity:**
   - All accounts are associated with the correct journal
   - Account codes are unique within the journal
   - No orphaned accounts exist
   - Tree structure is navigable and expandable/collapsible

## Acceptance Criteria

- [ ] User can create a new journal with all required fields
- [ ] User can create root-level accounts
- [ ] User can create child accounts under parent accounts
- [ ] Account tree displays correct hierarchy
- [ ] Account codes and names are stored correctly
- [ ] Multiple levels of nesting are supported (at least 4 levels deep)
- [ ] UI provides clear feedback for successful account creation
- [ ] Account tree can be expanded and collapsed
- [ ] All accounts are persisted to the database

## Notes

- Account codes use a hierarchical numbering system where child accounts extend parent codes
