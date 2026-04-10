# Verification Against Official Canton de Vaud Documentation

**Source:** https://www.vd.ch/index.php?id=2023786  
**Date:** April 8, 2026

## Summary

I have reviewed the Swiss Tax Declaration report implementation against the official Canton de Vaud help documentation for e-DIPM (electronic tax declaration for legal entities) 2025. The implementation is **correct** with important clarifications added.

## Verification Results

### ✅ Structure - CORRECT

All three main sections match the official form:
- **Section A:** Indications générales (General Information) - 11 lines
- **Section B:** Bénéfice net (Net Profit) - 9 lines  
- **Section C:** Capital et réserves (Capital and Reserves) - 14+ lines

### ✅ Account Mappings - CORRECTED

After initial errors were identified and corrected, all account regex patterns now match the actual KMU-Kontenplan structure:

| Line | Description | Account Pattern | Status |
|------|-------------|----------------|--------|
| A.1 | Receivables from sales | `^1:10:110` | ✅ Correct |
| A.2 | Related party receivables | `^1:10:13` | ✅ Correct |
| A.3 | Inventory | `^1:10:120` | ✅ Correct |
| A.4 | Participations | `^1:14:14` | ✅ Correct |
| A.5 | Fixed assets | `^1:14:15` | ✅ Correct |
| A.6 | Total balance sheet | ASSET + CASH | ✅ Correct |
| A.7 | Accrued expenses | `^2:20:23` | ✅ Correct |
| A.8 | Related party liabilities | `^2:20:220:2210` | ✅ Correct |
| A.9 | Provisions | `^2:20:24` | ✅ Correct |
| A.10 | Revenue | REVENUE type | ✅ Correct |
| A.11 | Depreciation | `^6:6800` | ✅ Correct |

### ✅ Calculated Fields - CORRECT

- **B.1:** Uses `netIncome` calculated value ✅
- **C.9:** Uses EQUITY accounts with `includeNetIncome: true` ✅

### ✅ Manual Entry Fields - CORRECTLY IDENTIFIED

The following fields are correctly marked as requiring manual input:
- B.2 (Tax adjustments)
- B.3 (Hidden profit distributions)
- B.5 (Prior year losses)
- B.9 (Participation reduction %)
- C.0 (Dividend)
- C.8 (Hidden reserves taxed as profit)
- C.10 (Hidden equity)
- C.11 (Capital reduction per art. 118 LI)
- C.12-C.14 (Calculated from above)

## Important Clarifications Added

Based on the official documentation, the following clarifications were added to the design document:

### 1. Participation Definition (A.4)
A participation is qualified when **ANY** of these conditions is met:
- Company owns ≥10% of capital of another company, OR
- Company participates ≥10% in reserves of another company, OR
- Market value of participation rights > CHF 1 million

### 2. Participation Reduction Requirements (B.9)
Detailed inventory required with:
- Number of shares held
- Company name
- Purchase/sale dates
- Percentages acquired/sold
- Book value, cost, market value
- Gross yield, depreciation, admin costs, financing costs
- Net yield

### 3. B.1 - Net Profit Clarification
Must correspond to the result from financial statements **approved by the General Assembly (AG)**.

### 4. B.2 - Tax Adjustments Clarification
Specifically includes:
- Depreciation exceeding tax norms
- Value adjustments exceeding tax norms
- Provisions exceeding tax norms
- Creation of additional hidden reserves

### 5. Foreign Currency Support
Companies keeping accounts in foreign currency (functional currency per art. 958d al.3 CO) must indicate exchange rates:
- **For taxable profit:** average rate OR closing rate
- **For taxable capital:** closing rate ONLY

### 6. Mandatory Attachments
The following documents are **mandatory** for filing:
- Balance sheet (Bilan)
- Profit & loss statement (Compte de pertes et profits)
- Annexes

### 7. Société Simple (Partnership)
If the company is a member of a société simple (partnership per art. 530+ CO):
- Partnership contract must be attached
- Partnership financial statements must be attached
- Company's share of capital and results must be declared

## Apportionment (Répartition)

The documentation describes three methods for companies operating in multiple communes/cantons:

### 1. By Revenue (Chiffre d'affaires)
- Used for sales/distribution companies
- 20% préciput to head office before apportionment
- Apportioned by revenue of each establishment

### 2. By Production Factors (Facteurs de production)
- Used for manufacturing companies
- Préciput only if specific circumstances justify it
- Production factors = Assets + (Salaries × 10%) + (Rent × 6%)

### 3. Direct Apportionment (Répartition directe)
- Used when indirect methods don't reflect economic reality
- Based on actual results from analytical accounting

**Note:** International apportionment requires direct method only.

## Compliance Status

### ✅ COMPLIANT
The implementation correctly:
1. Structures all three sections (A, B, C) according to official form
2. Maps accounts to the correct KMU-Kontenplan patterns
3. Identifies calculated vs. manual entry fields
4. Uses appropriate account types and regex patterns
5. Applies sign inversion for equity, liability, and revenue accounts

### ⚠️ LIMITATIONS (By Design)
The following are **not automated** (as expected):
1. Tax adjustments (B.2) - requires tax expertise
2. Hidden profit distributions (B.3) - requires analysis
3. Prior year losses (B.5) - historical data not in current system
4. Participation reduction calculation (B.9) - complex tax calculation
5. Dividend decisions (C.0) - requires AG decision
6. Hidden reserves and equity (C.8, C.10) - requires tax analysis
7. Capital reduction (C.11) - legal/tax decision
8. Apportionment calculations (B.7, B.8, C.13, C.14) - requires multi-canton logic

These limitations are **appropriate** as these values require:
- Tax expertise
- Legal decisions
- Historical data outside the accounting system
- Complex calculations with multiple variables

## Recommendations

### For Users
1. **Review the design document** before using the report
2. **Prepare manual entries** in advance (B.2, B.3, B.5, B.9, C.0, C.8, C.10, C.11)
3. **Gather required attachments** (balance sheet, P&L, annexes)
4. **Check participation qualification** if applicable (A.4 criteria)
5. **Consider foreign currency** implications if applicable

### For Future Enhancements
1. Add **notes/comment fields** for manual entries
2. Create **participation inventory template** for B.9
3. Add **prior year loss tracking** for B.5
4. Implement **apportionment calculator** for multi-canton companies
5. Add **foreign currency exchange rate** fields

## Conclusion

The Swiss Tax Declaration report implementation is **correct and compliant** with the official Canton de Vaud requirements. The account mappings have been verified and corrected to match the actual chart of accounts structure. Important clarifications from the official documentation have been incorporated into the design document.

The report provides a solid foundation for generating tax declaration values, with appropriate identification of fields requiring manual input or tax expertise.
