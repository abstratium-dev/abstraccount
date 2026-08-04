# Test Case 008: Journal Locking

**Feature:** Journal locking — protecting closed periods from further changes
**Date:** 2026-04-13

## Preconditions

See [PRECONDITIONS.md](./PRECONDITIONS.md) for general preconditions.

**CRITICAL:** This test case depends on:
- [Test Case 001](./001-create-journal-with-accounts.md) - Journal and account tree must exist
- [Test Case 002](./002-open-the-books.md) - Opening balances must be established
- [Test Case 003](./003-record-initial-business-transactions.md) - Initial transactions recorded
- [Test Case 004](./004.1-test-macros.md) - Macro transactions recorded (including 004.9 TaxPayment)
- [Test Case 007](./007-year-end-closing.md) - Year-end closing (TaxProvision, LegalReserveAllocation, closing entries)

The journal "Abstratium 2024" must exist with all transactions from tests 003 and 004, and the
year-end closing entries from test 007. The built-in macros must have been imported in test 004.1.

## Test Objective

Verify that journal locking works correctly at every level of the application:

1. **Closing the books locks the journal** — After executing the close-books operation (test 7.5),
   the journal is automatically locked. This is the primary entry point for locking.
2. **Lock indicator in the header** — The 🔒 icon appears next to the journal name in the header
   when the journal is locked.
3. **Lock indicator on the journal-management page** — The journal-management page shows the
   journal as locked, with the "Unlock Journal" button visible and the locked warning message
   displayed.
4. **Mutating operations are blocked** — When the journal is locked, all mutating operations
   (creating transactions, adding/editing/deleting accounts, executing macros) are rejected.
   The UI shows an informational "Journal Locked" dialog instead of sending the request to the
   backend.
5. **Unlocking works** — The journal can be unlocked from the journal-management page. A warning
   confirm dialog is shown before unlocking (because unlocking a journal with follow-on years
   can corrupt the next year's opening balances). After unlocking, the 🔒 icon disappears from
   the header.
6. **Re-locking works** — After unlocking, the journal can be re-locked from the
   journal-management page. The 🔒 icon reappears in the header.

## Scenarios

```gherkin
Feature: Journal Locking

  Background:
    Given the user is signed into the application
    And the journal "Abstratium 2024" exists with all transactions from tests 001-004
    And the year-end closing entries from test 007 have been recorded
    And the books have been closed (test 7.5), which locked the journal

  # ============================================================================
  # Scenario 1: Closing the books locks the journal
  # ============================================================================
  # This is verified in test 7.5 (close-books) and test 8.1 asserts the
  # locked state immediately after closing.

  Scenario: Journal is locked after closing the books
    Given the books have been closed via the close-books page
    Then the journal should be locked
    And the header should display the 🔒 lock icon next to the journal name
    And the journal-management page should show the journal as locked
    And the "Unlock Journal" button should be visible
    And the locked warning message should be displayed

  # ============================================================================
  # Scenario 2: Mutating operations are blocked when the journal is locked
  # ============================================================================

  Scenario: Cannot add a transaction when the journal is locked
    When the user navigates to the journal page
    And the user clicks "Add Transaction"
    Then an informational "Journal Locked" dialog should be displayed
    And the transaction modal should NOT open
    And no request should be sent to the backend

  Scenario: Cannot add an account when the journal is locked
    When the user navigates to the accounts page
    And the user clicks "Create Account"
    Then an informational "Journal Locked" dialog should be displayed
    And the account modal should NOT open

  Scenario: Cannot delete an account when the journal is locked
    When the user navigates to the accounts page
    And the user opens the context menu for an account
    And the user clicks "Delete"
    Then an informational "Journal Locked" dialog should be displayed
    And the account should NOT be deleted

  Scenario: Cannot execute a macro when the journal is locked
    When the user navigates to the macros page
    And the user selects a macro
    Then an informational "Journal Locked" dialog should be displayed
    And the macro execution dialog should NOT open

  # ============================================================================
  # Scenario 3: Unlocking the journal
  # ============================================================================

  Scenario: Unlock the journal with warning confirmation
    When the user navigates to the journal-management page
    And the user clicks "Unlock Journal"
    Then a confirmation dialog should be displayed with a warning about follow-on years
    And the dialog should have "Yes, unlock anyway" and "Cancel" buttons
    When the user clicks "Yes, unlock anyway"
    Then the journal should be unlocked
    And the 🔒 lock icon should be removed from the header
    And the journal-management page should show the "Lock Journal" button

  # ============================================================================
  # Scenario 4: Re-locking the journal
  # ============================================================================

  Scenario: Re-lock the journal
    When the user navigates to the journal-management page
    And the journal is currently unlocked
    And the user clicks "Lock Journal"
    Then the journal should be locked
    And the 🔒 lock icon should appear in the header
    And the journal-management page should show the "Unlock Journal" button
    And the locked warning message should be displayed
```

## Expected UI Behavior When Locked

### Header
- The `<a id="current-journal-name">` element shows the journal name followed by a
  `<span class="journal-lock-icon">` containing the 🔒 emoji (Unicode `U+1F512`, HTML `&#128274;`).
- The span has `title="This journal is locked and cannot be modified"` and
  `aria-label="Journal locked"`.

### Journal Management Page
- The "Lock / Unlock" section shows a `<p class="locked-warning">` with the text
  "This journal is currently **locked**. Mutating operations (transactions, accounts, macros,
  close-books) are blocked."
- The `#lock-journal` button is hidden.
- The `#unlock-journal` button is visible.

### Mutating Operations (Transactions, Accounts, Macros)
- Each component checks `isJournalLocked()` before performing the action.
- If locked, an `InfoDialog` is shown with title "Journal Locked" and a message explaining
  that the journal must be unlocked first.
- The dialog has an "OK" button to dismiss it.
- No HTTP request is sent to the backend (the check is client-side).

### Unlock Confirmation Dialog
- A `ConfirmDialog` is shown with:
  - Title: "Unlock Journal"
  - Message: "⚠️ Warning: Unlocking a journal that has follow-on years can really mess up your
    accounts, because the system will not carry over changes you make here into those follow-on
    years' opening balances. Only unlock if you know what you are doing."
  - Confirm button: "Yes, unlock anyway" (danger style)
  - Cancel button: "Cancel"

## Acceptance Criteria

### Closing locks the journal
- [ ] After closing the books (test 7.5), the journal is locked
- [ ] The 🔒 icon appears in the header next to the journal name
- [ ] The journal-management page shows the locked warning and "Unlock Journal" button

### Mutating operations blocked when locked
- [ ] Clicking "Add Transaction" on the journal page shows the "Journal Locked" info dialog
- [ ] Clicking "Create Account" on the accounts page shows the "Journal Locked" info dialog
- [ ] Clicking "Delete" on an account's context menu shows the "Journal Locked" info dialog
- [ ] Selecting a macro on the macros page shows the "Journal Locked" info dialog
- [ ] No HTTP mutating requests are sent to the backend (client-side check)

### Unlocking
- [ ] Clicking "Unlock Journal" shows a warning confirm dialog about follow-on years
- [ ] Confirming the unlock removes the 🔒 icon from the header
- [ ] After unlocking, the journal-management page shows the "Lock Journal" button
- [ ] After unlocking, mutating operations are allowed again

### Re-locking
- [ ] Clicking "Lock Journal" (when unlocked) locks the journal
- [ ] The 🔒 icon reappears in the header
- [ ] The journal-management page shows the "Unlock Journal" button and locked warning

## Notes

- Journal locking is the application's mechanism for protecting closed periods. Once a journal
  is locked, no transactions, accounts, or macros can be created, modified, or deleted.
- The close-books operation (test 7.5) automatically locks the journal after creating the
  closing transactions. This is the primary way journals get locked in normal use.
- The `NewYearService` also auto-locks the source journal when creating a new fiscal year,
  but that is not tested here (it will be tested in a future test case for the "new year"
  feature).
- The lock check is performed client-side (in the Angular components) before any HTTP request
  is sent. This provides a better user experience than relying solely on the backend 423
  response. The backend also enforces the lock via `JournalPersistenceService.requireNotLocked()`
  as a defense-in-depth measure.
- Unlocking a journal that has follow-on years is dangerous because changes made to the
  unlocked journal will not propagate to the next year's opening balances. The confirm dialog
  warns the user about this.
