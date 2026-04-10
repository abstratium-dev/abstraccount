# Swiss SME Accounting Plan Comparison Analysis

**Date:** 2025-01-13  
**Purpose:** Compare the standard Swiss SME accounting plan with accounts defined in `abstratium-2025.journal`

---

## Executive Summary

The journal file contains a **minimal subset** of the complete Swiss SME accounting plan, with only **32 account declarations** compared to the standard plan's **150+ accounts**. The implementation focuses on accounts actively used by the business, following a pragmatic approach rather than implementing the complete chart of accounts.

---

## Major Structural Differences

### 1. **Account Hierarchy Naming Convention**
- **Standard Plan:** Uses numeric codes only (e.g., `1000`, `2000`)
- **Your Implementation:** Uses hierarchical descriptive names with embedded codes (e.g., `1 Actifs / Assets:10 Actif circulants / Current Assets:100 Trésorerie / Cash and cash equivalents:1000 Caisse / Cash`)
- **Impact:** More readable but longer account names; bilingual (French/English)

### 2. **Type Classification Differences**
- **Standard Plan:** Uses generic types (Asset, Liability, Revenue, Expense)
- **Your Implementation:** 
  - Correctly uses `type:Equity` for equity accounts (accounts 28, 290)
  - Uses `type:Cash` for liquid accounts (1000, 1020) - beneficial for cash flow reporting
  - Separates Equity from Liabilities (standard plan lists equity under "Liabilities")

---

## Missing Account Categories

### Assets (Class 1) - Missing Accounts

#### **106 - Short-term marketable securities** ❌
- 1060 Securities
- 1069 Adjustment of securities value

#### **110 - Receivables** - Partially Implemented ⚠️
- ✅ 1100 Receivables from deliveries and services (PRESENT)
- ❌ 1109 Allowance for doubtful accounts (MISSING)
- ❌ 1110 Receivables from group companies (MISSING)

#### **114 - Other short-term receivables** ❌
- 1140 Advances and loans
- 1149 Adjustment of advances and loans value
- 1170 Input tax: VAT on materials, goods, services, and energy (not needed until VAT-registered)
- 1171 Input tax: VAT on investments and other operating expenses (not needed until VAT-registered)
- 1176 Withholding tax
- 1180 Receivables from social insurances
- 1189 Source tax
- 1190 Other short-term receivables
- 1199 Adjustment of short-term receivables value

#### **120 - Inventories** - Partially Implemented ⚠️
- ❌ 1200 Commercial goods (standard uses this for trade goods)
- ✅ 1200 Stock de matériel et composants (YOUR CUSTOM - hardware/components)
- ❌ 1210 Raw materials (standard definition)
- ✅ 1210 Produits finis (YOUR VERSION - Finished goods)
- ❌ 1220 Auxiliary materials (standard definition)
- ✅ 1220 Travaux en cours (YOUR VERSION - Work in progress)
- ❌ 1230 Consumables (standard definition)
- ✅ 1230 Marchandises destinées à la revente (YOUR VERSION - Goods for resale)
- ❌ 1250 Consignment goods
- ❌ 1260 Finished goods inventories (standard numbering)
- ❌ 1280 Work in progress (standard numbering)

**Note:** Your 120 series uses different account numbers than the standard plan for similar concepts.

#### **130 - Active accruals** ❌
- 1300 Prepaid expenses
- 1301 Accrued income

#### **140 - Financial fixed assets** ❌
- 1400 Long-term securities
- 1409 Adjustment of long-term securities value
- 1440 Loans
- 1441 Mortgages
- 1449 Adjustment of long-term receivables value

#### **148 - Investments** ❌
- 1480 Investments
- 1489 Adjustment of investments value

#### **150 - Tangible fixed assets** - Minimally Implemented ⚠️
- ✅ 150 Immobilisations corporelles meubles (PRESENT as group)
- ❌ 1500 Machinery and equipment
- ❌ 1509 Adjustment of machinery and equipment value
- ❌ 1510 Furniture and fixtures
- ❌ 1519 Adjustment of furniture and fixtures value
- ❌ 1520 Office machines, IT, communication systems
- ❌ 1529 Adjustment of office machines, IT, and comm. systems value
- ❌ 1530 Vehicles
- ❌ 1539 Adjustment of vehicles value
- ❌ 1540 Tools and devices
- ❌ 1549 Adjustment of tools and devices value

#### **160 - Real estate** ❌
- 1600 Operating buildings
- 1609 Adjustment of operating buildings value

#### **170 - Intangible fixed assets** ❌
- 1700 Patents, know-how, licenses, rights, development
- 1709 Adjustment of patents, know-how, licenses, rights, development value
- 1770 Goodwill
- 1779 Adjustment of goodwill value

#### **180 - Unpaid capital** ❌
- 1850 Unpaid share capital

---

### Liabilities (Class 2) - Missing Accounts

#### **200 - Short-term trade payables** - Partially Implemented ⚠️
- ✅ 2000 Trade payables (creditors) (PRESENT)
- ❌ 2030 Customer prepayments (MISSING)
- ❌ 2050 Trade payables to group companies (MISSING)

#### **210 - Interest-bearing short-term liabilities** - Partially Implemented ⚠️
- ✅ 210 Group present
- ❌ 2100 Bank loans (MISSING)
- ❌ 2120 Leasing obligations (MISSING)
- ❌ 2140 Other interest-bearing short-term liabilities (MISSING)
- ✅ 2160 Autres dettes à court terme non rémunérées (PRESENT - but standard calls this non-interest bearing)
- ✅ 2160.001 Anton Kutschera (CUSTOM sub-account)

**Anomaly:** Account 2160 is placed under "210 Interest-bearing" but is named "non-remunerated" (non-interest bearing). This is a classification inconsistency.

#### **220 - Other short-term liabilities** - Minimally Implemented ⚠️
- ✅ 220 Autres dettes à court terme / Other short-term liabilities (PRESENT as group)
- ❌ 2200 TVA due / VAT payable (not needed until VAT-registered)
- ❌ 2201 Décompte TVA / VAT settlement (not needed until VAT-registered)
- ❌ 2206 Impôt anticipé dû / Withholding tax payable (MISSING)
- ❌ 2208 Impôts directs / Direct taxes (MISSING)
- ❌ 2210 Autres dettes à court terme / Other short-term liabilities (MISSING)
- ❌ 2261 Dividendes / Dividends (MISSING)
- ❌ 2270 Assurances sociales et institutions de prévoyance / Social insurances and provident institutions (MISSING)
- ❌ 2279 Impôt à la source / Source tax (MISSING)

#### **230 - Accrued liabilities and short-term provisions** ❌
- 2300 Accrued expenses
- 2301 Deferred income
- 2330 Short-term provisions

#### **24 - Long-term liabilities** ❌
- 2400 Bank loans
- 2420 Leasing obligations
- 2430 Bond loans
- 2450 Loans
- 2451 Mortgages

#### **250 - Other long-term liabilities** ❌
- 2500 Other long-term liabilities

#### **260 - Long-term provisions** ❌
- 2600 Provisions

#### **28 - Equity** - Partially Implemented ⚠️
- ✅ 2800 Capital-actions, capital social (PRESENT)
- ❌ 2900 Legal reserves from capital (MISSING)
- ❌ 2930 Reserves from own equity participation (MISSING)
- ❌ 2940 Valuation reserves (MISSING)
- ❌ 2950 Legal reserves from profit (MISSING)
- ❌ 2960 Free reserves (MISSING)
- ✅ 2970 Carried forward profit/loss (PRESENT)
- ✅ 2979 Profit/loss for the year (PRESENT)
- ❌ 2980 Own shares (negative item) (MISSING)

**Note:** Sole proprietorship equity accounts (2800, 2820, 2850, 2891) are not implemented - appropriate for a corporation (personnes morales).

---

### Revenue (Class 3) - Partially Implemented ⚠️

#### **Present Accounts:**
- ✅ 3000 Sales of manufactured products
- ✅ 3200 Sales of goods
- ✅ 3400 Sales of services
- ✅ 3600 Other sales and services

#### **Missing Accounts:**
- ❌ 3700 Own services
- ❌ 3710 Own consumption
- ❌ 3800 Sales deductions
- ❌ 3805 Losses on receivables, change in allowance for doubtful accounts
- ❌ 3900 Change in semi-finished goods inventories
- ❌ 3901 Change in finished goods inventories
- ❌ 3940 Change in value of unbilled services

---

### Expenses (Class 4) - Minimally Implemented ⚠️

#### **Present Accounts:**
- ✅ 4000 Material purchases (Achats de matières premières)
- ✅ 4200 Goods purchases (Achats de marchandises)

#### **Missing Accounts:**
- ❌ 4400 Third-party services/works
- ❌ 4500 Operational energy expenses
- ❌ 4900 Deductions on expenses

---

### Personnel Expenses (Class 5) - Not Implemented ❌

**All accounts missing:**
- ❌ 5000 Salaries
- ❌ 5700 Social charges
- ❌ 5800 Other personnel expenses
- ❌ 5900 Temporary personnel expenses

**Note:** Only the group header "5 Charges de Personnel" exists without any detail accounts.

---

### Other Operating Expenses (Class 6) - Partially Implemented ⚠️

#### **Present Accounts:**
- ✅ 6300 Insurance expense
- ✅ 6400 Energy and disposal expenses
- ✅ 6500 Administrative expenses
- ✅ 6570 IT charges and leasing (with custom sub-accounts)
  - ✅ 6570.001 Domain Names
  - ✅ 6570.002 Exafunction Inc Codeium
  - ✅ 6570.003 Microsoft
  - ✅ 6570.004 Anthropic
  - ✅ 6570.005 Google Cloud Platform
  - ✅ 6570.006 OpenAI
  - ✅ 6570.007 server4you.net
  - ✅ 6570.008 Hugging Faces
- ✅ 6700 Other operating expenses
- ✅ 6710 Representation and business meals (CUSTOM - not in standard)
- ✅ 6720 Marketing expenses (CUSTOM - not in standard)
- ✅ 6800 Depreciation
- ✅ 6900 Financial expenses

#### **Missing Accounts:**
- ❌ 6000 Premises expenses
- ❌ 6100 Maintenance, repairs, and replacement
- ❌ 6105 Leasing of tangible fixed assets
- ❌ 6200 Vehicle and transport expenses
- ❌ 6260 Leasing and rental of vehicles
- ❌ 6600 Advertising and marketing (standard number)
- ❌ 6950 Financial income

**Anomaly:** Standard plan uses 6600 for "Advertising and marketing", but you use 6720 for "Marketing expenses".

---

### Ancillary Activities (Class 7) - Not Implemented ❌

**All accounts missing:**
- ❌ 7000 Incidental income
- ❌ 7010 Incidental expenses
- ❌ 7500 Income from operational buildings
- ❌ 7510 Expenses for operational buildings

---

### Extraordinary Results (Class 8) - Minimally Implemented ⚠️

#### **Present Accounts:**
- ✅ 8900 Direct taxes (legal entities)

#### **Missing Accounts:**
- ❌ 8000 Non-operational expenses
- ❌ 8100 Non-operational income
- ❌ 8500 Extraordinary, exceptional, or out-of-period expenses
- ❌ 8510 Extraordinary, exceptional, or out-of-period income

---

### Closing (Class 9) - Not Implemented ❌

**All accounts missing:**
- ❌ 9200 Profit/loss for the year

**Note:** Profit/loss is tracked in equity account 2979 instead.

---

## Key Anomalies and Inconsistencies

### 1. **Account 2160 Classification - Employee Expense Reimbursements** 🟢
- **Location:** Under `210 Dettes à court terme portant intérêt / Current interest-bearing liabilities`
- **Name:** `2160 Autres dettes à court terme non rémunérées / Other non-remunerated short-term liabilities`
- **Purpose:** Tracks amounts owed to employees (e.g., Anton Kutschera) for business expenses paid from personal funds
- **Interest Requirement:** **NO** - In Switzerland, companies are **not required** to pay interest on employee expense reimbursements unless:
  - The amount is explicitly structured as a loan with interest terms
  - There's a written agreement specifying interest
  - The reimbursement is unreasonably delayed (months/years)
- **Standard Practice:** Employee expense reimbursements are typically interest-free short-term liabilities that should be settled within a reasonable timeframe (30-60 days)
- **Classification Note:** The name "non rémunérées" (non-remunerated/non-interest bearing) is accurate for this use case. The placement under 210 is acceptable as a pragmatic choice, though 220 (Other short-term liabilities) would be technically more precise
- **Recommendation:** Current usage is acceptable. If you prefer strict adherence to naming conventions, consider moving to account 220 group

### 2. **Accrual Accounting - When Is It Required?** ℹ️

**What are accrual accounts?**
Accrual accounts help match revenues and expenses to the correct accounting period, even if cash hasn't changed hands yet.

**Key accrual accounts:**
- **1300 Prepaid expenses** - Money paid in advance for future services (e.g., annual insurance paid in January for the whole year)
- **1301 Accrued income** - Revenue earned but not yet invoiced/received (e.g., work completed in December, invoiced in January)
- **2300 Accrued expenses** - Expenses incurred but not yet paid/invoiced (e.g., December electricity bill received in January)
- **2301 Deferred income** - Money received in advance for future services (e.g., annual subscription paid upfront)

**Are they MANDATORY for a Swiss Sàrl?**

**Short answer:** It depends on your company size and whether you use cash-basis or accrual accounting.

**Detailed answer:**
1. **Small companies (under CHF 500,000 revenue):** Can use simplified cash-basis accounting where accruals are optional
2. **Medium/Large companies:** Must use accrual accounting (principe de rattachement des charges et produits)
3. **For tax purposes in Vaud:** The tax authorities generally accept cash-basis for very small businesses, but accrual accounting provides a more accurate financial picture

**Practical recommendation for your situation:**
- **If your revenue < CHF 100,000/year:** You can skip accruals to keep things simple. Just ensure you're consistent year-to-year
- **If you want accurate monthly/quarterly reports:** Use accruals for significant items (e.g., annual insurance, quarterly rent)
- **Minimum compliance:** At year-end, you should accrue any significant expenses/revenues that cross year boundaries to get accurate annual profit/loss

**Example when accruals matter:**
- You pay CHF 1,200 for annual insurance in January 2025
- Without accruals: All CHF 1,200 hits January expenses (distorts monthly reports)
- With accruals: CHF 100/month expense, with CHF 1,100 sitting in "Prepaid expenses" (1300) and decreasing monthly

**Bottom line:** For a small Sàrl with minimal transactions, you can operate without detailed accrual accounts, but you should at least handle year-end accruals for material items to ensure accurate annual financial statements.

---

### 3. **Inventory Account Numbering** 🟡
- **Your Implementation:** Uses 1200, 1210, 1220, 1230 for different inventory types
- **Standard Plan:** Uses different numbers for similar concepts
  - Standard 1200 = Commercial goods
  - Standard 1210 = Raw materials
  - Standard 1260 = Finished goods inventories
  - Standard 1280 = Work in progress
- **Impact:** Your numbering is logical but doesn't match standard Swiss SME plan

### 4. **Account Numbers on Balance Sheet for Tax Filing in Canton Vaud** ℹ️

**Question:** Does a Swiss Sàrl in Canton Vaud need to show account numbers on its balance sheet when filing taxes?

**Answer:** **NO** - Account numbers are **not required** on official financial statements for tax purposes.

**What you need to submit:**
1. **Balance sheet (Bilan)** - With account names/descriptions, not necessarily numbers
2. **Income statement (Compte de résultat)** - With revenue and expense categories
3. **Notes/Annexe** - If applicable for your company size

**Account numbers are:**
- **Internal tools** for your bookkeeping and accounting software
- **Optional** on submitted documents
- **Helpful** for your accountant/fiduciaire to understand your structure

**Standard practice:**
- Small companies: Submit simplified statements with category names only (e.g., "Cash and bank", "Accounts payable")
- Larger companies: May include more detail but still don't need to show account numbers

**For Canton Vaud tax filing:**
- Use the official tax forms provided by the canton
- These forms have predefined line items/categories
- You map your accounts to their categories
- Account numbers stay in your internal books

**Conclusion:** Keep your account numbers for internal organization, but you don't need to display them on tax filings.

---

### 5. **Legal Reserves for Swiss Sàrl** ℹ️

**What legal reserves must a Swiss Sàrl maintain?**

According to Swiss Code of Obligations (CO Art. 671-671a), a Sàrl must build **legal reserves from profit**:

**Mandatory allocation:**
1. **5% of annual profit** must be allocated to legal reserves
2. **Until reserves reach 20% of share capital**
3. **Then allocation stops** (unless reserves fall below 20% again)

**For your company (CHF 20,000 capital):**
- **Target reserve:** CHF 4,000 (20% of CHF 20,000)
- **Annual allocation:** 5% of profit until target reached
- **Example:** If profit = CHF 10,000, allocate CHF 500 to reserves

**Account structure:**
- **2950 Legal reserves from profit (Réserves légales issues du bénéfice)** - This is where the 5% goes
- **2900 Legal reserves from capital (Réserves légales issues du capital)** - For capital contributions above nominal value (agio)

**Other reserves (optional):**
- **2960 Free reserves (Réserves libres)** - Voluntary reserves, decided by shareholders
- **2940 Valuation reserves (Réserves de réévaluation)** - For asset revaluations

**Practical example for year-end:**
```
Annual profit: CHF 10,000
Legal reserve requirement: CHF 500 (5%)
Remaining profit: CHF 9,500 (can be distributed or kept as free reserves)

Journal entry:
2979 Annual profit/loss          CHF -500
2950 Legal reserves from profit  CHF +500
```

**Important:** You should add account **2950** to your chart of accounts to comply with Swiss law.

---

### 6. **Marketing Expense Account Number - CORRECTED** ✅
- **Standard Plan:** 6600 Advertising and marketing (Publicité et marketing)
- **Your Previous Implementation:** 6710 Representation, 6720 Marketing (non-standard)
- **Correction Applied:** Accounts renamed to use standard 6600 series
- **New structure:**
  - **6600** Advertising and marketing (main account)
  - Can use sub-accounts like 6600.001, 6600.002 if needed for detail

### 7. **Type Classification for Equity** ✅
- **Your Implementation:** Correctly uses `type:Equity` for accounts 28 and 290
- **Standard Plan:** Lists equity under "Liabilities" section
- **Assessment:** Your approach is technically more correct from an accounting theory perspective (Assets = Liabilities + Equity)

### 8. **Account 6700 - Other Operating Expenses** ℹ️

**What goes in account 6700?**

Account 6700 "Autres charges d'exploitation / Other operating expenses" is a **catch-all account** for operating expenses that don't fit into the more specific 6000-6900 categories.

**Examples of expenses that belong in 6700:**
- **Office supplies:** Pens, paper, notebooks, staplers, folders
- **Postage and shipping:** Stamps, courier services, package delivery (non-product shipping)
- **Small tools and supplies:** Items under the capitalization threshold
- **Bank fees for non-financing activities:** Payment processing fees, transaction fees (not interest)
- **Professional memberships:** Industry association dues, chamber of commerce fees
- **Subscriptions:** Trade publications, business magazines (non-IT)
- **Minor repairs and maintenance:** Small fixes not categorized elsewhere
- **Telephone and communications:** Mobile phone bills, landline (if not in 6570 IT)
- **Licenses and permits:** Business licenses, professional certifications
- **Miscellaneous operating costs:** Anything operational that doesn't fit 6000-6600

**What does NOT go in 6700:**
- ❌ **IT expenses** → Use 6570
- ❌ **Insurance** → Use 6300
- ❌ **Energy/waste** → Use 6400
- ❌ **Administrative/professional fees** → Use 6500
- ❌ **Marketing/advertising** → Use 6600
- ❌ **Depreciation** → Use 6800
- ❌ **Bank interest/financing charges** → Use 6900

**Your current usage:**
Looking at your transactions, you've used 6700 for postage (sending founding documents), which is correct.

---

### 9. **Account 3700 and 3710 - Own Services and Own Consumption** ℹ️

**3700 Own services (Prestations propres):**
This account is used when the company provides services to itself or uses its own resources for internal projects.

**Examples:**
- **Internal construction:** Company employees build an office extension instead of hiring contractors
- **Self-developed software:** Developers create software for internal use (capitalized as intangible asset)
- **Internal consulting:** Using company staff for internal projects that would normally be outsourced
- **Manufacturing for own use:** Factory produces equipment for its own production line

**Accounting treatment:**
- **Debit:** Asset account (1700 Intangible assets, 1500 Tangible assets, etc.)
- **Credit:** 3700 Own services (increases revenue/reduces expenses)

**3710 Own consumption (Consommation propre):**
This account tracks when the company consumes its own products or inventory for business purposes.

**Examples:**
- **Product samples:** Taking finished goods from inventory for marketing/demonstration
- **Employee benefits:** Giving company products to employees (may have tax implications)
- **Internal use:** Using manufactured goods for office/business operations
- **Gifts to clients:** Taking inventory items to give as business gifts

**Accounting treatment:**
- **Debit:** Expense account (6700, 6600 for marketing samples, etc.)
- **Credit:** 3710 Own consumption (offsets inventory decrease)

**Why these accounts exist:**
They ensure proper matching of costs and revenues, and prevent double-counting when the company uses its own resources.

**Do you need them?**
Only if you:
- Manufacture products and use them internally
- Develop software/assets using internal staff
- Take inventory for non-sale purposes

For a pure service/consulting business, these accounts are rarely needed.

---

### 10. **Class 7 - Ancillary Activities (Income from Secondary Operations)** ℹ️

**7000 Incidental income (Produits accessoires):**
Revenue from minor activities outside your main business operations.

**Examples:**
- **Subletting office space:** Renting part of your office to another company
- **Equipment rental:** Renting out company equipment when not in use
- **Scrap sales:** Selling waste materials, packaging, or scrap
- **Vending machines:** Income from vending machines in your office
- **Parking fees:** Charging employees or visitors for parking
- **Commission income:** Referral fees from recommending other services
- **Late payment fees:** Interest charged to customers for late payments

**7010 Incidental expenses (Charges accessoires):**
Costs related to the incidental income activities above.

**Examples:**
- **Costs of subletting:** Utilities, maintenance for sublet space
- **Equipment rental costs:** Maintenance, insurance for rented equipment
- **Disposal costs:** Costs to prepare scrap for sale
- **Vending machine restocking:** Cost of goods sold for vending

**7500 Income from operational buildings:**
Rental income from company-owned real estate used for operations.

**7510 Expenses for operational buildings:**
Costs related to maintaining those buildings (repairs, property tax, insurance).

**When to use Class 7:**
Only when you have **secondary revenue streams** that are not your core business. For a consulting/IT company, Class 7 is typically not needed unless you have rental income or other side activities.

---

### 11. **Class 8 - Extraordinary and Non-Operational Results** ℹ️

**8000 Non-operational expenses (Charges hors exploitation):**
Expenses that are not related to normal business operations.

**Examples:**
- **Loss on sale of fixed assets:** Selling company car for less than book value
- **Donations to charities:** Corporate charitable contributions (non-deductible in Switzerland)
- **Fines and penalties:** Legal fines, late payment penalties to authorities
- **Write-offs:** Writing off uncollectible receivables (if not in 3805)
- **Restructuring costs:** One-time costs for major business reorganization
- **Legal settlements:** Costs from lawsuits unrelated to operations

**8100 Non-operational income (Produits hors exploitation):**
Income not related to normal business operations.

**Examples:**
- **Gain on sale of fixed assets:** Selling equipment for more than book value
- **Insurance claims received:** Compensation for damages
- **Grants and subsidies:** Government grants (non-operational)
- **Forgiveness of debt:** Creditor forgives a debt
- **Refunds from prior years:** Tax refunds, overpayment refunds

**8500 Extraordinary, exceptional, or out-of-period expenses:**
Unusual, non-recurring expenses or corrections from prior periods.

**Examples:**
- **Natural disaster costs:** Flood damage, earthquake repairs
- **Major theft or fraud losses:** Significant embezzlement discovered
- **Prior period corrections:** Correcting errors from previous years
- **Exceptional legal costs:** Major one-time litigation
- **Asset impairment:** Significant write-down of asset values

**8510 Extraordinary, exceptional, or out-of-period income:**
Unusual, non-recurring income or corrections from prior periods.

**Examples:**
- **Insurance payout for disaster:** Major insurance claim
- **Windfall gains:** Unexpected inheritance, lottery win
- **Prior period corrections:** Discovering unreported revenue from past years
- **Sale of business unit:** Gain from selling part of the company
- **Debt forgiveness:** Major creditor forgives significant debt

**8900 Direct taxes (legal entities):**
Corporate income tax and capital tax.

**When to use Class 8:**
- **8900:** Always use for corporate taxes
- **8000/8100:** Use for truly non-operational items
- **8500/8510:** Use sparingly, only for exceptional one-time events

**Important distinction:**
- **Operating vs. Non-operating:** Operating = related to core business; Non-operating = unrelated to core business
- **Ordinary vs. Extraordinary:** Ordinary = recurring/expected; Extraordinary = one-time/unexpected

---

### 12. **VAT Accounts - Not Yet Required** 🟢
- **Current status:** Company revenue < CHF 100,000, below mandatory VAT registration threshold (CHF 100,000)
- **Not currently needed:** VAT input (1170, 1171) or output (2200, 2201) accounts
- **Future planning:** When revenue exceeds CHF 100,000, add these accounts:
  - 1170 Input tax: VAT on materials, goods, services, and energy
  - 1171 Input tax: VAT on investments and other operating expenses
  - 2200 VAT payable
  - 2201 VAT settlement
- **Voluntary registration:** Can register voluntarily if beneficial (e.g., significant input VAT to reclaim)

### 13. **Missing Accrual Accounts** 🟡
- **Missing:** 130 (Active accruals), 230 (Passive accruals)
- **Impact:** Cannot properly implement accrual accounting (see Section 2 above for when this matters)
- **Accounts needed:** 1300 Prepaid expenses, 1301 Accrued income, 2300 Accrued expenses, 2301 Deferred income

---

## Recommendations

### Priority 1 - Critical for Compliance 🔴

1. **Add legal reserve account (MANDATORY for Swiss Sàrl):**
   - 2950 Legal reserves from profit (Réserves légales issues du bénéfice)
   - Must allocate 5% of annual profit until reserves reach 20% of share capital

2. **VAT accounts** (when revenue exceeds CHF 100,000 or if voluntarily registered):
   - 1170 Input tax: VAT on materials, goods, services, and energy
   - 1171 Input tax: VAT on investments and other operating expenses
   - 2200 VAT payable
   - 2201 VAT settlement

3. **Add tax-related accounts:**
   - 2208 Direct taxes (current liability)
   - 2206 Withholding tax payable

### Priority 2 - Important for Proper Accounting 🟡

4. **Add accrual accounts:**
   - 1300 Prepaid expenses
   - 1301 Accrued income
   - 2300 Accrued expenses
   - 2301 Deferred income

5. **Add allowance for doubtful accounts:**
   - 1109 Allowance for doubtful accounts

6. **Add social insurance accounts** (if you have employees):
   - 1180 Receivables from social insurances
   - 2270 Social insurances and provident institutions

### Priority 3 - Nice to Have 🟢

7. **Add remaining Class 6 expense accounts** as needed:
   - 6000 Premises expenses
   - 6100 Maintenance and repairs
   - 6200 Vehicle and transport expenses

8. **Consider adding Class 7** if you have ancillary activities:
   - 7000 Incidental income
   - 7010 Incidental expenses

9. **Add remaining equity reserve accounts** for proper equity structure:
   - 2900 Legal reserves from capital
   - 2950 Legal reserves from profit
   - 2960 Free reserves

---

## Summary Statistics

| Category | Standard Plan | Your Implementation | Coverage |
|----------|--------------|---------------------|----------|
| **Total Accounts** | ~150 | 32 | 21% |
| **Class 1 (Assets)** | ~60 | 11 | 18% |
| **Class 2 (Liabilities/Equity)** | ~40 | 8 | 20% |
| **Class 3 (Revenue)** | ~12 | 4 | 33% |
| **Class 4 (Material Costs)** | ~5 | 2 | 40% |
| **Class 5 (Personnel)** | ~4 | 0 | 0% |
| **Class 6 (Other Expenses)** | ~20 | 11 | 55% |
| **Class 7 (Ancillary)** | ~4 | 0 | 0% |
| **Class 8 (Extraordinary)** | ~5 | 1 | 20% |
| **Class 9 (Closing)** | ~1 | 0 | 0% |

---

## Conclusion

Your accounting plan follows a **pragmatic, minimal approach** that implements only the accounts actively used by your business. This is an appropriate strategy for a small business below the VAT threshold.

The bilingual naming convention and hierarchical structure make the accounts very readable, though they deviate from the standard numeric-only approach. The use of custom sub-accounts (e.g., 6570.001 through 6570.008) provides excellent detail for IT expense tracking.

**Overall Assessment:** Well-structured for current business size. Priority is adding the mandatory legal reserve account (2950). VAT accounts can be added when revenue exceeds CHF 100,000.
