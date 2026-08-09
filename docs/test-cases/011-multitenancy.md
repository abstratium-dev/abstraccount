# Test Case 011: Multitenancy — Journal Isolation Between Users

**Feature:** Multitenancy — tenant isolation of journal data
**Date:** 2026-08-10

## Preconditions

See [PRECONDITIONS.md](./PRECONDITIONS.md) for general preconditions.

**CRITICAL:** This test case requires:
- The primary test user `test@abstratium.dev` (password `secretLong`) exists in the auth
  server. When run as part of the full suite (after tests 001–009), the primary user has
  at least one journal (e.g. "Abstratium 2024"). When run in isolation, the primary user
  may have zero journals — the multitenancy assertion still holds because the second user
  must always see an empty list.
- A second test user `test@maxant.ch` (password `secretLong`) exists in the auth server
  and belongs to a **different organisation** (different `org_id` / tenant).
- The second user has **no journals** in their tenant.

## Test Objective

Verify that multitenancy isolation works correctly:

1. **The primary user can see their journals** — When `test@abstratium.dev` signs in and
   navigates to the Journal Management page (or calls `/api/journal/list`), they see the
   journals belonging to their organisation (e.g. "Abstratium 2024", "Abstratium 2025").
2. **The second user sees no journals** — When `test@maxant.ch` signs in, they see an
   empty journal list. The SPA redirects them to `/create-journal` because there are no
   journals in their tenant.
3. **The journal lists are disjoint** — No journal that belongs to the primary user's
   tenant appears in the second user's journal list, and vice versa.

## Test Data

| Field | Value |
|-------|-------|
| Primary user email | test@abstratium.dev |
| Primary user password | secretLong |
| Second user email | test@maxant.ch |
| Second user password | secretLong |
| Expected journals (primary) | Abstratium 2024, Abstratium 2025 (if created) |
| Expected journals (second) | none |

## Scenarios

```gherkin
Feature: Multitenancy — Journal Isolation Between Users

  # ============================================================================
  # Scenario 1: Primary user can see their journals
  # ============================================================================

  Scenario: Primary user sees their journals on the journal-management page
    Given the user is signed in as "test@abstratium.dev"
    When the user navigates to the Journal Management page
    Then the journal dropdown should contain at least one journal
    And the API endpoint /api/journal/list should return at least one journal
    And the list of journal titles is recorded for comparison

  # ============================================================================
  # Scenario 2: Second user sees no journals and is asked to create one
  # ============================================================================

  Scenario: Second user sees no journals and is redirected to create-journal
    Given the user is signed in as "test@maxant.ch"
    When the user navigates to the application
    Then the user should be redirected to the /create-journal page
    And the "Start Your Books" heading should be visible
    And the API endpoint /api/journal/list should return an empty array

  # ============================================================================
  # Scenario 3: Journal lists are disjoint between tenants
  # ============================================================================

  Scenario: No journal from the primary tenant is visible to the second user
    Given the primary user's journal titles have been recorded
    And the second user's journal list has been fetched via the API
    Then the second user's journal list should be empty
    And none of the primary user's journal titles should appear in the second user's list
```

## Expected UI Behavior

### Primary User (test@abstratium.dev)
- After sign-in, the SPA loads normally with header navigation links visible.
- The Journal Management page shows a dropdown with at least one journal.
- The `/api/journal/list` API returns a non-empty JSON array.

### Second User (test@maxant.ch)
- After sign-in, the SPA's auth guard detects no journals and redirects to `/create-journal`.
- The "Start Your Books" heading is visible.
- The `/api/journal/list` API returns an empty JSON array `[]`.

### API Behavior
- `GET /api/journal/list` is tenant-filtered by the `@TenantId` annotation on
  `JournalEntity`. Each user only sees journals whose `org_id` matches their
  organisation.

## Acceptance Criteria

### Primary user sees journals
- [ ] The primary user can sign in successfully
- [ ] The `/api/journal/list` endpoint returns at least one journal for the primary user
- [ ] The journal titles are recorded for comparison

### Second user sees no journals
- [ ] The second user can sign in successfully
- [ ] The SPA redirects the second user to `/create-journal`
- [ ] The "Start Your Books" heading is visible
- [ ] The `/api/journal/list` endpoint returns an empty array for the second user

### Tenant isolation
- [ ] The second user's journal list is empty
- [ ] None of the primary user's journal titles appear in the second user's list

## Notes

- This test uses two different OIDC users that belong to different organisations
  (tenants). The `@TenantId` annotation on JPA entities ensures that Hibernate
  automatically filters all queries by the current user's `org_id`.
- The second user (`test@maxant.ch`) must exist in the auth server and be mapped to
  a different organisation than `test@abstratium.dev`.
- Each Playwright test gets a fresh browser context, so the two users never share
  session cookies. The primary user's journal list is stored in a module-level
  variable and compared against the second user's list in the subsequent test.
- This test does **not** create or delete any journals — it only reads the journal
  list for each user and compares them.
