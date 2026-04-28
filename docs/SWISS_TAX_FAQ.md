# Swiss Tax FAQ

## Why is my Sàrl taxed on 2,000 CHF capital instead of the lower net equity figure?

### Context

Canton de Vaud, Switzerland — Sàrl with paid-in share capital of 2,000 CHF and a small net loss,
resulting in net equity below the paid-in capital amount.

### The Rule

Under Swiss cantonal capital tax law, the taxable capital (line **C.12** of the tax declaration) is
defined as:

```
C.12 = MAX(C.9 net equity, C.1 paid-in share capital)
```

The key phrase on line C.12 of the declaration is:

> **Capital total imposable (au minimum le capital libéré)**
> *Total taxable capital (at a minimum, the paid-in share capital)*

This means the paid-in share capital acts as a **statutory floor**. Even if net equity has been
reduced by losses, the taxable capital cannot fall below the amount of capital originally paid in.

### Example

| Figure | Amount | Role |
|--------|--------|------|
| Total Assets | 1,990.15 CHF | Not used for capital tax |
| Net Equity (C.9) | 1,986.30 CHF | Actual equity (below share capital due to loss) |
| Paid-in Capital (C.1) | 2,000 CHF | **Statutory floor** |
| **Taxable Capital (C.12)** | **2,000 CHF** | Correct — floor applies |

Total assets are **not** relevant to capital tax; only equity figures are used.

### Legal Basis

Art. 29 LI (Loi sur les impôts directs cantonaux, Canton de Vaud) / Art. 29a LI — the taxable
capital of a legal entity may not be lower than the paid-in share capital.

### Conclusion

There is **no error** in a declaration showing 2,000 CHF as taxable capital when net equity is
below 2,000 CHF. This is correct and mandatory behaviour under Swiss law.

---

## Would a profit increase the capital tax base?

Yes — if net equity **exceeds** paid-in capital due to retained profits, then C.9 > C.1 and the
MAX rule means C.12 = C.9. Retained profits therefore increase taxable capital.

Note that the **current year's profit** flows into equity (Net Income on the balance sheet) and is
carried forward to C.7 in the following year's declaration.

### Examples

| Scenario | C.1 (paid-in) | C.9 (net equity) | C.12 (taxable) |
|----------|--------------|-----------------|---------------|
| Loss of 13.70 (floor applies) | 2,000 | 1,986.30 | **2,000** |
| Break-even | 2,000 | 2,000 | **2,000** |
| Profit of 50 | 2,000 | 2,050 | **2,050** |
| Profit of 1,000 | 2,000 | 3,000 | **3,000** |

The statutory floor only benefits you when losses reduce equity below paid-in capital. In profitable
years, retained earnings push taxable capital above the paid-in amount.
