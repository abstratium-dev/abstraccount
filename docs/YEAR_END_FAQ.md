# Year-End Closing FAQ

**Last Updated:** January 16, 2026

---

## Q1: When should I print my income statement?

**Answer:** Print it **AFTER** tax provisions and legal reserves (Phase 2.4 and 2.5), but **BEFORE** closing entries (Phase 3).

**Reason:** After closing entries, all revenue and expense accounts are zero, so your income statement will be blank!

**Correct sequence:**
1. ✅ Record tax provision (Phase 2.4)
2. ✅ Record legal reserve allocation (Phase 2.5)
3. ✅ **PRINT INCOME STATEMENT** (Phase 2.6)
4. ❌ Close accounts (Phase 3)

---

## Q2: Should the income statement include the tax provision as an expense?

**Answer:** YES, absolutely.

According to Swiss accounting standards (Swiss SME Chart of Accounts), the income statement structure is:

```
Revenues                              CHF 100,000
- Operating Expenses                  CHF  60,000
= Résultat avant impôts               CHF  40,000  ← Profit BEFORE taxes
- Impôts directs (account 8900)       CHF   8,000  ← Tax provision
= Résultat de l'exercice              CHF  32,000  ← Net profit AFTER taxes
```

**Key points:**
- Tax is a legitimate expense
- It reduces your profit
- The final line shows net profit AFTER taxes
- This is the correct Swiss accounting presentation

**Source:** Swiss SME Chart of Accounts (KMU-Kontenplan), Swiss Code of Obligations Art. 959

---

## Q3: Which profit value do I report in my tax declaration?

**Answer:** You report the **profit BEFORE the tax provision** (not the net profit after taxes).

**Why?** Swiss tax law has a circular calculation:
- Taxes are deductible expenses
- But you need profit to calculate taxes
- This creates a mathematical loop

**Example:**
- Profit before tax provision: CHF 40,000
- Tax provision recorded in accounts: CHF 8,000 (estimated)
- Net profit after tax: CHF 32,000

**For tax declaration:**
- You report approximately CHF 40,000 (before tax provision)
- The tax authorities calculate the actual tax
- Your accountant uses an iterative formula to reconcile this

**Important:** Your fiduciaire/accountant will handle this calculation. The exact taxable profit may differ from accounting profit due to:
- Tax adjustments
- Non-deductible expenses
- Tax-exempt income
- Loss carryforwards

**Source:** Swiss tax practice, FBK Conseils guide on Swiss SME taxation

---

## Q4: After allocating legal reserves, my balance sheet shows account 2950 (positive) and 2979 (reduced). They seem to cancel out. Is this correct?

**Answer:** YES, this is CORRECT and NORMAL.

**What's happening:**

**Before legal reserve allocation:**
```
Equity:
2800 Share Capital          CHF 20,000
2950 Legal Reserves         CHF  1,500
2979 Annual Profit          CHF 10,000
Total Equity:               CHF 31,500
```

**After legal reserve allocation (5% of CHF 10,000 = CHF 500):**
```
Equity:
2800 Share Capital          CHF 20,000
2950 Legal Reserves         CHF  2,000  ← Increased by CHF 500
2979 Annual Profit          CHF  9,500  ← Decreased by CHF 500
Total Equity:               CHF 31,500  ← UNCHANGED
```

**Why it looks "strange":**
- Both accounts are POSITIVE equity accounts (credit balances)
- They don't "cancel out" - they're both adding to equity
- The allocation simply MOVES CHF 500 from 2979 to 2950
- Total equity remains the same
- In hledger, credit balances show as negative numbers, which can be confusing

**This is legally required:**
- Swiss Code of Obligations Art. 671-672
- 5% of annual profit → legal reserves
- Until reserves reach 20% of share capital (CHF 4,000 for your company)
- Both accounts must be visible on the balance sheet
- Shows how profit is retained vs. available for distribution

**Source:** Swiss Code of Obligations Art. 671-672, Reichlin Hess legal guide

---

## Q5: Summary - What's the correct year-end sequence?

1. **Phase 2.4:** Record tax provision (account 8900)
2. **Phase 2.5:** Allocate legal reserves (5% of profit to account 2950)
3. **Phase 2.6:** 📊 **PRINT FINANCIAL STATEMENTS**
   - Income statement: `hledger is -f 2025.journal -e 2026-01-01`
   - Balance sheet: `hledger bs -f 2025.journal -e 2026-01-01`
   - Save these for tax filing
4. **Phase 3:** Close all revenue and expense accounts to 2979
5. **Phase 4:** Transfer 2979 to 2970 (January 1 of next year)

---

## References

1. **Swiss Code of Obligations (CO):** Articles 671-672 (Legal Reserves), Art. 959 (Financial Statements)
2. **Swiss SME Chart of Accounts:** KMU-Kontenplan-Französisch.pdf
3. **FBK Conseils:** "SME Taxation in Switzerland" - https://fbk-conseils.ch/
4. **Reichlin Hess:** "Allocation of Reserves Under New Stock Corporation Law"
5. **KPMG Switzerland:** "Swiss Law on Accounting and Financial Reporting"

---

## Need Help?

For complex situations or specific tax questions, consult:
- Your fiduciaire (trust company)
- Canton Vaud tax administration: https://www.vd.ch/themes/etat-droit-finances/impots/
- A certified Swiss accountant (expert-comptable)
