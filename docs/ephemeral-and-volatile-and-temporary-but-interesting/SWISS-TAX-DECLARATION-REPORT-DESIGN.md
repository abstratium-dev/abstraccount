# Swiss Tax Declaration Report Design

## Overview

This report generates the values needed to complete the Swiss tax declaration form for companies. The report follows the structure of the official tax form with sections A (General Information), B (Net Profit), and C (Capital and Reserves).

## Account Structure Analysis

Based on the journal file, the company uses the Swiss KMU-Kontenplan (SME Chart of Accounts):

### Assets (Account Class 1)
- **1:10** - Cash and Cash Equivalents (CASH)
  - 1:10:100 - Caisse / Cash
  - 1:10:106 - Compte postal / Postal account
  - 1:10:108 - Compte bancaire CHF / Bank account CHF
- **1:14** - Receivables from sales and services (ASSET)
  - 1:14:140 - Créances résultant de ventes et de prestations de services / Receivables from sales and services
- **1:15** - Other short-term receivables (ASSET)
  - 1:15:150 - Autres créances à court terme / Other short-term receivables
- **1:17** - Prepaid expenses and accrued income (ASSET)
  - 1:17:170 - Actifs de régularisation / Prepaid expenses and accrued income

### Liabilities (Account Class 2)
- **2:20** - Short-term liabilities (LIABILITY)
  - 2:20:200 - Dettes résultant d'achats et de prestations de services / Accounts payable
  - 2:20:209 - Autres dettes à court terme / Other short-term liabilities
- **2:23** - Accrued expenses and deferred income (LIABILITY)
  - 2:23:230 - Passifs de régularisation / Accrued expenses and deferred income
- **2:24** - Provisions (LIABILITY)
  - 2:24:240 - Provisions à court terme / Short-term provisions
- **2:28** - Share capital (EQUITY)
  - 2:28:280 - Capital-actions, capital social ou parts sociales / Share capital
- **2:29** - Reserves and retained earnings (EQUITY)
  - 2:29:290 - Réserves, propres parts du capital et bénéfice ou perte résultant du bilan / Reserves and retained earnings
  - 2:29:297 - Réserves provenant d'apports en capital / Reserves from capital contributions
  - 2:29:2979 - Bénéfice de l'exercice ou perte de l'exercice / Annual profit or loss

### Revenue (Account Class 3)
- **3:30** - Sales revenue (REVENUE)
  - 3:30:300 - Produit des ventes de marchandises / Revenue from sales of goods
  - 3:30:320 - Produit des prestations de services / Revenue from services

### Expenses (Account Classes 4, 5, 6, 8)
- **4** - Cost of materials and goods (EXPENSE)
- **5** - Personnel expenses (EXPENSE)
- **6** - Other operating expenses (EXPENSE)
  - 6:65:650 - Charges d'administration et d'informatique / Administrative and IT expenses
  - 6:65:657 - Charges informatiques, yc leasing / IT and computing expenses
  - 6:66:660 - Publicité et marketing / Advertising and marketing
  - 6:69:690 - Charges financières / Financial expense
- **8** - Non-operational and extraordinary expenses (EXPENSE)
  - 8:89:890 - Impôts directs (personnes morales) / Direct taxes (legal entities)

## Report Sections and Calculations

### Section A: General Information (INDICATIONS GÉNÉRALES)

These values are extracted from the balance sheet at the closing date.

#### A.1 - Total Receivables from Sales and Services
**Calculation:** Sum of account 1:10:110 (Créances résultant de la vente de biens et de prestations de services)
- Includes doubtful debtors (account 1:10:110:1100)
- **Account Type:** ASSET
- **Account Regex:** `^1:10:110`

#### A.2 - Total Receivables/Loans from Shareholders, Related Parties, and Group Companies
**Calculation:** Sum of specific receivable accounts (if any exist)
- **Account Type:** ASSET
- **Account Regex:** `^1:10:13` (Other short-term receivables - may include related party receivables)
- **Note:** This requires manual review as the chart doesn't explicitly separate related party receivables. Account 130 would be used if it exists.

#### A.3 - Total Inventory
**Calculation:** Sum of inventory accounts (account 1:10:120 - Stocks et prestations de services non facturées)
- Includes: 1200 (Stock de matériel), 1210 (Produits finis), 1220 (Travaux en cours), 1230 (Marchandises)
- **Account Type:** ASSET
- **Account Regex:** `^1:10:120`

#### A.4 - Total Participations
**Calculation:** Sum of participation accounts (account 1:14:14x for financial participations)
- **Account Type:** ASSET
- **Account Regex:** `^1:14:14`
- **Tax Definition:** A participation is qualified when:
  1. The company owns ≥10% of capital of another company, OR
  2. The company participates ≥10% in reserves of another company, OR
  3. The market value of participation rights > CHF 1 million
- **Note:** No participation accounts visible in current journal

#### A.5 - Total Fixed Assets (excluding participations A.4)
**Calculation:** Sum of fixed asset accounts (account 1:14:150 - Immobilisations corporelles meubles)
- **Account Type:** ASSET
- **Account Regex:** `^1:14:15`
- **Note:** Excludes participations counted in A.4

#### A.6 - Total Balance Sheet
**Calculation:** Total Assets = Sum of all ASSET and CASH accounts
- **Account Types:** ASSET, CASH

#### A.7 - Total Accrued Expenses/Deferred Income
**Calculation:** Sum of account 2:20:230 (Passifs de régularisation)
- **Account Type:** LIABILITY
- **Account Regex:** `^2:20:23`

#### A.8 - Total Liabilities to Shareholders, Related Parties, and Group Companies
**Calculation:** Sum of account 2:20:220:2210 (Autres dettes à court terme - may include shareholder loans)
- Specifically account 2210.001 (Anton Kutschera) and similar related party accounts
- **Account Type:** LIABILITY
- **Account Regex:** `^2:20:220:2210`
- **Note:** Requires manual review to identify related party liabilities

#### A.9 - Total Provisions
**Calculation:** Sum of account 2:20:240 (Provisions à court terme)
- **Account Type:** LIABILITY
- **Account Regex:** `^2:20:24`

#### A.10 - Total Net Sales and Service Revenue
**Calculation:** Sum of revenue accounts (Class 3)
- **Account Type:** REVENUE
- **Inverted Sign:** Yes (revenue is negative in accounting, positive in report)

#### A.11 - Total Depreciation and Value Adjustments
**Calculation:** Sum of depreciation expense accounts (account 6:6800 - Amortissements)
- **Account Type:** EXPENSE
- **Account Regex:** `^6:6800`

### Section B: Net Profit (BÉNÉFICE NET)

#### B.1 - Net Profit or Loss According to P&L
**Calculation:** Revenue - Expenses = Net Income
- **Calculated Value:** `netIncome`
- This is the accounting profit as approved by the General Assembly (AG)
- Must correspond to the result from approved financial statements

#### B.2 - Adjustment of Commercial Accounts to Tax Rules
**Calculation:** Manual entry (not calculable from accounting data)
- Adjusts accounting result to comply with tax-specific rules
- **Includes:** Depreciation, value adjustments, and provisions exceeding tax norms
- The creation of these additional hidden reserves affects taxable profit
- **Display:** Input field or note

#### B.3 - Hidden Profit Distributions
**Calculation:** Manual entry (requires analysis)
- Benefits provided to third parties not justified by commercial use
- **Display:** Input field with reference to annex A04b

#### B.4 - Net Profit or Loss for the Period
**Calculation:** B.1 + B.2 + B.3
- **Note:** Requires manual inputs for B.2 and B.3

#### B.5 - Uncompensated Losses from Previous 7 Years
**Calculation:** Manual entry (historical data)
- Losses from tax years 2018-2024
- **Display:** Input field

#### B.6 - Net Profit or Loss After Loss Offset
**Calculation:** B.4 - B.5

#### B.7 - Taxable Net Profit or Loss in Switzerland
**Calculation:** B.6 (or according to annex A01a if apportionment applies)
- **Display:** Same as B.6 for single-canton companies

#### B.8 - Taxable Net Profit or Loss in Canton
**Calculation:** B.7 (or according to annex A01b/A01c if apportionment applies)
- **Display:** Same as B.7 for single-canton companies

#### B.9 - Participation Reduction Percentage
**Calculation:** Manual entry (based on annex A02)
- Reduction for qualifying participations (see A.4 for qualification criteria)
- **Requirements:** Detailed participation inventory required including:
  - Number of shares held
  - Company name
  - Purchase/sale dates
  - Percentages acquired/sold
  - Book value, cost, market value
  - Gross yield, depreciation, admin costs, financing costs
  - Net yield
- **Display:** Input field with reference to annex A02

### Section C: Capital and Reserves (CAPITAL ET RÉSERVES)

Values after profit distribution and dividend payment.

#### C.0 - Dividend for the Period
**Calculation:** Manual entry (based on AGM decision)
- **Display:** Input field

#### C.1 - Share Capital (Paid-in)
**Calculation:** Sum of account 2:28:280 (Capital-actions, capital social)
- **Account Type:** EQUITY
- **Account Regex:** `^2:28:280`
- **Inverted Sign:** Yes

#### C.2 - General Reserve
**Calculation:** Sum of general reserve accounts (account 2:29:290:2900)
- **Account Type:** EQUITY
- **Account Regex:** `^2:29:290:2900`
- **Inverted Sign:** Yes
- **Note:** May require manual split from total reserves

#### C.3 - Other Reserves
**Calculation:** Sum of other reserve accounts (2900-2969, excluding current year profit 2979)
- **Account Type:** EQUITY
- **Account Regex:** `^2:29:290:29[0-6]`
- **Inverted Sign:** Yes

#### C.4 - Reserves from Capital Contributions
**Calculation:** Sum of account 2:29:290:2970 (Réserves provenant d'apports en capital)
- **Account Type:** EQUITY
- **Account Regex:** `^2:29:290:2970`
- **Inverted Sign:** Yes

#### C.5 - Revaluation Reserve
**Calculation:** Sum of revaluation reserve accounts (if any)
- **Account Type:** EQUITY
- **Account Regex:** `^2:29:290:2950` (if exists)
- **Inverted Sign:** Yes
- **Note:** No revaluation reserve visible in current journal

#### C.6 - Treasury Shares
**Calculation:** Sum of treasury share accounts (if any)
- **Account Type:** EQUITY
- **Account Regex:** `^2:29:290:2960` (if exists)
- **Sign:** Negative (reduces equity)
- **Note:** No treasury shares visible in current journal

#### C.7 - Retained Earnings/Losses
**Calculation:** Sum of account 2:29:290:2979 (Bénéfice/perte de l'exercice) - C.0 (dividend)
- **Account Type:** EQUITY
- **Account Regex:** `^2:29:290:2979`
- **Inverted Sign:** Yes
- **Adjustment:** Subtract dividend (C.0)

#### C.8 - Hidden Reserves Taxed as Profit
**Calculation:** Manual entry
- Adjustments for hidden reserves
- **Display:** Input field

#### C.9 - Net Equity (Net Worth) from Tax Balance Sheet
**Calculation:** Sum of all equity accounts + adjustments
- Total Equity (C.1 + C.2 + C.3 + C.4 + C.5 - C.6 + C.7 + C.8)
- **Account Types:** EQUITY
- **Include Net Income:** Yes (if not distributed)

#### C.10 - Hidden Equity
**Calculation:** Manual entry
- **Display:** Input field

#### C.11 - Capital Reduction per Art. 118 LI
**Calculation:** Manual entry
- **Display:** Input field

#### C.12 - Total Taxable Capital
**Calculation:** C.9 + C.10 - C.11 (minimum = paid-in capital C.1)
- **Minimum:** C.1 (paid-in capital)

#### C.13 - Taxable Capital in Switzerland
**Calculation:** C.12 (or according to annex A01a if apportionment applies)

#### C.14 - Taxable Capital in Canton
**Calculation:** C.13 (or according to annex A01b/A01c if apportionment applies)

## Report Template Structure

The report will use a hierarchical structure with:
- **Level 1 (h1):** Main sections (A, B, C)
- **Level 2 (h2):** Subsections within each main section
- **Level 3 (h3):** Individual line items

### Display Characteristics
- **Show Accounts:** Generally false (show only totals)
- **Show Subtotals:** True for aggregated sections
- **Invert Sign:** True for equity, liability, and revenue accounts
- **Calculated Values:** Used for net income and derived calculations

## Implementation Notes

1. **Date Range:** The report should be run for the fiscal year (e.g., `begin:20240101 end:20241231`)
2. **Manual Entries:** Several fields require manual input (B.2, B.3, B.5, B.9, C.0, C.8, C.10, C.11)
3. **Annexes:** Some values reference annexes (A01a, A01b, A01c, A02, A03, A04b) which are separate documents
4. **Account Regex:** The implementation uses regex patterns to match specific account ranges
5. **Zero Balances:** The "hide zero balances" feature should be disabled for tax reports to show all required lines
6. **Foreign Currency:** Companies keeping accounts in foreign currency (functional currency per art. 958d al.3 CO) must indicate exchange rates:
   - For taxable profit: average rate or closing rate
   - For taxable capital: closing rate only
7. **Required Attachments:** The following documents are mandatory:
   - Balance sheet (Bilan)
   - Profit & loss statement (Compte de pertes et profits)
   - Annexes
8. **Société Simple:** If the company is a member of a partnership (société simple per art. 530+ CO), the partnership contract and financial statements must be attached

## Testing Considerations

The report should be tested with:
- Complete fiscal year data
- Partial year data
- Different date ranges
- Companies with and without participations
- Companies with and without inventory
- Verification that all totals match the balance sheet and income statement
