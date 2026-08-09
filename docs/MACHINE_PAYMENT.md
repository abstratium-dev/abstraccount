# Machine-Posted Customer Payments

## Purpose

Machines (for example, an e-commerce back-end or a Stripe webhook handler) post customer-order transactions into Abstraccount by executing macros through a dedicated machine endpoint. Money does **not** land directly in the company bank account: it first settles in a Stripe e-money balance, and the payment provider reports the net amount after its fee.

This document describes:

1. The machine-only macro execution endpoint and security role.
2. The account choices.
3. The standard machine-runnable macros for two order flows:
   - The customer orders **and pays online** in one step.
   - The customer orders now and will be **invoiced later**.
4. The macro that sweeps the Stripe balance to the bank account.
5. The impact of the new `1021 Stripe` account on reports.

All customer-payment transactions are produced by macros. Operators can change which accounts are used, add metadata tags, or adjust the posting structure by editing the macros (or creating new ones) without touching the machine client code or the back-end endpoint.

## Machine Execution Endpoint

Automated clients authenticate through the existing OIDC flow and must carry the dedicated machine role.

### Role

Add the following constant to `Roles.java`:

```java
/** Role assigned to automated clients that post transactions on behalf of other systems. */
String MACHINE = CLIENT_ID + "_machine";   // abstratium-abstraccount_machine
```

### Endpoint

```
POST /api/macro/execute/machine
Content-Type: application/json
```

Request body (`MacroExecuteRequestDTO`):

```json
{
  "macroId": "<id of a machine-runnable macro>",
  "journalId": "<target journal id>",
  "parameters": {
    "date": "2026-01-15",
    "partner": "P00000999",
    "order_number": "ORD-2026-0015",
    ...
  }
}
```

The endpoint is protected by `@RolesAllowed({Roles.MACHINE})` and additionally verifies that the requested macro has `machineRunnable = true`. Macros that are not flagged as machine-runnable are rejected with HTTP 403, so the machine client cannot run arbitrary UI macros such as year-end closing or tax provision entries.

### Macro `machineRunnable` Flag

Every macro now has a boolean `machineRunnable` field that defaults to `false`. The flag is stored in the `T_macro` table (`machine_runnable BOOLEAN NOT NULL DEFAULT FALSE`), exposed on `MacroDTO`, and included in YAML import/export.

| Endpoint | Role required | `machineRunnable` required |
|----------|---------------|--------------------------|
| `POST /api/macro/execute` | `Roles.USER` | No |
| `POST /api/macro/execute/machine` | `Roles.MACHINE` | Yes |

## Account Selection Guide

| Role in the transaction | Recommended account | Code path | Why |
|--------------------------|----------------------|-----------|-----|
| **Revenue** (credit) | `3 Produits d'exploitation des ventes de biens et de prestations de services:3400 Produits bruts des ventes de prestations de services / Revenues from services` | `3:3400` | Services, consulting or custom development. |
| **Revenue** (credit) | `3 Produits d'exploitation des ventes de biens et de prestations de services:3600 Autres produits des ventes de biens et de prestations de services / Other operating income` | `3:3600` | SaaS subscriptions, licences or other recurring digital income. |
| **Stripe balance** (debit) | `1 Actifs / Assets:10 Actif circulants / Current Assets:100 Trésorerie / Cash and cash equivalents:1021 Stripe / Stripe Account` | `1:10:100:1021` | E-money balance held by the payment provider. Treat it as a cash equivalent: money the company owns but has not yet swept to the bank. Must be declared with `type:Cash`. |
| **Bank** (debit on sweep) | `1 Actifs / Assets:10 Actif circulants / Current Assets:100 Trésorerie / Cash and cash equivalents:1020 Avoirs en banque / Bank Account (asset)` | `1:10:100:1020` | Company bank account where Stripe payouts are deposited. |
| **Receivable** (debit) | `1 Actifs / Assets:10 Actif circulants / Current Assets:110 Créances résultant de la vente de biens et de prestationsde services / Accounts Receivable:1100 Créances résultant de la vente de biens et de prestations de services (Débiteurs) / Accounts receivable (Debtors)` | `1:10:110:1100` | Amount owed by the customer before payment. |
| **Stripe fee** (debit) | `6 Autres Charges d'Explotation, Amortissements et Corrections de Valeur et Resultats Financiers / Other Operating Expenses, Depreciations and Value Adjustments, Financial result:6900 Charges financières / Financial expense` | `6:6900` | Stripe/payment-provider fees. |

The exact revenue account depends on what was sold. If an order contains both services and SaaS, split the gross amount across `3400` and `3600`.

## Standard Machine Macros

The following macros are loaded by migration `V01.024__addMachineRunnableToMacros.sql` and are also available in `src/main/webui/public/builtin/macros-export.yaml`. All four are flagged `machineRunnable = true`.

### 1. `RecordOnlinePayment`

Use when the customer orders **and pays online** in one step and the payment provider confirms the payment. Revenue is recognised immediately, the Stripe balance increases by the net amount, and the provider fee is recorded as a financial expense.

Parameters:

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `date` | date | yes | `{today}` | Transaction date. |
| `partner` | partner | yes | - | Customer partner code. |
| `order_number` | text | yes | - | External order reference (stored as a tag). |
| `payment_provider` | text | yes | - | Provider reference, e.g. Stripe payment intent id (stored as a tag). |
| `gross_amount` | amount | yes | - | Total amount charged to the customer. |
| `net_amount` | amount | yes | - | Amount the provider reports as landed in the Stripe account. |
| `fee_amount` | amount | yes | - | Provider fee. Must equal `gross_amount - net_amount`. |
| `description` | text | yes | - | Human-readable description. |
| `stripe_account` | account | yes | - | Filter `^1.*:10.*:100.*:1021.*$`. |
| `revenue_account` | account | yes | - | Filter `^3.*:3400.*$|^3.*:3600.*$`. |
| `financial_expense_account` | account | yes | - | Filter `^6.*:6900.*$`. |

Validation: `{"balanceCheck":true,"minPostings":3}`

Example call:

```json
{
  "macroId": "macro-record-online-payment",
  "journalId": "<journal-id>",
  "parameters": {
    "date": "2026-01-15",
    "partner": "P00000999",
    "order_number": "ORD-2026-0015",
    "payment_provider": "pi_3ExampleStripe123",
    "gross_amount": "250.00",
    "net_amount": "242.50",
    "fee_amount": "7.50",
    "description": "SaaS subscription - order ORD-2026-0015",
    "stripe_account": "1:10:100:1021",
    "revenue_account": "3:3600",
    "financial_expense_account": "6:6900"
  }
}
```

Resulting hledger transaction:

```hledger
2026-01-15 * P00000999 Acme Corp | SaaS subscription - order ORD-2026-0015
    ; order:ORD-2026-0015
    ; payment_provider:pi_3ExampleStripe123
    1 Actifs / Assets:10 Actif circulants / Current Assets:100 Trésorerie / Cash and cash equivalents:1021 Stripe / Stripe Account           CHF 242.50
    6 Autres Charges d'Explotation, Amortissements et Corrections de Valeur et Resultats Financiers / Other Operating Expenses, Depreciations and Value Adjustments, Financial result:6900 Charges financières / Financial expense        CHF 7.50
    3 Produits d'exploitation des ventes de biens et de prestations de services:3600 Autres produits des ventes de biens et de prestations de services / Other operating income        CHF -250.00
```

### 2. `RecordInvoiceIssued`

Use when the customer orders now and will be invoiced later. This creates the receivable; no Stripe account is involved yet.

Parameters:

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `date` | date | yes | `{today}` | Invoice date. |
| `partner` | partner | yes | - | Customer partner code. |
| `order_number` | text | yes | - | External order reference. |
| `invoice_number` | invoice | yes | `{next_invoice_SI}` | Issued invoice number. |
| `gross_amount` | amount | yes | - | Gross invoice amount. |
| `description` | text | yes | - | Human-readable description. |
| `revenue_account` | account | yes | - | Filter `^3.*:3400.*$|^3.*:3600.*$`. |
| `receivable_account` | account | yes | - | Filter `^1.*:10.*:110.*:1100.*$`. |

Validation: `{"balanceCheck":true,"minPostings":2}`

Resulting hledger transaction:

```hledger
2026-01-15 * P00000999 Acme Corp | Consulting services - order ORD-2026-0015
    ; invoice:SI202600101
    ; order:ORD-2026-0015
    3 Produits d'exploitation des ventes de biens et de prestations de services:3400 Produits bruts des ventes de prestations de services / Revenues from services      CHF -250.00
    1 Actifs / Assets:10 Actif circulants / Current Assets:110 Créances résultant de la vente de biens et de prestationsde services / Accounts Receivable:1100 Créances résultant de la vente de biens et de prestations de services (Débiteurs) / Accounts receivable (Debtors)   CHF 250.00
```

### 3. `RecordInvoicePayment`

Use when the customer later pays an existing invoice through the payment provider. Clears the full receivable, records the net Stripe inflow, and records the provider fee.

Parameters:

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `date` | date | yes | `{today}` | Payment date. |
| `partner` | partner | yes | - | Customer partner code. |
| `invoice_number` | invoice | yes | - | Invoice being paid. |
| `order_number` | text | yes | - | External order reference. |
| `payment_provider` | text | yes | - | Provider reference. |
| `gross_amount` | amount | yes | - | Gross invoice amount. |
| `net_amount` | amount | yes | - | Net amount landed in Stripe account. |
| `fee_amount` | amount | yes | - | Provider fee. |
| `description` | text | yes | - | Human-readable description. |
| `stripe_account` | account | yes | - | Filter `^1.*:10.*:100.*:1021.*$`. |
| `receivable_account` | account | yes | - | Filter `^1.*:10.*:110.*:1100.*$`. |
| `financial_expense_account` | account | yes | - | Filter `^6.*:6900.*$`. |

Validation: `{"balanceCheck":true,"minPostings":3}`

Resulting hledger transaction:

```hledger
2026-01-22 * P00000999 Acme Corp | Payment of invoice SI202600101
    ; invoice:SI202600101
    ; order:ORD-2026-0015
    ; payment_provider:pi_3ExampleStripe456
    1 Actifs / Assets:10 Actif circulants / Current Assets:100 Trésorerie / Cash and cash equivalents:1021 Stripe / Stripe Account           CHF 242.50
    6 Autres Charges d'Explotation, Amortissements et Corrections de Valeur et Resultats Financiers / Other Operating Expenses, Depreciations and Value Adjustments, Financial result:6900 Charges financières / Financial expense        CHF 7.50
    1 Actifs / Assets:10 Actif circulants / Current Assets:110 Créances résultant de la vente de biens et de prestationsde services / Accounts Receivable:1100 Créances résultant de la vente de biens et de prestations de services (Débiteurs) / Accounts receivable (Debtors)   CHF -250.00
```

### 4. `TransferStripeToBank`

Use periodically (for example monthly) to move the Stripe/e-money balance that was paid out to the bank account. Total cash is unchanged; only the composition between `1021` and `1020` changes.

Parameters:

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `date` | date | yes | `{today}` | Payout date. |
| `amount` | amount | yes | - | Amount actually transferred to the bank. |
| `payout_reference` | text | yes | - | Provider payout reference. |
| `bank_account` | account | yes | - | Filter `^1.*:10.*:100.*:1020.*$`. |
| `stripe_account` | account | yes | - | Filter `^1.*:10.*:100.*:1021.*$`. |

Validation: `{"balanceCheck":true,"minPostings":2}`

Resulting hledger transaction:

```hledger
2026-02-01 * Stripe | Stripe payout to bank
    ; payout:po_3ExampleStripe789
    1 Actifs / Assets:10 Actif circulants / Current Assets:100 Trésorerie / Cash and cash equivalents:1020 Avoirs en banque / Bank Account (asset)           CHF 1200.00
    1 Actifs / Assets:10 Actif circulants / Current Assets:100 Trésorerie / Cash and cash equivalents:1021 Stripe / Stripe Account         CHF -1200.00
```

## Modifying the Integration without Changing Code

Because the machine client only sends parameter values to a macro id, operators can change the posted transaction by editing the macro:

- Change which revenue account is used (`3400` vs `3600`).
- Add extra postings (for example VAT once the company is VAT-registered).
- Add extra tags or metadata.
- Create a new macro, flag it `machineRunnable = true`, and point the machine client at the new macro id.

The machine endpoint will run any macro as long as it is flagged `machineRunnable = true`; it is not hard-coded to the payment use-case.

## Impact on Reports

Adding `1021 Stripe` changes the built-in reports only in the ways described below, provided the account is declared with `type:Cash`.

### Balance Sheet

`1021 Stripe` is included automatically in the **Cash and Cash Equivalents** section because the Standard and Swiss Balance Sheet templates use `"accountTypes": ["CASH"]`. It also rolls into **Total Assets** without any template change.

A monthly sweep from Stripe to the bank leaves **Total Cash** unchanged; only the split between `1020` and `1021` changes.

### Cash Flow Statement

The Swiss Cash Flow Statement reconciles opening and closing cash/cash equivalents. Because `1021 Stripe` is a `CASH` type account, its balance is included in that reconciliation automatically. No `cashFlowConfig` regex change is required.

- Customer payments increase `1021 Stripe`; this is a cash inflow, reflected in the closing cash balance.
- The monthly Stripe-to-bank transfer moves cash from `1021` to `1020`; total cash is unchanged, so it does not appear as operating, investing or financing cash flow.
- Stripe fees are already recorded as expenses, so they reduce net income and therefore reduce operating cash flow under the indirect method. No extra adjustment is needed because the fee is a real cash outflow to Stripe.

### Income Statement

No impact. `1021 Stripe` is an asset account, not revenue or expense. Revenue is still recognised in `3400`/`3600` and fees in `6900`.

### Trial Balance

`1021 Stripe` appears in the **Cash** section like `1020` and `1000`.

### Swiss Tax Declaration

Section **A.6 Total du bilan** uses `"accountTypes": ["ASSET", "CASH"]`, so `1021 Stripe` is included in total assets automatically.

### Unpaid Sales Invoices Report

No impact. That report groups by `invoice:SI*` tags and sums only the `1100` Accounts Receivable balance.

### Summary of Report Template Changes

No existing built-in report templates need to be modified, as long as `1021 Stripe` is declared as `type:Cash`. If you ever want to show Stripe separately from bank and cash-on-hand, you can add a dedicated regex section matching `^1:10:100:1021$`.

## Implementation Notes

- Create the `1021 Stripe` account in the chart of accounts before machines start posting.
- The partner record must exist before posting; machines should not auto-create partners from untrusted payment-provider payloads.
- Journal locking applies to machine-posted transactions just as it does to UI-posted ones.
- The `MACHINE` role should be the **only** role that can call `/api/macro/execute/machine`; do not also allow `Roles.USER`, otherwise any logged-in user could impersonate the integration.
- If the company becomes VAT-registered later, a VAT liability posting can be added to the relevant macros without changing the machine client.
