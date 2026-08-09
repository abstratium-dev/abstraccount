# Test Case 009: New Year — Create Next Year's Journal

**Feature:** New year journal creation — Phase 4 of the year-end closing process
**Date:** 2026-08-07

## Preconditions

See [PRECONDITIONS.md](./PRECONDITIONS.md) for general preconditions.

**CRITICAL:** This test case depends on:
- [Test Case 001](./001-create-journal-with-accounts.md) - Journal and account tree must exist
- [Test Case 002](./002-open-the-books.md) - Opening balances must be established
- [Test Case 003](./003-record-initial-business-transactions.md) - Initial transactions recorded
- [Test Case 004](./004.1-test-macros.md) - Macro transactions recorded (including 004.9 TaxPayment)
- [Test Case 007](./007-year-end-closing.md) - Year-end closing (TaxProvision, LegalReserveAllocation, closing entries)
- [Test Case 008](./008-journal-locking.md) - Journal locking (the source journal is locked after closing)

The journal "Abstratium 2024" must exist with all transactions from tests 003 and 004, the
year-end closing entries from test 007, and the journal must be locked (test 7.5 / test 008).

## Test Objective

Verify that the "New Year" operation correctly creates a new fiscal-year journal by:

1. **Navigating to the New Year page** via the header context menu (☰ → "new year").
2. **Previewing the new journal creation** — the preview modal shows the source journal title,
   the new journal title, the opening date, the retained earnings and annual profit/loss
   accounts, and a table of accounts with their opening balances.
3. **Executing the new year creation** — a new journal is created with all accounts copied
   from the source journal, opening balance transactions for balance-sheet accounts, and a
   profit/loss transfer transaction from 2979 (Annual profit/loss) to 2970 (Retained earnings).
4. **Verifying the new journal** — the new journal appears in the journal list, has the correct
   title, has accounts, and has opening balance transactions with the expected balances.
5. **Switching back to the original journal** — via the journal-management page dropdown, and
   verifying the original journal still exists with its data intact.

## Test Data

| Field | Value |
|-------|-------|
| Source journal | Abstratium 2024 |
| New journal title | Abstratium 2025 |
| Opening date | 2025-01-01 |
| Retained earnings account | 2:290:2970 (Profit carried forward) |
| Annual profit/loss account | 2:290:2979 (Annual profit/loss) |

### Expected Opening Balances (from 2024 year-end closing)

After the 2024 year-end closing (test 007), the balance-sheet account balances at 2024-12-31 are:

| Account | Code Path | Balance (CHF) | Type |
|---------|-----------|---------------|------|
| 1020 Bank Account | 1:10:100:1020 | 1,680.50 | Asset |
| 1100 Receivables | 1:10:110:1100 | 179.10 | Asset |
| 1230 Inventory | 1:20:120:1230 | 40.00 | Asset |
| 2200 Payables | 2:20:200:2200 | -8.10 | Liability |
| 2208 Tax liabilities | 2:20:220:2208 | -50.00 | Liability |
| 2800 Share Capital | 2:28:280:2800 | -2,000.00 | Equity |
| 2950 Legal reserves | 2:29:290:2950 | -10.00 | Equity |
| 2979 Annual profit/loss | 2:29:290:2979 | 168.50 | Equity (debit = loss) |

The profit/loss transfer moves the 2979 balance (168.50 debit = loss) to 2970 (Retained earnings).
In the new journal:
- 2979 starts at 0 (opening balance + transfer = 0)
- 2970 starts at 168.50 (debit = loss carried forward)

## Scenarios

```gherkin
Feature: New Year Journal Creation

  Background:
    Given the user is signed into the application
    And the journal "Abstratium 2024" exists with all transactions from tests 001-004
    And the year-end closing entries from test 007 have been recorded
    And the books have been closed (test 7.5), which locked the journal
    And any previously created "Abstratium 2025" journal has been deleted for cleanup

  # ============================================================================
  # Scenario 1: Navigate to the New Year page
  # ============================================================================

  Scenario: User navigates to the New Year page from the header menu
    When the user opens the header context menu (☰ button)
    And the user clicks the "new year" link
    Then the New Year page should be displayed
    And the heading "New Year: Create New Journal" should be visible
    And the source journal name "Abstratium 2024" should be displayed
    And the form should have fields for new journal title, opening date,
        retained earnings account, and annual profit/loss account

  # ============================================================================
  # Scenario 2: Preview the new journal creation
  # ============================================================================

  Scenario: User previews the new year journal creation
    Given the user is on the New Year page
    When the user fills in the new journal title with "Abstratium 2025"
    And the user fills in the opening date with "2025-01-01"
    And the user selects the retained earnings account "2:290:2970"
    And the user selects the annual profit/loss account "2:290:2979"
    And the user clicks the "Preview New Journal" button
    Then a confirmation modal should appear
    And the modal should show the new journal title "Abstratium 2025"
    And the modal should show the source journal title "Abstratium 2024"
    And the modal should show the opening date "2025-01-01"
    And the modal should show the account count
    And the modal should show the opening balance count
    And the modal should show a table of accounts with non-zero opening balances
    And the table should include account "1020" with balance "CHF 1680.50"
    And the table should include account "1100" with balance "CHF 179.10"
    And the table should include account "1230" with balance "CHF 40.00"
    And the table should include account "2200" with balance "CHF -8.10"
    And the table should include account "2208" with balance "CHF -50.00"
    And the table should include account "2800" with balance "CHF -2000.00"
    And the table should include account "2950" with balance "CHF -10.00"
    And the table should include account "2979" with balance "CHF 168.50"
    And the modal should have "Confirm & Create New Journal" and "Cancel" buttons

  # ============================================================================
  # Scenario 3: Execute the new journal creation
  # ============================================================================

  Scenario: User confirms and creates the new year journal
    Given the preview modal is displayed with the correct contents
    When the user clicks "Confirm & Create New Journal"
    Then the modal should close
    And the application should navigate to the journal page
    And the header should show the new journal name "Abstratium 2025"
    And the new journal should appear in the journal list (via API)
    And the new journal should have the title "Abstratium 2025"
    And the new journal should have the same currency as the source journal
    And the new journal should have a previousJournalId pointing to the source journal
    And the new journal should have accounts copied from the source journal (via API)
    And the new journal should have opening balance transactions (via API)
    And the new journal should have a profit/loss transfer transaction (via API)
    And the new journal should have opening balance transactions tagged with "OpeningBalances"

  # ============================================================================
  # Scenario 4: Switch back to the original journal
  # ============================================================================

  Scenario: User switches back to the original journal
    Given the new journal "Abstratium 2025" has been created and selected
    When the user navigates to the Journal Management page
    And the user selects "Abstratium 2024" from the journal dropdown
    Then the header should show the journal name "Abstratium 2024"
    And the original journal "Abstratium 2024" should still exist in the journal list
    And the original journal should still be locked
```

## Expected UI Behavior

### New Year Page (/new-year)
- The page heading is "New Year: Create New Journal".
- The source journal title is displayed in a "Source Journal" section.
- The form has four required fields:
  - `#new-journal-title` — text input for the new journal title (defaults to source journal title).
  - `#opening-date` — date input for the opening date (defaults to January 1st of next year).
  - `#retained-earnings` — autocomplete for the retained earnings account (e.g., 2:290:2970).
  - `#annual-profit-loss` — autocomplete for the annual profit/loss account (e.g., 2:290:2979).
- The "Preview New Journal" button triggers the preview API call.

### Preview Confirmation Modal
- The modal overlay (`.modal-overlay`) appears with the confirmation content (`.modal-content`).
- The modal header shows "Confirm: Create New Year Journal".
- The modal body shows:
  - The new journal title, account count, and source journal title.
  - The opening date and opening balance count.
  - The retained earnings account full name (if provided).
  - A table (`.preview-table`) of accounts with non-zero opening balances.
- The modal has two buttons:
  - "Confirm & Create New Journal" (primary, executes the creation).
  - "Cancel" (secondary, cancels and closes the modal).

### After Execution
- The modal closes and the application navigates to `/journal`.
- A success message may briefly appear.
- The header shows the new journal name.
- The new journal is automatically selected (stored in localStorage).

### Journal Management Page
- The journal dropdown (`#journal-select`) lists all journals including the new one.
- Selecting a journal from the dropdown switches the active journal.
- The header updates to show the selected journal name.

## Acceptance Criteria

### Navigation
- [ ] The "new year" link appears in the header context menu (☰ button)
- [ ] Clicking it navigates to the New Year page
- [ ] The page shows the source journal name and the form

### Preview
- [ ] Filling in the form and clicking "Preview New Journal" shows the confirmation modal
- [ ] The modal shows the correct new journal title, source journal title, and opening date
- [ ] The modal shows a table of accounts with non-zero opening balances
- [ ] The table includes all 8 non-zero balance-sheet accounts with correct balances
- [ ] The modal has "Confirm & Create New Journal" and "Cancel" buttons

### Execution
- [ ] Clicking "Confirm & Create New Journal" creates the new journal
- [ ] The application navigates to the journal page
- [ ] The header shows the new journal name "Abstratium 2025"
- [ ] The new journal appears in the API journal list with the correct title
- [ ] The new journal has the same currency as the source journal
- [ ] The new journal has a previousJournalId pointing to the source journal
- [ ] The new journal has accounts copied from the source journal
- [ ] The new journal has opening balance transactions tagged with "OpeningBalances"
- [ ] The new journal has a profit/loss transfer transaction tagged with "Closing"

### Switching Back
- [ ] The user can navigate to the Journal Management page
- [ ] The journal dropdown lists both "Abstratium 2024" and "Abstratium 2025"
- [ ] Selecting "Abstratium 2024" switches back to the original journal
- [ ] The header shows "Abstratium 2024" after switching
- [ ] The original journal still exists with its data intact
- [ ] The original journal is still locked

## Notes

- The "New Year" operation is Phase 4 of the year-end closing process. It should only be
  performed after Phase 3 (close the books) has been completed, which locks the source journal.
- The new journal is created with all accounts copied from the source journal, including the
  account hierarchy (parent-child relationships).
- Only balance-sheet accounts (Assets, Liabilities, Equity) carry forward to the new journal.
  Revenue and expense accounts are copied but start with zero balances (their balances were
  closed to 2979 in Phase 3).
- The profit/loss transfer transaction moves the 2979 (Annual profit/loss) balance to
  2970 (Retained earnings) in the new journal. This ensures 2979 starts at zero in the new
  year and the previous year's result is preserved in retained earnings.
- Opening balance transactions are tagged with "OpeningBalances" and the profit/loss transfer
  is tagged with "Closing".
- The test cleans up any previously created "Abstratium 2025" journal at the start to ensure
  idempotency. The new journal is not locked, so it can be deleted via the API.
- The source journal ("Abstratium 2024") remains locked and is not modified by this operation.
