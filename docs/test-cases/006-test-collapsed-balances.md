# Test Case 006: Collapsed Parent Account Balances

**Feature:** Accounts table collapse/expand and subtree balance display  
**Date:** 2026-04-07  

## Preconditions

See [PRECONDITIONS.md](./PRECONDITIONS.md) for general preconditions.

**CRITICAL:** This test case depends on:
- [Test Case 001](./001-create-journal-with-accounts.md) - Journal and account tree must exist
- [Test Case 002](./002-open-the-books.md) - Opening balances must be established
- [Test Case 003](./003-record-initial-business-transactions.md) - Initial transactions recorded
- [Test Case 004](./004.1-test-macros.md) - Macro transactions recorded (004.1 through 004.9)

**Note:** Tests 004.8 (TaxProvision) and 004.10 (LegalReserveAllocation) have been moved to [Test Case 007](./007-year-end-closing.md). The balances in this test reflect the state after test 004 only (without year-end closing entries). The accounts checked in this test (6 Expenses, 1 Assets, 100 Cash, 10 Current Assets, 1020 Bank, 1000 Cash) are not affected by the year-end closing entries.

## Test Objective

Verify that the accounts table correctly displays balances when parent accounts are collapsed vs expanded:

1. **Collapsed parent** shows the **subtree sum** (sum of the parent's direct balance plus all descendants' balances), rendered in bold.
2. **Expanded parent** shows only the **direct balance** (entries posted directly to the parent account), which is `0` when no entries reference the parent directly.
3. **Collapsing a parent hides all its descendants** from the table.
4. **Expanding a parent reveals its children** again.

## Test Data

After tests 001-004, the following account hierarchy and balances exist in journal "Abstratium 2024":

### Expense hierarchy (key for testing)

```
6 Expenses (root, no direct entries → direct balance = 0)
├── 6500 Administrative expenses (9.30)
├── 6570 IT and computing expenses (no direct entries → direct balance = 0)
│   ├── 6570.001 Microsoft (17.00)
│   └── 6570.002 Anthropic (100.00)
├── 6700 Advertising costs (14.20)
└── 6900 Financial expense (16.00)
```

- `6 Expenses` subtree sum = 9.30 + 17.00 + 100.00 + 14.20 + 16.00 = **156.50**
- `6570 IT and computing expenses` subtree sum = 17.00 + 100.00 = **117.00**
- `6570 IT and computing expenses` direct balance = **0** (no entries posted directly to 6570)

### Asset hierarchy (key for testing)

```
1 Assets (root, no direct entries → direct balance = 0)
├── 10 Current Assets (no direct entries → direct balance = 0)
│   ├── 100 Cash and cash equivalents (no direct entries → direct balance = 0)
│   │   ├── 1000 Cash (0)
│   │   └── 1020 Bank Account (1,680.50)
│   ├── 110 Accounts Receivable (no direct entries → direct balance = 0)
│   │   └── 1100 Trade receivables (179.10)
│   └── 120 Inventories (no direct entries → direct balance = 0)
│       └── 1230 Goods held for resale (40.00)
```

- `1 Assets` subtree sum = 1,680.50 + 179.10 + 40.00 = **1,899.60**
- `100 Cash and cash equivalents` subtree sum = 0 + 1,680.50 = **1,680.50**
- `10 Current Assets` subtree sum = 1,680.50 + 179.10 + 40.00 = **1,899.60**

## Scenarios

```gherkin
Feature: Collapsed Parent Account Balances

  Background:
    Given the user is signed into the application
    And the journal "Abstratium 2024" exists with all transactions from tests 001-004
    And the user navigates to the Accounts page

  # ---------------------------------------------------------------------------
  # Expanded state: parent shows direct balance (0 if no direct entries)
  # ---------------------------------------------------------------------------

  Scenario: Expanded parent with no direct entries shows 0
    Given the account "6 Expenses" is expanded
    When the user views the balance for "6 Expenses"
    Then the balance should be "0.00" (direct balance only)
    And the balance should NOT be bold (not in displaced-balance style)

  Scenario: Expanded mid-level parent with no direct entries shows 0
    Given the account "6570 IT and computing expenses" is expanded
    When the user views the balance for "6570 IT and computing expenses"
    Then the balance should be "0.00" (direct balance only)
    And the children "6570.001 Microsoft" and "6570.002 Anthropic" should be visible

  Scenario: Expanded root asset shows 0
    Given the account "1 Assets" is expanded
    When the user views the balance for "1 Assets"
    Then the balance should be "0.00" (direct balance only)

  # ---------------------------------------------------------------------------
  # Collapsed state: parent shows subtree sum, in bold
  # ---------------------------------------------------------------------------

  Scenario: Collapsed parent shows subtree sum
    Given the account "6 Expenses" is expanded
    When the user collapses the account "6 Expenses"
    Then the children of "6 Expenses" should NOT be visible
    And the balance for "6 Expenses" should be "156.50" (subtree sum)
    And the balance should be bold (displaced-balance style)

  Scenario: Collapsed mid-level parent shows subtree sum
    Given the account "6570 IT and computing expenses" is expanded
    When the user collapses the account "6570 IT and computing expenses"
    Then the children "6570.001 Microsoft" and "6570.002 Anthropic" should NOT be visible
    And the balance for "6570 IT and computing expenses" should be "117.00" (subtree sum)
    And the balance should be bold (displaced-balance style)

  Scenario: Collapsed root asset shows subtree sum
    Given the account "1 Assets" is expanded
    When the user collapses the account "1 Assets"
    Then all descendants of "1 Assets" should NOT be visible
    And the balance for "1 Assets" should be "1,899.60" (subtree sum)

  Scenario: Collapsed cash parent shows subtree sum
    Given the account "100 Cash and cash equivalents" is expanded
    When the user collapses the account "100 Cash and cash equivalents"
    Then "1000 Cash" and "1020 Bank Account" should NOT be visible
    And the balance for "100 Cash and cash equivalents" should be "1,680.50"

  # ---------------------------------------------------------------------------
  # Toggle: collapse then expand restores children and direct balance
  # ---------------------------------------------------------------------------

  Scenario: Expanding a collapsed parent restores children and direct balance
    Given the account "6 Expenses" is collapsed
    When the user expands the account "6 Expenses"
    Then the children of "6 Expenses" should be visible again
    And the balance for "6 Expenses" should be "0.00" (direct balance only)
    And the balance should NOT be bold

  Scenario: Collapsing then expanding preserves child balances
    Given the account "6570 IT and computing expenses" is expanded
    When the user collapses the account "6570 IT and computing expenses"
    And the user expands the account "6570 IT and computing expenses"
    Then "6570.001 Microsoft" should be visible with balance "17.00"
    And "6570.002 Anthropic" should be visible with balance "100.00"

  # ---------------------------------------------------------------------------
  # Nested collapse: collapsing a parent hides grandchildren too
  # ---------------------------------------------------------------------------

  Scenario: Collapsing a parent hides all descendants at every level
    Given all accounts are expanded
    When the user collapses the account "10 Current Assets"
    Then "100 Cash and cash equivalents" should NOT be visible
    And "1000 Cash" should NOT be visible
    And "1020 Bank Account" should NOT be visible
    And "1100 Trade receivables" should NOT be visible
    And "1230 Goods held for resale" should NOT be visible
    And the balance for "10 Current Assets" should be "1,899.60" (subtree sum)

  # ---------------------------------------------------------------------------
  # Leaf accounts: no collapse toggle, balance always shown
  # ---------------------------------------------------------------------------

  Scenario: Leaf account has no collapse toggle
    Given the user views the account "1020 Bank Account"
    Then no collapse toggle should be displayed for "1020 Bank Account"
    And the balance should be "1,680.50"

  Scenario: Leaf account with zero balance shows 0
    Given the user views the account "1000 Cash"
    Then no collapse toggle should be displayed for "1000 Cash"
    And the balance should be "0.00"
```

## Acceptance Criteria

- [ ] Expanded parent with no direct entries shows balance 0.00 (not bold)
- [ ] Collapsed parent shows subtree sum (bold, displaced-balance class)
- [ ] Collapsing a parent hides all descendants
- [ ] Expanding a collapsed parent restores children and shows direct balance
- [ ] Collapsing then expanding preserves child balances
- [ ] Nested collapse hides grandchildren and deeper descendants
- [ ] Leaf accounts have no collapse toggle
- [ ] Leaf account balance is always shown (including 0.00 for zero-balance leaf)

## Notes

- The collapse state is persisted to localStorage under `collapsed-accounts-table:{journalId}`.
- The `displaced-balance` CSS class is applied to the balance span when the account is collapsed, making it bold.
- The subtree sum is computed by `getSubtreeBalanceRecursive` which sums the account's direct balance plus all descendants' direct balances.
- A parent account can have entries posted directly to it (not just through children), in which case its expanded balance would be non-zero. This test uses accounts that have no direct entries to clearly distinguish the two states.
