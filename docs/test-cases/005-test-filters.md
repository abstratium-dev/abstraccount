# Test Case 005: Test Transaction Filters (EQL)

**Feature:** Entry Query Language (EQL) filtering  
**Date:** 2026-04-07  

## Preconditions

See [PRECONDITIONS.md](./PRECONDITIONS.md) for general preconditions.

**CRITICAL:** This test case depends on:
- [Test Case 001](./001-create-journal-with-accounts.md) - Journal and account tree must exist
- [Test Case 002](./002-open-the-books.md) - Opening balances must be established
- [Test Case 003](./003-record-initial-business-transactions.md) - Initial transactions recorded
- [Test Case 004](./004.1-test-macros.md) - Macro transactions recorded

## Test Objective

Verify that the Entry Query Language (EQL) filter system correctly filters transactions in the transaction list and that reports respect the active filter, excluding filtered-out transactions from their sums.

The test exercises every predicate type documented in [QUERY_LANGUAGE.md](../QUERY_LANGUAGE.md):

- `date` (eq, gte, lte, gt, lt, between)
- `partner` (plain, glob, regex)
- `description` (glob, regex, quoted)
- `commodity`
- `amount` (eq, lt, lte, gt, gte)
- `tag` (key only, key:value glob, key:value regex)
- `accounttype`
- `accountname` (glob, regex)
- Logical operators: `AND`, `OR`, `NOT`, parentheses

## Test Data

All transactions from tests 003 and 004 are available in journal "Abstratium 2024". Key transactions used in assertions:

| Date       | Partner    | Description                                                  | Tags                    | Accounts              |
|------------|------------|--------------------------------------------------------------|-------------------------|-----------------------|
| 2024-05-25 | P00000001  | Short term loan from John Smith                               | invoice:PI00000001      | 1000, 2210.001        |
| 2024-05-26 | P00000002  | Fee to create Sàrl paid to Startup Help GmbH                 | invoice:PI00000002      | 6500, 2000            |
| 2024-06-26 | P00000001  | Capital payment into abstratium paid into PF                 | invoice:PI00000004      | 1020, 2800            |
| 2024-08-03 | P00000007  | Test 003.7 Anthropic API services invoice                    | invoice:PI00000007      | 6570.002, 2000        |
| 2024-08-06 | P00000001  | Test 003.8 Consulting services with VAT                      | invoice:SV00000001      | 1100, 3400, 2200      |
| 2024-08-08 | P00000001  | Test 003.9 Credit note for partial refund                    | invoice:CN00000001      | 3400, 1100            |
| 2024-12-13 | P00000006  | Test 003.12 Direct tax bill for 2024                         | TaxPayment:             | 8900, 2000            |
| 2024-08-01 | P00000004  | Test macros 004.1 banking expense                             | Payment:                | 6900, 1020            |
| 2024-08-04 | P00000014  | Test macros 004.3 sales invoice                               | invoice:SI00000001      | 3400, 1100            |

## Scenarios

```gherkin
Feature: Entry Query Language (EQL) Filters

  Background:
    Given the user is signed into the application
    And the journal "Abstratium 2024" exists with all transactions from tests 001-004
    And the user is on the journal detail page for "Abstratium 2024"

  # ---------------------------------------------------------------------------
  # Date predicates
  # ---------------------------------------------------------------------------

  Scenario: Filter by exact date (date:eq)
    When the user enters the filter "date:eq:2024-06-26"
    And the user applies the filter
    Then only transactions dated 2024-06-26 should be visible
    And the transaction "Capital payment into abstratium paid into PF" should appear
    And transactions dated 2024-05-25 should NOT appear

  Scenario: Filter by date range (date:between)
    When the user enters the filter "date:between:2024-05-01..2024-05-31"
    And the user applies the filter
    Then only transactions dated in May 2024 should be visible
    And the transaction "Short term loan from John Smith" should appear
    And the transaction "Fee to create Sàrl paid to Startup Help GmbH" should appear
    And transactions dated 2024-06-18 should NOT appear

  Scenario: Filter by date greater-than-or-equal (date:gte)
    When the user enters the filter "date:gte:2024-12-01"
    And the user applies the filter
    Then only transactions dated December 2024 or later should be visible
    And the transaction "Test 003.12 Direct tax bill for 2024" should appear
    And transactions dated 2024-08-01 should NOT appear

  Scenario: Filter by date less-than (date:lt)
    When the user enters the filter "date:lt:2024-06-01"
    And the user applies the filter
    Then only transactions dated before June 2024 should be visible
    And the transaction "Short term loan from John Smith" should appear
    And transactions dated 2024-06-18 should NOT appear

  # ---------------------------------------------------------------------------
  # Partner predicates
  # ---------------------------------------------------------------------------

  Scenario: Filter by partner exact match (plain token)
    When the user enters the filter "partner:P00000007"
    And the user applies the filter
    Then only transactions with partner P00000007 should be visible
    And the transaction "Test 003.7 Anthropic API services invoice" should appear
    And transactions with partner P00000001 should NOT appear

  Scenario: Filter by partner glob wildcard
    When the user enters the filter "partner:*0000007"
    And the user applies the filter
    Then only transactions with partners ending in 0000007 should be visible
    And the transaction "Test 003.7 Anthropic API services invoice" should appear

  Scenario: Filter by partner regex
    When the user enters the filter "partner:/P0000000[17]/"
    And the user applies the filter
    Then only transactions with partners P00000001 or P00000007 should be visible
    And the transaction "Short term loan from John Smith" should appear
    And the transaction "Test 003.7 Anthropic API services invoice" should appear
    And transactions with partner P00000002 should NOT appear

  # ---------------------------------------------------------------------------
  # Description predicates
  # ---------------------------------------------------------------------------

  Scenario: Filter by description glob
    When the user enters the filter "description:*invoice*"
    And the user applies the filter
    Then only transactions whose description contains "invoice" should be visible
    And the transaction "Test 003.7 Anthropic API services invoice" should appear
    And the transaction "Test macros 004.3 sales invoice" should appear
    And the transaction "Short term loan from John Smith" should NOT appear

  Scenario: Filter by description regex
    When the user enters the filter "description:/^Test 003\./"
    And the user applies the filter
    Then only transactions whose description starts with "Test 003." should be visible
    And the transaction "Test 003.8 Consulting services with VAT" should appear
    And the transaction "Test macros 004.1 banking expense" should NOT appear

  Scenario: Filter by description quoted string
    When the user enters the filter 'description:"Capital payment into abstratium paid into PF"'
    And the user applies the filter
    Then only the exact-match transaction should be visible
    And the transaction "Capital payment into abstratium paid into PF" should appear
    And no other transactions should appear

  # ---------------------------------------------------------------------------
  # Commodity predicate
  # ---------------------------------------------------------------------------

  Scenario: Filter by commodity
    When the user enters the filter "commodity:CHF"
    And the user applies the filter
    Then all transactions should be visible (all entries are in CHF)

  # ---------------------------------------------------------------------------
  # Amount predicates
  # ---------------------------------------------------------------------------

  Scenario: Filter by amount greater-than-or-equal
    When the user enters the filter "amount:gte:2000"
    And the user applies the filter
    Then only transactions with at least one entry of 2000.00 or more should be visible
    And the transaction "Capital payment into abstratium paid into PF" should appear
    And the transaction "Short term loan from John Smith" should NOT appear

  Scenario: Filter by amount less-than (negative values)
    When the user enters the filter "amount:lt:-100"
    And the user applies the filter
    Then only transactions with at least one entry more negative than -100 should be visible
    And the transaction "Capital payment into abstratium paid into PF" should appear
    And the transaction "Short term loan from John Smith" should NOT appear

  # ---------------------------------------------------------------------------
  # Tag predicates
  # ---------------------------------------------------------------------------

  Scenario: Filter by tag key only
    When the user enters the filter "tag:TaxPayment"
    And the user applies the filter
    Then only transactions with a TaxPayment tag should be visible
    And the transaction "Test 003.12 Direct tax bill for 2024" should appear
    And the transaction "Short term loan from John Smith" should NOT appear

  Scenario: Filter by tag key and value glob
    When the user enters the filter "tag:invoice:PI*"
    And the user applies the filter
    Then only transactions with an invoice tag whose value starts with PI should be visible
    And the transaction "Short term loan from John Smith" should appear
    And the transaction "Fee to create Sàrl paid to Startup Help GmbH" should appear
    And the transaction "Test 003.8 Consulting services with VAT" should NOT appear

  Scenario: Filter by tag key and value regex
    When the user enters the filter "tag:invoice:/SI\d+/"
    And the user applies the filter
    Then only transactions with an invoice tag matching SI followed by digits should be visible
    And the transaction "Test macros 004.3 sales invoice" should appear
    And the transaction "Short term loan from John Smith" should NOT appear

  # ---------------------------------------------------------------------------
  # Account type predicate
  # ---------------------------------------------------------------------------

  Scenario: Filter by account type EXPENSE
    When the user enters the filter "accounttype:EXPENSE"
    And the user applies the filter
    Then only transactions with at least one expense account entry should be visible
    And the transaction "Fee to create Sàrl paid to Startup Help GmbH" should appear
    And the transaction "Test macros 004.1 banking expense" should appear
    And the transaction "Capital payment into abstratium paid into PF" should NOT appear

  Scenario: Filter by account type EQUITY
    When the user enters the filter "accounttype:EQUITY"
    And the user applies the filter
    Then only transactions with at least one equity account entry should be visible
    And the transaction "Capital payment into abstratium paid into PF" should appear
    And the transaction "Short term loan from John Smith" should NOT appear

  # ---------------------------------------------------------------------------
  # Account name predicate
  # ---------------------------------------------------------------------------

  Scenario: Filter by account name glob
    When the user enters the filter "accountname:*Bank*"
    And the user applies the filter
    Then only transactions with an entry on an account whose path contains "Bank" should be visible
    And the transaction "Capital payment into abstratium paid into PF" should appear
    And the transaction "Test macros 004.1 banking expense" should appear
    And the transaction "Short term loan from John Smith" should NOT appear

  Scenario: Filter by account name regex
    When the user enters the filter "accountname:/.*VAT.*/"
    And the user applies the filter
    Then only transactions with an entry on a VAT-related account should be visible
    And the transaction "Test 003.8 Consulting services with VAT" should appear
    And the transaction "Short term loan from John Smith" should NOT appear

  # ---------------------------------------------------------------------------
  # Logical operators
  # ---------------------------------------------------------------------------

  Scenario: Filter with AND (explicit)
    When the user enters the filter "accounttype:EXPENSE AND date:lt:2024-06-01"
    And the user applies the filter
    Then only expense transactions before June 2024 should be visible
    And the transaction "Fee to create Sàrl paid to Startup Help GmbH" should appear
    And the transaction "Test macros 004.1 banking expense" should NOT appear

  Scenario: Filter with OR
    When the user enters the filter "partner:P00000006 OR partner:P00000007"
    And the user applies the filter
    Then only transactions with partner P00000006 or P00000007 should be visible
    And the transaction "Test 003.7 Anthropic API services invoice" should appear
    And the transaction "Test 003.12 Direct tax bill for 2024" should appear
    And transactions with partner P00000001 should NOT appear

  Scenario: Filter with NOT
    When the user enters the filter "NOT partner:P00000001"
    And the user applies the filter
    Then all transactions except those with partner P00000001 should be visible
    And the transaction "Test 003.7 Anthropic API services invoice" should appear
    And the transaction "Short term loan from John Smith" should NOT appear

  Scenario: Filter with parentheses and mixed operators
    When the user enters the filter "(tag:TaxPayment OR tag:invoice:SI*) AND NOT accounttype:EQUITY"
    And the user applies the filter
    Then only TaxPayment or SI-invoice transactions without equity entries should be visible
    And the transaction "Test 003.12 Direct tax bill for 2024" should appear
    And the transaction "Test macros 004.3 sales invoice" should appear
    And the transaction "Capital payment into abstratium paid into PF" should NOT appear

  Scenario: Filter with implicit AND (whitespace)
    When the user enters the filter "date:gte:2024-08-01 date:lte:2024-08-06"
    And the user applies the filter
    Then only transactions dated 2024-08-01 through 2024-08-06 should be visible
    And the transaction "Test macros 004.1 banking expense" should appear
    And the transaction "Test 003.8 Consulting services with VAT" should appear
    And the transaction "Test 003.12 Direct tax bill for 2024" should NOT appear

  # ---------------------------------------------------------------------------
  # Report verification: filtered transactions are excluded from report sums
  # ---------------------------------------------------------------------------

  Scenario: Report excludes filtered-out transactions
    Given the user clears any active filter
    When the user navigates to the Reports page
    And the user selects the "Trial Balance" report template
    And the user generates the report
    Then the report should show the full bank account balance including all transactions

    When the user enters the filter "NOT tag:TaxPayment"
    And the user applies the filter
    And the user regenerates the report
    Then the report should show a different bank account balance
    And the difference should equal the amount of the TaxPayment transactions
    And the 8900 Direct taxes account balance should be reduced by the filtered transactions

  Scenario: Income Statement respects date filter
    Given the user clears any active filter
    When the user navigates to the Reports page
    And the user selects the "Income Statement" report template
    And the user generates the report
    Then the report should show the full revenue including all 2024 transactions

    When the user enters the filter "date:lt:2024-08-06"
    And the user applies the filter
    And the user regenerates the report
    Then the revenue shown should exclude transactions on or after 2024-08-06
    And the 3400 Revenue balance should be lower than the unfiltered balance

  # ---------------------------------------------------------------------------
  # Cleanup
  # ---------------------------------------------------------------------------

  Scenario: Clear filter restores all transactions
    Given a filter is active
    When the user clears the filter
    Then all transactions should be visible again
```

## Acceptance Criteria

- [ ] All date predicates (eq, gte, lte, gt, lt, between) correctly filter transactions
- [ ] Partner predicate works with plain tokens, glob wildcards, and regex
- [ ] Description predicate works with glob, regex, and quoted strings
- [ ] Commodity predicate filters by entry commodity
- [ ] Amount predicate filters by entry amount with all operators
- [ ] Tag predicate works with key-only, key:value glob, and key:value regex
- [ ] Account type predicate filters by account type
- [ ] Account name predicate filters by hierarchical account path
- [ ] Logical operators AND, OR, NOT work correctly
- [ ] Parentheses group sub-expressions correctly
- [ ] Implicit AND (whitespace between atoms) works
- [ ] Reports respect the active filter and exclude filtered transactions
- [ ] Clearing the filter restores the full transaction list

## Notes

- This test case depends on all transactions from tests 003 and 004 being present.
- The filter is applied via the filter input on the journal/transactions page.
- The same filter input is available on the reports page and affects report data.
- The filter is persisted in localStorage under the key `abstraccount:globalEql`.
- Reports call `getTransactions` with the filter parameter, so the backend applies the filter before returning data.
