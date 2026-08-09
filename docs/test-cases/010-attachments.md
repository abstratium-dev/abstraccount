# Test Case 010: Attachments on a Locked Journal

**Feature:** Transaction attachments — viewing on a locked journal
**Date:** 2026-08-08

## Preconditions

See [PRECONDITIONS.md](./PRECONDITIONS.md) for general preconditions.

**CRITICAL:** This test case depends on:
- [Test Case 003](./003-record-initial-business-transactions.md) (Test 3.10) — A PDF attachment
  ("test-receipt.pdf") must have been uploaded to the first transaction of the "Abstratium 2024"
  journal and left there (not deleted).
- [Test Case 007](./007-year-end-closing.md) — The "Abstratium 2024" journal must be locked.

The attachment upload/delete test (Test 3.10) runs as part of test 003, while the journal is
still unlocked. It uploads two attachments, deletes one, and leaves the other
("test-receipt.pdf") on the first transaction. Test 010 then verifies that this remaining
attachment can be viewed but not modified on the locked journal.

## Test Objective

Verify that on a **locked** journal:

1. **Existing attachments can be viewed** — The attachment appears in the context menu with a
   working download link, and the API returns the attachment metadata and content.
2. **Adding attachments is disabled** — The "Add Attachment" label has the `disabled` class and
   the file input is disabled. Uploading via the API returns 423 (Locked).
3. **Deleting attachments is disabled** — The attachment delete (×) button is disabled. Deleting
   via the API returns 423 (Locked).
4. **The attachment survives** — After the attempted delete, the attachment still exists.

## Test Data

| Field | Value |
|-------|-------|
| Journal | Abstratium 2024 (locked) |
| Attachment file name | test-receipt.pdf (uploaded in test 003.10) |
| Transaction | First transaction in the journal (e.g., "Short term loan from John Smith") |

## Scenarios

```gherkin
Feature: Attachments on a Locked Journal

  Background:
    Given the user is signed into the application
    And the journal "Abstratium 2024" is locked
    And the first transaction has an attachment "test-receipt.pdf" (from test 003.10)

  # ============================================================================
  # Scenario 1: View existing attachment
  # ============================================================================

  Scenario: User can view an existing attachment on a locked journal
    When the user navigates to the journal page
    And the user opens the context menu (⋮) for the first transaction
    Then the attachment "test-receipt.pdf" should appear in the context menu
    And the attachment download link should point to /api/attachment/{id}
    And the API should return the attachment content with content-type application/pdf

  # ============================================================================
  # Scenario 2: Adding attachments is disabled
  # ============================================================================

  Scenario: User cannot add attachments to a locked journal
    Given the context menu is open for the first transaction
    Then the "Add Attachment" label should have the "disabled" class
    And the file input should be disabled
    When the user attempts to upload an attachment via the API
    Then the API should return status 423 (Locked)

  # ============================================================================
  # Scenario 3: Deleting attachments is disabled
  # ============================================================================

  Scenario: User cannot delete attachments from a locked journal
    Given the context menu is open for the first transaction
    Then the attachment delete (×) button should be disabled
    When the user attempts to delete the attachment via the API
    Then the API should return status 423 (Locked)
    And the attachment should still exist after the attempted delete
```

## Expected UI Behavior

### Context Menu on a Locked Journal
- The context menu opens normally (⋮ button is not disabled).
- Existing attachments are listed with download links (viewing is always allowed).
- The "Add Attachment" label has the `disabled` CSS class.
- The hidden `<input type="file">` has the `disabled` attribute.
- The attachment delete (×) button (`button.btn-icon-danger`) has the `disabled` attribute.

### API Behavior on a Locked Journal
- `GET /api/attachment/transaction/{transactionId}` — Returns the attachment list (200 OK).
- `GET /api/attachment/{attachmentId}` — Returns the attachment content (200 OK).
- `POST /api/attachment/transaction/{transactionId}` — Returns 423 (Locked).
- `DELETE /api/attachment/{attachmentId}` — Returns 423 (Locked).

## Acceptance Criteria

### Viewing (allowed)
- [ ] The attachment "test-receipt.pdf" appears in the context menu
- [ ] The download link points to /api/attachment/{id}
- [ ] The API returns the attachment content with content-type application/pdf
- [ ] The downloaded content starts with %PDF- magic bytes

### Adding (disabled)
- [ ] The "Add Attachment" label has the "disabled" class
- [ ] The file input is disabled
- [ ] Uploading via the API returns 423 (Locked)

### Deleting (disabled)
- [ ] The attachment delete (×) button is disabled
- [ ] Deleting via the API returns 423 (Locked)
- [ ] The attachment still exists after the attempted delete

## Notes

- The attachment upload/delete test (Test 3.10) is part of test 003, not test 010. Test 3.10
  runs while the journal is still unlocked (before test 007 locks it). It uploads two
  attachments, deletes one, and leaves "test-receipt.pdf" on the first transaction.
- Test 010 runs after test 007 (which locks the journal) and verifies that the remaining
  attachment can be viewed but not modified.
- The 423 (Locked) status code is mapped by `JournalLockedExceptionMapper` from the
  `JournalLockedException` thrown by `AttachmentPersistenceService` when the journal is locked.
