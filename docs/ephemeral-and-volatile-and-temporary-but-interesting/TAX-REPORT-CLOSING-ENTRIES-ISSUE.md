# Tax Report Issue: Year-End Closing Entries

## Problem Identified

The Swiss Tax Declaration report is showing **incorrect/missing values** because it includes year-end closing entries that zero out temporary accounts.

### Symptoms

1. **A.1 (Receivables from sales):** Empty - should show receivables balance
2. **A.3 (Inventory):** Empty - should show inventory balance  
3. **A.10 (Revenue):** Empty - should show total revenue for the year
4. **Only A.6 (Total balance sheet):** Shows a value because assets/liabilities aren't closed

### Root Cause

The journal file contains year-end closing entries on **2025-12-31** tagged with `:Closing:` that:

1. Transfer all revenue (account 3) to profit/loss account (2:29:290:2979)
2. Transfer all expenses (accounts 4, 6, 8) to profit/loss account (2:29:290:2979)
3. Zero out all temporary accounts

**Example closing entry:**
```
2025-12-31 * Close revenue account 3 Produits d'exploitation...  ; :Closing:
    2 Passif / Equity:290:2979 Bénéfice de l'exercice    CHF -1234.56
    3 Produits d'exploitation...                         CHF 1234.56
```

### Why This Breaks the Tax Report

The tax declaration requires values **as of the closing date but BEFORE closing entries**:

- **Section A (General Information):** Balance sheet values at closing date
- **Section B.1 (Net Profit):** Revenue - Expenses for the period
- **Section C (Capital):** Equity after profit allocation

When closing entries are included:
- Revenue accounts show CHF 0.00 (closed to 2979)
- Expense accounts show CHF 0.00 (closed to 2979)
- Receivables may be affected if closed
- Inventory may be affected if closed

## Solution

The tax report **MUST EXCLUDE** transactions tagged with `:Closing:` when calculating values.

### Implementation Options

#### Option 1: Filter by Tag (RECOMMENDED)
Add a filter to exclude `:Closing:` tag:
```
Filter: begin:20240101 end:20251231 NOT tag:Closing
```

#### Option 2: Use Date Before Closing
Run the report with end date one day before closing:
```
Filter: begin:20240101 end:20251230
```
**Problem:** This won't capture transactions on 2025-12-31 that aren't closing entries.

#### Option 3: Separate Closing Date
Use a closing date of 2026-01-01 for closing entries:
```
2026-01-01 * Close revenue account...  ; :Closing:
```
**Problem:** This changes the accounting practice and may not be acceptable.

### Recommended Approach

**Modify the report filter to exclude `:Closing:` tag:**

The filter input should support:
```
begin:20240101 end:20251231 -tag:Closing
```

Or using NOT syntax:
```
begin:20240101 end:20251231 NOT tag:Closing
```

## Verification

After implementing the fix, verify:

1. **A.1:** Should show receivables balance (account 1:10:110)
2. **A.3:** Should show inventory balance (account 1:10:120)  
3. **A.10:** Should show total revenue (account 3)
4. **B.1:** Should show net income (revenue - expenses)

## Additional Findings

### Year-End Process

The journal shows a proper year-end closing process:

1. **2025-12-31:** Payment to Postfinance (normal transaction)
2. **2025-12-31:** Two `:YearEnd:` tagged transactions:
   - Tax provision
   - Legal reserve allocation
3. **2025-12-31:** Multiple `:Closing:` tagged transactions:
   - Close all revenue accounts (3xxx) to 2979
   - Close all expense accounts (4xxx, 6xxx, 8xxx) to 2979

### Tags in Use

- `:YearEnd:` - Year-end adjustments (2 transactions)
- `:Closing:` - Closing entries (15 transactions)

Both should likely be excluded from the tax report to show pre-closing balances.

## Frontend Implementation Note

The `FilterInputComponent` currently supports:
- Date ranges: `begin:YYYYMMDD end:YYYYMMDD`
- Partner filtering: `partner:ABC`
- Tag filtering: `invoice:123`

**Required enhancement:** Add support for **negative tag filtering**:
- Syntax: `-tag:Closing` or `NOT tag:Closing`
- This would exclude all transactions with the `:Closing:` tag

## Backend Implementation Note

The `AccountEntryService` or report generation logic needs to:

1. Parse negative tag filters from the filter string
2. Exclude entries matching the negative tag criteria
3. Apply this filter BEFORE calculating account balances

## Testing

Create test cases for:

1. Report with closing entries included (current broken state)
2. Report with closing entries excluded (expected correct state)
3. Verify all sections show correct values
4. Verify net income calculation is correct

## Fiscal Year Context

- **Fiscal Year:** 2024-01-01 to 2025-12-31 (24 months - unusual!)
- **Closing Date:** 2025-12-31
- **Report Period:** Should be `begin:20240101 end:20251231 -tag:Closing`
