# Reports Implementation

## Overview

The reports feature provides dynamic, template-based financial reporting with hierarchical structure support and flexible account filtering.

## Key Features

### 1. Hierarchical Report Structure

Reports can now use different heading levels (h1-h4) to create properly structured financial statements:

- **Level 1 (h1)**: Main sections (e.g., "Assets", "Liabilities", "Equity")
- **Level 2 (h2)**: Subsections (e.g., "Cash and Cash Equivalents", "Other Assets")
- **Level 3 (h3)**: Default detailed sections
- **Level 4 (h4)**: Minor subsections

### 2. Account Filtering Options

Templates support multiple filtering methods:

- **By Account Type**: Filter by `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`, `CASH`
- **By Account Regex**: Match account names using regular expressions (future enhancement)
- **Calculated Values**: Special sections for `netIncome`, `totalAssets`, etc.
- **Tag Grouped**: Group transactions by tag value (e.g., invoice numbers)

### 3. Display Control

Each section can control:

- `showAccounts`: Whether to display individual account details (default: true)
- `showSubtotals`: Whether to show subtotals
- `showDebitsCredits`: Display debit/credit columns
- `invertSign`: Invert account balances (useful for liability, equity, and revenue accounts)
- `includeNetIncome`: Add net income to the section total (used in balance sheets to include current period profit/loss in equity)
- `calculated`: Display a calculated value like `netIncome` (used in income statements to show the final net income line)

### 4. Net Income Display

There are two ways to display Net Income depending on the report type:

**Balance Sheets** - Use `includeNetIncome: true`:
- Adds the current period's net income to equity account totals
- Automatically hidden when net income is zero
- Used in sections like "Equity" and "Total Liabilities and Equity"
- Example: `{"title":"Equity","accountTypes":["EQUITY"],"includeNetIncome":true,"invertSign":true}`

**Income Statements** - Use `calculated: "netIncome"`:
- Displays net income as a separate calculated line
- Automatically hidden when net income is zero
- Shows the final result of Revenue - Expenses
- Example: `{"title":"Net Income","calculated":"netIncome"}`

### 5. Zero-Balance Filtering

Users can toggle a checkbox to hide accounts with zero balances, making reports cleaner.

### 6. Filter Integration

Reports use the same `FilterInputComponent` as the journal page, supporting:
- Date ranges: `begin:20240101 end:20241231`
- Partner filtering: `partner:ABC`
- Tag filtering: `invoice:123`

## Report Templates

### Swiss Balance Sheet (Bilan)

The Swiss Balance Sheet follows the KMU-Kontenplan standard format:

```json
{
  "sections": [
    {
      "title": "Assets",
      "level": 1,
      "showAccounts": false
    },
    {
      "title": "Cash and Cash Equivalents",
      "level": 2,
      "accountTypes": ["CASH"]
    },
    {
      "title": "Other Assets",
      "level": 2,
      "accountTypes": ["ASSET"]
    },
    {
      "title": "Total Assets",
      "level": 2,
      "accountTypes": ["ASSET", "CASH"],
      "showAccounts": false
    },
    {
      "title": "Liabilities",
      "level": 1,
      "showAccounts": false
    },
    {
      "title": "Liabilities",
      "level": 2,
      "accountTypes": ["LIABILITY"]
    },
    {
      "title": "Equity",
      "level": 1,
      "showAccounts": false
    },
    {
      "title": "Equity",
      "level": 2,
      "accountTypes": ["EQUITY"],
      "invertSign": true,
      "includeNetIncome": true
    },
    {
      "title": "Total Equity",
      "level": 2,
      "accountTypes": ["EQUITY"],
      "showAccounts": false,
      "includeNetIncome": true,
      "invertSign": true
    },
    {
      "title": "Total Liabilities and Equity",
      "level": 1,
      "accountTypes": ["LIABILITY", "EQUITY"],
      "showAccounts": false,
      "includeNetIncome": true,
      "invertSign": true
    }
  ]
}
```

### Standard Balance Sheet

Shows assets, liabilities, and equity with Cash accounts separated. Net income is automatically included in equity sections when `includeNetIncome: true` is set, and only displays when non-zero:

```json
{
  "sections": [
    {
      "title": "Cash and Cash Equivalents",
      "accountTypes": ["CASH"],
      "showSubtotals": true
    },
    {
      "title": "Other Assets",
      "accountTypes": ["ASSET"],
      "showSubtotals": true
    },
    {
      "title": "Total Assets",
      "accountTypes": ["CASH", "ASSET"],
      "showAccounts": false
    },
    {
      "title": "Liabilities",
      "accountTypes": ["LIABILITY"],
      "showSubtotals": true,
      "invertSign": true
    },
    {
      "title": "Equity",
      "accountTypes": ["EQUITY"],
      "showSubtotals": true,
      "invertSign": true,
      "includeNetIncome": true
    },
    {
      "title": "Total Equity",
      "accountTypes": ["EQUITY"],
      "showAccounts": false,
      "includeNetIncome": true,
      "invertSign": true
    },
    {
      "title": "Total Liabilities and Equity",
      "accountTypes": ["LIABILITY", "EQUITY"],
      "showAccounts": false,
      "includeNetIncome": true,
      "invertSign": true
    }
  ]
}
```

### Income Statement

Shows revenue and expenses with net income calculation. The Net Income section uses `calculated: "netIncome"` and automatically hides when the value is zero:

```json
{
  "sections": [
    {
      "title": "Revenue",
      "accountTypes": ["REVENUE"],
      "showSubtotals": true,
      "invertSign": true
    },
    {
      "title": "Expenses",
      "accountTypes": ["EXPENSE"],
      "showSubtotals": true
    },
    {
      "title": "Net Income",
      "calculated": "netIncome"
    }
  ]
}
```

### Tag Grouped Report (e.g., Unpaid Sales Invoices)

Groups transactions by tag value and shows net balance per group. Useful for tracking invoices, bills, or any tagged transaction sets:

```json
{
  "sections": [
    {
      "title": "Unpaid Sales Invoices",
      "calculated": "tagGrouped",
      "tagKey": "invoice",
      "tagValuePrefix": "SI",
      "balanceAccountNameRegex": "1100",
      "useJournalChain": true,
      "sortable": true,
      "defaultSortColumn": "net",
      "defaultSortDirection": "desc"
    }
  ]
}
```

**Tag Grouped Report Features**:
- Groups transactions by matching tag value (e.g., all transactions with `invoice:SI20251010491`)
- Filters by tag key (e.g., `invoice`) and optional value prefix (e.g., `SI`)
- **Account-specific balance calculation**: Use `balanceAccountIds` or `balanceAccountRegex` to calculate net only from specific accounts
- Calculates net amount per group across all transactions (or filtered to specific accounts)
- Shows "underpaid" (net > 0, red) or "overpaid" (net < 0) status
- Only displays groups where net != 0 (unless "Hide zero-balance rows" is unchecked)
- Displays full transactions with entries and tags
- Loads data across the entire journal chain

**Account Balance Filtering**:
For invoice/payment tracking, you typically want to check if a specific account (like Accounts Receivable) balances to zero. Since account IDs are UUIDs, use `balanceAccountNameRegex` to match against the full hierarchical account name (e.g., "1:10:110:1100 Debtors"):
- `balanceAccountIds`: Array of specific account UUIDs to sum (rarely useful)
- `balanceAccountRegex`: Regex pattern to match account UUIDs (rarely useful)
- `balanceAccountNameRegex`: Regex pattern to match the full hierarchical account name (e.g., `"1100"` to match "1:10:110:1100", or `"^1:10:110:"` to match all accounts under AR)

The system builds the hierarchical path by prepending parent account numbers (e.g., "1:10:110:1100" for the Debtors account under AR).

**Journal Chain Loading**:
By default, reports only consider transactions from the currently selected journal. Set `useJournalChain: true` to load data from all journals in the chain (current + all previous journals). This is useful for:
- Unpaid invoice reports (invoices may have been created in earlier journals)
- Cross-year financial summaries

If none are specified, the net is calculated from ALL entries (which will always sum to zero in double-entry accounting).

## Technical Implementation

### Backend

- **Entity**: `ReportTemplateEntity` - Stores report definitions in database
- **DTO**: `ReportTemplateDTO` - Exposes templates to frontend
- **Resource**: `ReportResource` - REST endpoints at `/api/report/templates`
- **Migrations**: 
  - `V01.008__createReportTemplateTable.sql` - Creates table
  - `V01.009__insertSampleReportTemplates.sql` - Sample templates
  - `V01.010__insertSwissBalanceSheet.sql` - Swiss Balance Sheet
  - `V01.019__insertUnpaidSalesInvoiceReport.sql` - Tag grouped report template

### Tag Grouped Report Implementation

The tag grouped report (`calculated: "tagGrouped"`) is implemented entirely in the frontend:

1. **Journal Chain Loading**: Uses `JournalPersistenceService.getJournalChainIds()` pattern to load transactions from all journals in the chain
2. **Transaction Filtering**: Filters transactions by tag key and optional value prefix
3. **Account Filtering**: When `balanceAccountIds` or `balanceAccountRegex` is specified, only entries matching those accounts are summed for the net calculation
4. **Group Aggregation**: Groups transactions by tag value and calculates net amount per group (filtered to specified accounts if configured)
5. **Status Display**: Shows "underpaid" (net > 0, red) or "overpaid" (net < 0) status
6. **Transaction Display**: Renders full transactions with entries and tags like the Journal page

### Frontend

- **Types**: `reporting-types.ts` - Interfaces for templates and context
- **Context**: `reporting-context.ts` - Financial calculations and filtering
- **Component**: `ReportsComponent` - Main report UI
- **Styling**: Hierarchical heading styles in `styles.scss`

### Data Flow

1. User selects a report template
2. Component loads account entries and tags from backend
3. `createReportingContext()` calculates financial metrics
4. Each section is processed:
   - Filter entries by account type or regex
   - Group entries by account
   - Calculate subtotals
   - Apply zero-balance filtering if enabled
5. Results rendered with appropriate heading levels

## Testing

- **Backend**: `ReportResourceTest` - 5 tests for REST endpoints
- **Frontend**: 
  - `reports.component.spec.ts` - 18 tests for component logic
  - `reporting-context.spec.ts` - 15 tests for calculations
- **Coverage**: 56% statements, 36% branches

## Future Enhancements

1. **Account Regex Filtering**: Full implementation of regex-based account selection
2. **Custom Templates**: UI for creating/editing report templates
3. **Export**: PDF/Excel export functionality
4. **Comparative Reports**: Year-over-year comparisons
5. **Cash Flow Statement**: Swiss format cash flow report
