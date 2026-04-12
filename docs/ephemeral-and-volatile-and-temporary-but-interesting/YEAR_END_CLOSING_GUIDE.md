# Year-End Closing Guide for Swiss SMEs (Canton Vaud)

**Document Purpose:** This guide describes the year-end closing process (clôture des comptes / Jahresabschluss) for a Swiss Sàrl using the Swiss SME Chart of Accounts (Plan comptable suisse PME), specifically for Canton Vaud, Switzerland.

**Last Updated:** January 11, 2026  
**Applicable to:** abstratium informatique sàrl (UID CHE-375.146.563)  
**Legal Framework:** Swiss Code of Obligations (CO), Articles 957 et seq.

---

## Quick Reference: Year-End Closing Sequence

**Follow this exact order to avoid printing blank financial statements!**

1. **Phase 1:** Pre-closing preparation (reconcile accounts, verify transactions)
2. **Phase 2:** Closing adjustments:
   - 2.1: Depreciation
   - 2.2: Provisions
   - 2.3: Accruals and deferrals
   - 2.4: Tax provisions
   - 2.5: Legal reserve allocation (5% of profit)
3. **Phase 2.6: 📊 PRINT FINANCIAL STATEMENTS** ← **DO THIS NOW!**
   - Print Income Statement: `hledger is -f 2025.journal -e 2026-01-01`
   - Print Balance Sheet: `hledger bs -f 2025.journal -e 2026-01-01`
   - Save these for tax filing and records
4. **Phase 3:** Closing entries (close all revenue and expense accounts to 2979)
5. **Phase 4:** Transfer profit/loss to retained earnings (January 1 of next year)

**⚠️ Critical:** If you print the income statement after Phase 3, it will be zero because all accounts are closed!

---

## Understanding Your Financial Statements After Year-End Adjustments

### Income Statement: Tax Treatment and Profit Calculation

**Question: Should the income statement include the tax provision as an expense?**

**Answer: YES.** According to Swiss accounting standards, the income statement follows this structure:

```
= Résultat de l'exercice avant impôts (Profit before taxes)
- Impôts directs (Direct taxes - account 8900)
= Résultat de l'exercice (Net profit for the year)
```

**Key Points:**

1. **Tax is an expense:** The tax provision (account 8900) is a legitimate expense that reduces your profit
2. **Net profit after tax:** The final "Résultat de l'exercice" shown on your income statement is the profit AFTER deducting taxes
3. **This is correct:** When you print the income statement after Phase 2.4 (tax provision) and Phase 2.5 (legal reserves), it will show:
   - All revenues
   - All expenses INCLUDING the tax provision
   - Net profit = Revenue - All Expenses (including taxes)

**For Tax Declaration:**

The value you report to Canton Vaud tax authorities is typically the **profit BEFORE taxes** (before the tax provision), not the net profit after taxes. However, Swiss tax law has a circular calculation because:
- Taxes are deductible expenses
- But you need profit to calculate taxes
- This requires an iterative calculation (see the formula in Swiss tax guides)

**Your accountant/fiduciaire will handle this calculation.** The income statement you print shows the accounting profit after tax provisions, which may differ slightly from the final taxable profit due to tax adjustments.

**Losses** - see Wiki support-operations -> reporting-losses

### Balance Sheet: Legal Reserve Allocation Appearance

**Question: After allocating legal reserves, the balance sheet shows account 2950 (positive) and 2979 (negative) that cancel out. Is this correct?**

**Answer: YES, this is CORRECT and NORMAL.** Here's why:

**Before Legal Reserve Allocation:**
```
Equity Section:
2800 Share Capital                    CHF 20,000 (credit)
2950 Legal Reserves                   CHF  1,500 (credit)
2979 Annual Profit/Loss               CHF 10,000 (credit)
Total Equity:                         CHF 31,500
```

**After Legal Reserve Allocation (5% of CHF 10,000 = CHF 500):**
```
Equity Section:
2800 Share Capital                    CHF 20,000 (credit)
2950 Legal Reserves                   CHF  2,000 (credit)  ← Increased by CHF 500
2979 Annual Profit/Loss               CHF  9,500 (credit)  ← Reduced by CHF 500
Total Equity:                         CHF 31,500 (unchanged)
```

**Why it looks "strange":**
- Account 2950 shows a POSITIVE balance (credit, shown as negative in hledger)
- Account 2979 shows a POSITIVE balance (credit, shown as negative in hledger)
- They don't "cancel out" - they're both positive equity accounts
- The allocation simply MOVES profit from 2979 to 2950

**This is legally required by Swiss CO Art. 671-672:**
- 5% of annual profit must be allocated to legal reserves
- Until legal reserves reach 20% of share capital (CHF 4,000 for your company)
- Both accounts remain visible on the balance sheet
- This shows stakeholders how profit is being retained vs. distributed

**After Phase 4 (January 1 transfer):**
The remaining balance in 2979 will be transferred to 2970 (Retained Earnings), and 2979 will be zero for the new year.

---

## Overview of Year-End Closing

### What is Year-End Closing?

Year-end closing (clôture des comptes) is the process of finalizing all accounting records at the end of a fiscal year to:
- Produce accurate financial statements (Balance Sheet and Income Statement)
- Comply with Swiss legal requirements (Code of Obligations)
- Determine the annual profit or loss
- Prepare for the new fiscal year
- Provide stakeholders with a clear picture of the company's financial health

### Key Objectives

1. **Zero out temporary accounts** (revenue and expense accounts)
2. **Transfer net profit/loss** to equity accounts
3. **Ensure accurate balance sheet** reflects the company's financial position
4. **Comply with Swiss accounting standards** and cantonal requirements

---

## Legal Requirements

### Swiss Code of Obligations (CO)

According to Articles 957-963 CO, all Swiss companies must:
- Maintain proper accounting records
- Prepare annual financial statements (Balance Sheet and Income Statement)
- Close accounts at the end of each fiscal year (typically December 31)
- Have accounts approved by the General Assembly (Assemblée Générale)

### Canton Vaud Specifics

- **Fiscal year:** Typically aligns with calendar year (January 1 - December 31)
- **First fiscal year:** Can be 6-23 months depending on cantonal rules (Vaud allows up to 18 months)
- **Audit requirements:** Depend on company size (see CO Art. 727 et seq.)

### Financial Statement Components

Required documents:
1. **Balance Sheet (Bilan)** - Assets, Liabilities, and Equity
2. **Income Statement (Compte de résultat)** - Revenues and Expenses
3. **Annexe** - Notes to financial statements (if required)

---

## The Closing Process - Step by Step

### Phase 1: Pre-Closing Preparation (Before December 31)

#### 1.1 Update All Accounting Records
- Ensure all transactions through December 31 are recorded
- Reconcile bank accounts
- Verify cash balances
- Review all accounts for accuracy

#### 1.2 Conduct Physical Inventory
For companies with inventory (accounts 120x):
- Count physical stock
- Value inventory at lower of cost or market value
- Record any obsolete or damaged goods
- Adjust inventory accounts accordingly

#### 1.3 Review Accounts Receivable (Account 1100)
- Identify outstanding invoices
- Assess collectibility
- Create provisions for doubtful debts if necessary
- Ensure all revenue for services delivered in the year is recorded (accrual basis)

#### 1.4 Review Accounts Payable (Account 2000)
- Verify all supplier invoices received
- Record any goods/services received but not yet invoiced
- Ensure all expenses incurred in the year are recorded

### Phase 2: Closing Adjustments (December 31)

#### 2.1 Depreciation (Amortissements)
Record depreciation for fixed assets:
```
Account 6800 (Depreciation expense)          Debit
Account 14xx (Fixed assets - accumulated)    Credit
```

#### 2.2 Provisions
Create or adjust provisions for:
- Warranty obligations
- Legal disputes
- Restructuring costs
- Other known liabilities with uncertain timing/amount

#### 2.3 Accruals and Deferrals
- **Prepaid expenses:** Expenses paid in advance for next year
- **Accrued expenses:** Expenses incurred but not yet paid
- **Deferred revenue:** Revenue received but not yet earned
- **Accrued revenue:** Revenue earned but not yet invoiced (important for service companies)

Example for accrued revenue:
```
December 31, 2025
Account 1100 (Accounts Receivable)           Debit   XXX CHF
Account 3xxx (Revenue)                       Credit  XXX CHF
; Description: Revenue for services delivered in December but invoiced in January
```

#### 2.4 Tax Provisions

Tax provisions are estimates of taxes owed but not yet paid or assessed. In Switzerland, companies must provision for various taxes at year-end.

Note by Ant: the tax office sends a bill for the current tax year, say in Feb and this is paid based on their estimates. the tax provision that is calculated should be the difference, i.e. any extra tax that is due because of extra profits earned, that were not foreseen in the estimate that the tax office sent at the beginning of the year.

**Losses** - see Wiki support-operations -> reporting-losses


**Types of Tax Provisions:**

1. **Corporate Income Tax (Impôt sur le bénéfice)**
   - Calculate based on estimated taxable profit
   - Rates vary by canton (Vaud: approximately 14-22% combined federal and cantonal)
   - Account: 8900 (Direct taxes for legal entities)

2. **Capital Tax (Impôt sur le capital)**
   - Based on equity/net worth
   - Vaud rate: approximately 0.1-0.3% of capital
   - Account: 8900 (Direct taxes for legal entities)

3. **VAT Liabilities (if applicable)**
   - If registered for VAT, provision for net VAT owed
   - Account: 2201 (VAT payable)

**How to Record Tax Provisions:**

```
December 31, 2025 * Provision for corporate income tax
    ; YearEnd:TaxProvision
    8 Charges et Produits hors Explotation:8900 Impôts directs    CHF X,XXX.XX
    2 Passif / Liabilities:20:220 Tax liabilities                 CHF -X,XXX.XX
    ; Estimated tax on 2025 profit
```

**Calculation Example:**

If your company has a profit of CHF 50,000:
- Estimated income tax (20%): CHF 10,000
- Estimated capital tax on CHF 20,000 equity (0.2%): CHF 40
- Total tax provision: CHF 10,040

Note: that example doesn't subtract the taxes paid after the tax authorities sent an invoice for 2025 in march 2025, based on their own estimates. 

**Important Notes:**

1. **Estimates:** Tax provisions are estimates; actual tax will be determined by tax authorities
2. **Professional Advice:** Consult with a fiduciaire or tax advisor for accurate calculations
3. **Adjustments:** When actual tax is assessed, adjust the provision accordingly
4. **Account 8900:** This is a special account for direct taxes (outside normal operations)
5. **Timing:** Provisions should be recorded on December 31 (year-end)

**Using Macros:**

Use the `TaxProvision` macro to record year-end tax provisions:
1. Calculate the provision amount with your accountant
2. Run the macro with the calculated amount
3. The entry will be automatically tagged with `YearEnd:TaxProvision`

### Phase 2.5: Legal Reserve Allocation (December 31) - MANDATORY

**Swiss law requires Sàrls to allocate 5% of annual profit to legal reserves until reserves reach 20% of share capital.**

For your company with CHF 20,000 capital:
- **Target:** CHF 4,000 (20% of capital)
- **Annual allocation:** 5% of profit
- **Stop when:** Account 2950 reaches CHF 4,000

**When to book:**
This allocation should be recorded **after** the tax provision but **before** closing entries, on December 31.

**Calculation Example:**

If your annual profit (before reserve allocation) is CHF 10,000:
1. Calculate 5% of profit: CHF 500
2. Check current balance of account 2950
3. If balance < CHF 4,000, allocate the 5% (or remaining amount to reach CHF 4,000)

**Journal Entry:**

```
December 31, 2025 * Legal reserve allocation | 5% of profit per Swiss CO Art. 671
    ; id:[uuid]
    ; YearEnd:LegalReserve
    2 Passif / Equity:290:2979 Annual profit/loss    CHF 500.00
    2 Passif / Equity:290:2950 Legal reserves        CHF -500.00
```

**Using Macros:**

Use the `LegalReserveAllocation` macro:
1. Calculate annual profit before allocation
2. Calculate 5% (or remaining amount to reach target)
3. Run the macro with both amounts
4. The entry will be automatically tagged with `YearEnd:LegalReserve`

**Important Notes:**

1. **Mandatory:** This is required by Swiss law (CO Art. 671-671a)
2. **Sequence:** Book this AFTER tax provision, BEFORE closing entries
3. **Target:** Stop allocating once 2950 reaches CHF 4,000
4. **Profit reduction:** This reduces distributable profit to shareholders
5. **Cannot be distributed:** Legal reserves cannot be paid out as dividends

**Example Timeline:**
- Year 1: Profit CHF 10,000 → Allocate CHF 500 → Legal reserves = CHF 500
- Year 2: Profit CHF 12,000 → Allocate CHF 600 → Legal reserves = CHF 1,100
- Year 3: Profit CHF 15,000 → Allocate CHF 750 → Legal reserves = CHF 1,850
- ...continue until legal reserves = CHF 4,000

### Phase 2.6: Print Financial Statements (December 31) ⚠️ IMPORTANT TIMING

**CRITICAL: Print your income statement and balance sheet NOW, before Phase 3 (Closing Entries)!**

After you have:
- ✅ Recorded all tax provisions (Phase 2.4)
- ✅ Recorded legal reserve allocation (Phase 2.5)
- ✅ Completed all other adjustments (depreciation, accruals, etc.)

But BEFORE you:
- ❌ Close revenue and expense accounts (Phase 3)

**Why this timing matters:**

1. **Income Statement shows your profit:** At this point, all revenue and expense accounts still have their balances, showing your company's actual profit/loss for the year
2. **After closing, accounts are zero:** Once you close the accounts in Phase 3, all revenue and expense accounts become zero, and your income statement will be empty!
3. **Tax filing requirement:** Swiss tax authorities need the income statement showing actual revenues and expenses, not a blank report

**What to print:**

```bash
# Income Statement (Compte de résultat) - Shows profit/loss
hledger is -f abstratium-2025.journal -e 2026-01-01

# Balance Sheet (Bilan) - Shows financial position
hledger bs -f abstratium-2025.journal -e 2026-01-01
```

**Save these reports** as PDF or print them - these are your official financial statements for 2025 that you'll need for:
- Tax filing with Canton Vaud
- General Assembly approval
- Your fiduciaire/accountant
- Company records

**Example of what you'll see:**

Before closing (correct time to print):
```
Income Statement 2025-01-01 to 2025-12-31

Revenue:
  3200 Revenue from services        CHF 50,000.00

Expenses:
  6500 Administration                CHF 10,000.00
  6570 IT expenses                   CHF  2,000.00
  8900 Direct taxes (provision)      CHF  8,000.00
  
Net Profit:                          CHF 30,000.00
```

After closing (too late - everything is zero!):
```
Income Statement 2025-01-01 to 2025-12-31

Revenue:                             CHF      0.00
Expenses:                            CHF      0.00
Net Profit:                          CHF      0.00
```

### Phase 3: Closing Entries (December 31)

This is the core of the year-end closing process.

#### 3.1 Close All Revenue Accounts (Class 3)

Transfer all revenue account balances to **Account 2979** (Annual profit or loss):

```
December 31, 2025 * Close revenue account 3xxx
    6 Autres Charges / Other Expenses:9200 Profit/Loss Summary    CHF X.XX
    3 Produits / Revenue:3xxx [Specific revenue account]          CHF -X.XX
```

**Note:** In the Swiss SME system, we typically use account 2979 directly as the "income summary" account rather than a separate 9200 account. The 9200 account is more common in other systems.

#### 3.2 Close All Expense Accounts (Classes 4, 5, 6)

Transfer all expense account balances to **Account 2979**:

For each expense account:
```
December 31, 2025 * Close expense account 6xxx
    2 Passif / Equity:290:2979 (Annual profit/loss)              CHF X.XX
    6 Autres Charges:6xxx [Specific expense account]             CHF -X.XX
```

**Expense account classes to close:**
- **Class 4:** Cost of goods and materials
- **Class 5:** Personnel expenses
- **Class 6:** Other operating expenses, depreciation, financial expenses

#### 3.3 Determine Net Profit or Loss

After closing all revenue and expense accounts, **Account 2979** will contain:
- **Positive balance (credit):** Net profit for the year
- **Negative balance (debit):** Net loss for the year

### Phase 4: Transfer to Retained Earnings (January 1 of next year)

On the first day of the new fiscal year, transfer the annual profit/loss to retained earnings:

```
January 1, 2026 * Transfer of Annual Profit/Loss 2025
    2 Passif / Equity:290:2970 (Profit carried forward)          CHF X.XX
    2 Passif / Equity:290:2979 (Annual profit/loss)              CHF -X.XX
```

**Important:** This entry is dated January 1 of the NEW year, not December 31 of the closing year.

#### Where Should This Entry Be Recorded?

Based on Swiss accounting practice and software standards (e.g., Crésus Comptabilité), this transfer entry should be recorded **at the opening of the new year's journal file**, not at the end of the old year's file.

**Standard Swiss Practice (per Crésus documentation):**
1. **Old year file (2025.journal):** Contains all closing entries dated December 31, 2025
2. **New year file (2026.journal):** Contains the transfer entry dated January 1, 2026, followed by opening balances

**Rationale:**
- The transfer represents the **opening** of the new accounting period, not the closing of the old one
- Swiss accounting software (Crésus, Banana, etc.) automatically generates this entry when "reopening" for the new year
- This keeps the old year's file "closed" and complete, while the new year starts with the profit/loss transfer
- For tax purposes, the Canton of Vaud requires the annual financial statements to show the profit/loss in account 2979 at year-end; the transfer to 2970 is an administrative action for the new year

**Current hledger-web-extended Implementation:**

The current implementation places the transfer entry (dated January 1, 2026) **in the old year's file** (2025.journal). This is a deviation from standard Swiss practice but has some practical advantages:
- All transactions related to year 2025's results are in one file
- The balance of account 2979 is automatically zero when opening the new year
- Simpler opening balance calculation for the new year file

**Recommendation:**

For Swiss tax compliance and standard accounting practice, **consider moving the transfer entry to the new year's file**. However, the current implementation is acceptable as long as:
1. The entry is clearly dated January 1 of the new year
2. The old year's financial statements (for tax filing) show the profit in account 2979
3. Documentation clearly explains the approach

**References:**
- Crésus Comptabilité documentation: "Report automatique du bénéfice / de la perte" - https://support.cresus.ch/manuels/cresus-comptabilite/report-automatique-du-benefice-de-la-perte-193/
- Swiss accounting practice: The transfer is part of the "réouverture" (reopening) process for the new year

After this entry:
- Account 2979 (Annual profit/loss) is zeroed out
- Account 2970 (Retained earnings) reflects cumulative profits/losses
- The new fiscal year starts with clean revenue and expense accounts

---

## Closing Entries for Revenue and Expense Accounts

### Revenue Accounts (Class 3)

**Account Structure:**
- **3000-3999:** Various revenue categories
- **3200:** Revenue from services
- **3400:** Revenue from goods

**Closing Process:**
1. Identify all revenue accounts with balances
2. For each revenue account, create a closing entry transferring the balance to 2979
3. Revenue accounts normally have **credit balances**
4. To close them, **debit** the revenue account and **credit** account 2979

**Example:**
```
2025-12-31 * Close revenue from services
    ; Closing:
    2 Passif / Equity:290:2979 Bénéfice de l'exercice    CHF 50000.00
    3 Produits:3200 Revenue from services                CHF -50000.00
```

### Expense Accounts (Classes 4, 5, 6)

**Account Structure:**
- **Class 4:** Cost of materials and goods
  - 4000: Purchase of goods for resale
  - 4200: Purchase of materials
- **Class 5:** Personnel expenses
  - 5000: Salaries and wages
  - 5700: Social charges
- **Class 6:** Other operating expenses
  - 6000: Premises charges (rent)
  - 6300: Insurance, taxes, permits
  - 6400: Energy and waste disposal
  - 6500: Administration charges
  - 6570: IT charges
  - 6600: Advertising
  - 6700: Other operating expenses
  - 6800: Depreciation
  - 6900: Financial charges (interest)

**Closing Process:**
1. Identify all expense accounts with balances
2. For each expense account, create a closing entry transferring the balance to 2979
3. Expense accounts normally have **debit balances**
4. To close them, **credit** the expense account and **debit** account 2979

**Example:**
```
2025-12-31 * Close IT expenses
    ; Closing:
    2 Passif / Equity:290:2979 Bénéfice de l'exercice    CHF 1500.00
    6 Autres Charges:6570 IT charges                     CHF -1500.00
```

### Complete Closing Entry Pattern

For a company with multiple expense accounts, you would have multiple entries like:

```
2025-12-31 * Transfer expenses 6300 to 2979 to close year
    ; Closing:
    2 Passif / Equity:290:2979 Bénéfice de l'exercice    CHF 10.35
    6 Autres Charges:6300 Insurance expense              CHF -10.35

2025-12-31 * Transfer expenses 6400 to 2979 to close year
    ; Closing:
    2 Passif / Equity:290:2979 Bénéfice de l'exercice    CHF 47.45
    6 Autres Charges:6400 Energy expenses                CHF -47.45

2025-12-31 * Transfer expenses 6500 to 2979 to close year
    ; Closing:
    2 Passif / Equity:290:2979 Bénéfice de l'exercice    CHF 1081.00
    6 Autres Charges:6500 Administrative expenses        CHF -1081.00
```

---

## Special Considerations for Accounts Receivable

### Understanding Accounts Receivable (Account 1100)

Accounts receivable represents money owed to your company by customers for goods delivered or services rendered but not yet paid. This is a **critical asset account** that requires special attention during year-end closing.

### Key Principles

1. **Accrual Accounting:** Revenue must be recognized when earned, not when cash is received
2. **Matching Principle:** Revenue should be recorded in the period when the service was delivered
3. **Asset Recognition:** Outstanding invoices are assets on your balance sheet

### Year-End Procedures for Accounts Receivable

#### Step 1: Review All Outstanding Invoices

At year-end, identify:
- **Paid invoices:** No action needed (already recorded as revenue)
- **Unpaid invoices issued before year-end:** Already recorded as revenue and A/R
- **Services delivered but not yet invoiced:** Need accrual entry

#### Step 2: Record Accrued Revenue (If Applicable)

If you delivered services in December 2025 but will invoice in January 2026:

```
2025-12-31 * Accrued revenue for services delivered in December
    ; Accrual:
    1 Actifs / Assets:10:110:1100 Accounts Receivable    CHF 5000.00
    3 Produits:3200 Revenue from services                CHF -5000.00
    ; Description: Services delivered to Client X in December, invoice to be issued in January
```

When you issue the invoice in January 2026:
```
2026-01-15 * Invoice #2026-001 to Client X
    1 Actifs / Assets:10:110:1100 Accounts Receivable    CHF 0.00
    3 Produits:3200 Revenue from services                CHF 0.00
    ; Note: Revenue already recognized in 2025, this is just documentation
```

Or, if you prefer to reverse the accrual:
```
2026-01-01 * Reverse accrual from 2025
    ; Accrual:Reversal
    1 Actifs / Assets:10:110:1100 Accounts Receivable    CHF -5000.00
    3 Produits:3200 Revenue from services                CHF 5000.00

2026-01-15 * Invoice #2026-001 to Client X
    1 Actifs / Assets:10:110:1100 Accounts Receivable    CHF 5000.00
    3 Produits:3200 Revenue from services                CHF -5000.00
```

#### Step 3: Assess Collectibility

Review all outstanding receivables for:
- **Age of receivables:** How long have they been outstanding?
- **Customer payment history:** Are there collection issues?
- **Doubtful debts:** Create provisions if necessary

**Provision for doubtful debts:**
```
2025-12-31 * Provision for doubtful debts
    ; Provision:
    6 Autres Charges:6700 Other operating expenses       CHF 500.00
    1 Actifs / Assets:10:110:1109 Provision for bad debts CHF -500.00
```

#### Step 4: Reconciliation

Ensure that:
- Account 1100 balance = Sum of all unpaid invoices
- All revenue for the year is properly recorded
- No revenue from next year is prematurely recognized

### Impact on Year-End Closing

**Important:** Accounts receivable (Account 1100) is a **balance sheet account**, not an income statement account. Therefore:

1. **Account 1100 is NOT closed** at year-end
2. The balance carries forward to the next year
3. Only the **revenue accounts (Class 3)** are closed to Account 2979

**Example of what happens:**

Before closing:
- Account 1100 (A/R): CHF 10,000 debit balance
- Account 3200 (Revenue): CHF 50,000 credit balance

After closing revenue accounts:
- Account 1100 (A/R): CHF 10,000 debit balance (UNCHANGED)
- Account 3200 (Revenue): CHF 0 (closed to 2979)
- Account 2979: Includes the CHF 50,000 revenue

### Common Scenarios

#### Scenario 1: Invoice Issued and Paid in Same Year
```
2025-03-15 * Invoice #2025-010
    1 Actifs:10:110:1100 Accounts Receivable    CHF 1000.00
    3 Produits:3200 Revenue                     CHF -1000.00

2025-04-10 * Payment received for Invoice #2025-010
    1 Actifs:10:100:1020 Bank Account           CHF 1000.00
    1 Actifs:10:110:1100 Accounts Receivable    CHF -1000.00
```
**Year-end impact:** Revenue recognized in 2025, A/R is zero, no special closing entry needed.

#### Scenario 2: Invoice Issued in 2025, Paid in 2026
```
2025-12-20 * Invoice #2025-100
    1 Actifs:10:110:1100 Accounts Receivable    CHF 2000.00
    3 Produits:3200 Revenue                     CHF -2000.00

; Year-end closing on 2025-12-31
; Account 1100 shows CHF 2000 debit balance
; Account 3200 is closed to 2979

2026-01-15 * Payment received for Invoice #2025-100
    1 Actifs:10:100:1020 Bank Account           CHF 2000.00
    1 Actifs:10:110:1100 Accounts Receivable    CHF -2000.00
```
**Year-end impact:** Revenue recognized in 2025, A/R balance of CHF 2000 carries forward to 2026.

#### Scenario 3: Service Delivered in 2025, Invoice Issued in 2026
```
2025-12-31 * Accrued revenue for December services
    ; Accrual:
    1 Actifs:10:110:1100 Accounts Receivable    CHF 3000.00
    3 Produits:3200 Revenue                     CHF -3000.00
    ; Services delivered in December, invoice to be issued in January

; Year-end closing
; Revenue of CHF 3000 is included in 2025 results

2026-01-10 * Invoice #2026-001 (for December 2025 services)
    ; This invoice documents the accrued revenue
    ; No additional revenue recognition needed
```
**Year-end impact:** Revenue recognized in 2025 via accrual, A/R balance carries forward.

---

## Account Structure in Swiss SME Chart

### Equity Accounts (Class 2, Subclass 28 and 29)

#### Account 28: Share Capital (Capitaux propres)
- **2800:** Basic share capital / Capital social
  - This is the initial capital invested by shareholders
  - Remains constant unless capital increase/decrease

#### Account 29: Reserves and Retained Earnings (Réserves et bénéfices)
- **2970:** Profit carried forward / Bénéfice reporté
  - Cumulative retained earnings from prior years
  - Increases with profits, decreases with losses
  - This is a **permanent equity account**
  
- **2979:** Annual profit or loss / Bénéfice de l'exercice
  - Current year's net profit or loss
  - Acts as the "income summary" account
  - This is a **temporary equity account** that is zeroed out each year

### The Flow of Profit Through Equity Accounts

```
Year 1:
- Revenue and expenses flow through operations
- At year-end, net profit accumulates in Account 2979
- On Jan 1 of Year 2, transfer 2979 → 2970

Year 2:
- Account 2979 starts at zero
- New revenue and expenses for Year 2
- At year-end, Year 2 profit accumulates in Account 2979
- On Jan 1 of Year 3, transfer 2979 → 2970

And so on...
```

### Why Two Accounts?

1. **Account 2979** allows you to see the current year's performance separately
2. **Account 2970** shows the cumulative historical performance
3. This separation is required by Swiss accounting standards
4. It facilitates financial statement preparation and analysis

---

## Practical Examples

### Example 1: Simple Year-End Closing (No A/R)

**Scenario:** Small company with only expenses in 2024, no revenue, no accounts receivable.

**Accounts before closing:**
- 6300 (Insurance): CHF 10.35 debit
- 6400 (Energy): CHF 47.45 debit
- 6500 (Admin): CHF 1,081.00 debit
- 6570 (IT): CHF 1.60 debit
- 6700 (Other): CHF 6.80 debit
- 6900 (Financial): CHF 205.00 debit
- **Total expenses:** CHF 1,352.20

**Closing entries (December 31, 2024):**
```
2024-12-31 * Transfer expenses 6300 to 2979
    2 Passif / Equity:290:2979    CHF 10.35
    6 Autres Charges:6300         CHF -10.35

2024-12-31 * Transfer expenses 6400 to 2979
    2 Passif / Equity:290:2979    CHF 47.45
    6 Autres Charges:6400         CHF -47.45

2024-12-31 * Transfer expenses 6500 to 2979
    2 Passif / Equity:290:2979    CHF 1081.00
    6 Autres Charges:6500         CHF -1081.00

2024-12-31 * Transfer expenses 6570 to 2979
    2 Passif / Equity:290:2979    CHF 1.60
    6 Autres Charges:6570         CHF -1.60

2024-12-31 * Transfer expenses 6700 to 2979
    2 Passif / Equity:290:2979    CHF 6.80
    6 Autres Charges:6700         CHF -6.80

2024-12-31 * Transfer expenses 6900 to 2979
    2 Passif / Equity:290:2979    CHF 205.00
    6 Autres Charges:6900         CHF -205.00
```

**Result after closing:**
- All expense accounts: CHF 0
- Account 2979: CHF 1,352.20 debit (loss)

**Transfer to retained earnings (January 1, 2025):**
```
2025-01-01 * Transfer of Annual Loss 2024
    2 Passif / Equity:290:2970    CHF 1352.20
    2 Passif / Equity:290:2979    CHF -1352.20
```

**Result after transfer:**
- Account 2979: CHF 0
- Account 2970: CHF 1,352.20 debit (cumulative loss)

### Example 2: Year-End Closing with Revenue and A/R

**Scenario:** Service company with revenue, expenses, and outstanding invoices in 2025.

**Accounts before closing:**
- 1100 (Accounts Receivable): CHF 15,000 debit (unpaid invoices)
- 3200 (Revenue from services): CHF 80,000 credit
- 6500 (Admin expenses): CHF 20,000 debit
- 6570 (IT expenses): CHF 5,000 debit
- 6900 (Financial expenses): CHF 1,000 debit

**Step 1: Close revenue accounts (December 31, 2025):**
```
2025-12-31 * Close revenue from services
    ; Closing:
    2 Passif / Equity:290:2979    CHF 80000.00
    3 Produits:3200               CHF -80000.00
```

**Step 2: Close expense accounts (December 31, 2025):**
```
2025-12-31 * Close administrative expenses
    ; Closing:
    2 Passif / Equity:290:2979    CHF 20000.00
    6 Autres Charges:6500         CHF -20000.00

2025-12-31 * Close IT expenses
    ; Closing:
    2 Passif / Equity:290:2979    CHF 5000.00
    6 Autres Charges:6570         CHF -5000.00

2025-12-31 * Close financial expenses
    ; Closing:
    2 Passif / Equity:290:2979    CHF 1000.00
    6 Autres Charges:6900         CHF -1000.00
```

**Result after closing:**
- Account 1100 (A/R): CHF 15,000 debit (UNCHANGED - carries forward)
- Account 3200: CHF 0
- Account 6500: CHF 0
- Account 6570: CHF 0
- Account 6900: CHF 0
- Account 2979: CHF 54,000 credit (profit = 80,000 - 26,000)

**Step 3: Transfer to retained earnings (January 1, 2026):**
```
2026-01-01 * Transfer of Annual Profit 2025
    ; Closing:
    2 Passif / Equity:290:2970    CHF -54000.00
    2 Passif / Equity:290:2979    CHF 54000.00
```

**Final result:**
- Account 1100 (A/R): CHF 15,000 debit (carries forward to 2026)
- Account 2979: CHF 0
- Account 2970: CHF 54,000 credit (cumulative profit)

### Example 3: Accrued Revenue at Year-End

**Scenario:** Services delivered in December 2025, invoice to be issued in January 2026.

**During December 2025:**
```
2025-12-15 * Services delivered to Client ABC
    ; Work completed but not yet invoiced
    ; Will invoice in January 2026
```

**Year-end accrual (December 31, 2025):**
```
2025-12-31 * Accrued revenue for December services
    ; Accrual:
    1 Actifs:10:110:1100 Accounts Receivable    CHF 8000.00
    3 Produits:3200 Revenue from services       CHF -8000.00
    ; Services delivered to Client ABC in December, invoice #2026-005 to be issued
```

**Close revenue accounts (December 31, 2025):**
```
2025-12-31 * Close revenue from services
    ; Closing:
    2 Passif / Equity:290:2979    CHF 8000.00
    3 Produits:3200               CHF -8000.00
```

**Issue invoice (January 2026):**
```
2026-01-10 * Invoice #2026-005 to Client ABC
    ; Revenue already recognized in 2025
    ; This invoice documents the accrued revenue
    ; No additional journal entry needed, or:
    
    ; Optional: Add a memo entry for tracking
    1 Actifs:10:110:1100 Accounts Receivable    CHF 0.00
    3 Produits:3200 Revenue from services       CHF 0.00
    ; Memo: Invoice issued for accrued revenue from 2025
```

**Receive payment (January 2026):**
```
2026-01-25 * Payment received for Invoice #2026-005
    1 Actifs:10:100:1020 Bank Account           CHF 8000.00
    1 Actifs:10:110:1100 Accounts Receivable    CHF -8000.00
```

**Key points:**
- Revenue recognized in 2025 (when earned)
- A/R balance of CHF 8,000 carries forward to 2026
- Payment in 2026 reduces A/R but does not affect 2026 revenue
- This follows the accrual accounting principle

---

## Timeline and Deadlines

### Typical Year-End Closing Timeline

| Date | Activity |
|------|----------|
| **Throughout the year** | Maintain accurate, up-to-date accounting records |
| **December 1-15** | Begin pre-closing review, reconcile accounts |
| **December 15-30** | Conduct physical inventory (if applicable) |
| **December 31** | Record all closing adjustments and closing entries |
| **January 1** | Transfer annual profit/loss to retained earnings |
| **January-February** | Prepare financial statements |
| **February-March** | External audit (if required) |
| **March-April** | General Assembly approval of accounts |
| **April-May** | File tax returns (varies by canton) |

### Canton Vaud Specific Deadlines

- **Tax return deadline:** Typically March 31 of the following year (extensions possible)
- **General Assembly:** Must be held within 6 months of fiscal year-end
- **Commercial Register:** File annual report if required

---

## Common Mistakes to Avoid

### 1. Not Recording All Accruals
**Mistake:** Forgetting to record revenue for services delivered but not yet invoiced.
**Impact:** Understated revenue and profit for the year.
**Solution:** Review all projects/services at year-end and record accrued revenue.

### 2. Closing Balance Sheet Accounts
**Mistake:** Attempting to close accounts receivable, inventory, or other balance sheet accounts.
**Impact:** Incorrect financial statements.
**Solution:** Only close income statement accounts (revenue and expenses, classes 3-6).

### 3. Wrong Date for Profit Transfer
**Mistake:** Dating the profit transfer entry December 31 instead of January 1.
**Impact:** Confusion in financial statements, potential audit issues.
**Solution:** Always date the transfer of 2979 → 2970 as January 1 of the new year.

### 4. Incomplete Closing Entries
**Mistake:** Forgetting to close some expense or revenue accounts.
**Impact:** Incorrect profit calculation, accounts don't balance.
**Solution:** Use a checklist of all accounts to ensure complete closing.

### 5. Not Reconciling Before Closing
**Mistake:** Closing accounts without reconciling bank statements, A/R, A/P.
**Impact:** Errors carried forward to next year.
**Solution:** Complete all reconciliations before starting closing process.

### 6. Ignoring Depreciation
**Mistake:** Not recording annual depreciation on fixed assets.
**Impact:** Overstated assets and profit.
**Solution:** Calculate and record depreciation for all depreciable assets.

### 7. Mixing Personal and Business Expenses
**Mistake:** Including personal expenses in business accounts (especially for sole proprietors).
**Impact:** Incorrect profit calculation, tax issues.
**Solution:** Maintain strict separation between personal and business transactions.

### 8. Not Documenting Closing Entries
**Mistake:** Creating closing entries without proper descriptions or tags.
**Impact:** Difficulty in auditing and understanding the closing process.
**Solution:** Use clear descriptions and tags (e.g., `Closing:`) for all year-end entries.

---

## References

### Legal Framework
- **Swiss Code of Obligations (CO):** Articles 957-963 (Accounting and Financial Reporting)
- **Swiss Code of Obligations (CO):** Articles 727-731 (Audit Requirements)

### Standards and Guidelines
- **Swiss SME Chart of Accounts (Plan comptable suisse PME):** Standard reference for SME accounting in Switzerland
- **Swiss GAAP FER:** Swiss Generally Accepted Accounting Principles (for larger companies)

### Useful Resources
- **Swiss Federal Tax Administration (AFC/ESTV):** https://www.estv.admin.ch/
- **Canton Vaud Tax Administration:** https://www.vd.ch/themes/etat-droit-finances/impots/
- **SME Portal (KMU Portal):** https://www.kmu.admin.ch/
- **Banana Accounting:** https://www.banana.ch/ (Swiss accounting software with SME templates)

### Professional Assistance
For complex situations, consider consulting:
- **Fiduciaire (Trust company):** Professional accounting and tax services
- **Expert-comptable (Certified accountant):** For audit and advisory services
- **Réviseur (Auditor):** For statutory audit requirements

---

## Appendix: Account Reference Quick Guide

### Balance Sheet Accounts (NOT Closed at Year-End)

| Account | Name | Type |
|---------|------|------|
| 1000 | Cash | Asset |
| 1020 | Bank Account | Asset |
| 1100 | Accounts Receivable | Asset |
| 120x | Inventory | Asset |
| 14xx | Fixed Assets | Asset |
| 2000 | Accounts Payable | Liability |
| 21xx | Short-term Debt | Liability |
| 24xx | Long-term Debt | Liability |
| 2800 | Share Capital | Equity |
| 2970 | Retained Earnings | Equity |
| 2979 | Annual Profit/Loss | Equity (temporary) |

### Income Statement Accounts (Closed at Year-End)

| Account | Name | Type |
|---------|------|------|
| 3xxx | Revenue | Revenue |
| 4xxx | Cost of Goods | Expense |
| 5xxx | Personnel Expenses | Expense |
| 6000 | Rent | Expense |
| 6300 | Insurance, Taxes | Expense |
| 6400 | Energy | Expense |
| 6500 | Administration | Expense |
| 6570 | IT Expenses | Expense |
| 6600 | Advertising | Expense |
| 6700 | Other Operating Expenses | Expense |
| 6800 | Depreciation | Expense |
| 6900 | Financial Expenses | Expense |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-11 | Cascade AI | Initial creation based on Swiss accounting standards and abstratium's 2024 closing |
| 1.1 | 2026-01-16 | Cascade AI | Added Phase 2.6 and Quick Reference to clarify when to print financial statements (BEFORE closing entries, AFTER tax provisions and legal reserves) |

---

**Note:** This guide is for informational purposes and reflects general Swiss accounting practices. For specific situations, especially those involving complex transactions, international operations, or significant assets, consult with a qualified Swiss accountant or fiduciaire.
