-- Insert standard accounting macros
-- These macros are templates for common accounting transactions

-- PaymentByStaff: Payment by a member of staff which will then need to be reimbursed
INSERT INTO T_macro (id, journal_id, name, description, parameters, template, validation, notes, created_date, modified_date)
SELECT 
    'macro-payment-by-staff',
    id,
    'PaymentByStaff',
    'Payment by a member of staff which will then need to be reimbursed',
    '[{"name":"id","type":"uuid","required":true},{"name":"date","type":"date","prompt":"Transaction date","defaultValue":"{today}","required":true},{"name":"partner","type":"payee","prompt":"Partner (supplier)","required":true},{"name":"invoice_number","type":"code","prompt":"Invoice number (8 digits)","defaultValue":"{next_invoice_PI}","required":true},{"name":"amount","type":"amount","prompt":"Amount (e.g., 100.50)","required":true},{"name":"description","type":"text","prompt":"Description","required":true},{"name":"expense_account","type":"account","prompt":"Expense account (1.. or 6..)","filter":"^6.*:.*$|^1.*:10.*:120.*:.*$|^1.*:14.*:150.*$","required":true},{"name":"staff_account","type":"account","prompt":"Staff member account (2..)","filter":"^2.*:20.*:220.*:2210.*:2210.*$","required":true}]',
    '{date} * {partner} | {description}
    ; id:{id}
    ; invoice:{invoice_number}
    {expense_account}        CHF {amount}
    {staff_account}  CHF -{amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'Use this macro when a staff member pays for a business expense with their own money. The expense is recorded immediately, and a liability is created to reimburse the staff member. Example: Anton pays CHF 100 for domain names with his personal credit card. Debit: Expense account (increases expense). Credit: Staff liability account (you owe Anton CHF 100).',
    NOW(),
    NOW()
FROM T_journal
LIMIT 1;

-- RepayStaff: Repaying cash owed to a member of staff
INSERT INTO T_macro (id, journal_id, name, description, parameters, template, validation, notes, created_date, modified_date)
SELECT 
    'macro-repay-staff',
    id,
    'RepayStaff',
    'Repaying cash owed to a member of staff',
    '[{"name":"id","type":"uuid","required":true},{"name":"date","type":"date","prompt":"Payment date","defaultValue":"{today}","required":true},{"name":"partner","type":"payee","prompt":"Partner (staff member)","required":true},{"name":"description","type":"text","prompt":"Description","required":true},{"name":"invoice_numbers","type":"text","prompt":"Invoice numbers to reimburse (comma-separated, 8 digits each)","required":true},{"name":"amount","type":"amount","prompt":"Total amount (e.g., 33.78)","required":true},{"name":"bank_account","type":"account","prompt":"Bank account (1..)","filter":"^1.*:10.*:100.*:1020.*$","required":true},{"name":"staff_account","type":"account","prompt":"Staff member account (2..)","filter":"^2.*:20.*:220.*:2210.*:2210.*$","required":true}]',
    '{date} * {partner} | {description}
    ; id:{id}
    ; :Payment:, {invoice_numbers}
    {bank_account}           CHF -{amount}
    {staff_account}  CHF {amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'Use this macro to repay money owed to a staff member for expenses they paid on behalf of the company. This clears the liability created by the PaymentByStaff macro. Example: Repaying Anton CHF 100 for domain names he purchased. Debit: Staff liability account (reduces liability, you no longer owe Anton). Credit: Bank account (cash goes out).',
    NOW(),
    NOW()
FROM T_journal
LIMIT 1;

-- BankingExpense: Payment for banking expenses
INSERT INTO T_macro (id, journal_id, name, description, parameters, template, validation, notes, created_date, modified_date)
SELECT 
    'macro-banking-expense',
    id,
    'BankingExpense',
    'Payment for banking expenses',
    '[{"name":"id","type":"uuid","required":true},{"name":"date","type":"date","prompt":"Transaction date","defaultValue":"{today}","required":true},{"name":"description","type":"text","prompt":"Description","required":true},{"name":"invoice_number","type":"code","prompt":"Invoice number (8 digits)","defaultValue":"{next_invoice_PI}","required":true},{"name":"amount","type":"amount","prompt":"Amount (e.g., 5.00)","required":true},{"name":"bank_account","type":"account","prompt":"Bank account (1..)","filter":"^1.*:10.*:100.*:1020.*$","required":true},{"name":"expense_account","type":"account","prompt":"Financial expense account (6..)","filter":"^6.*:6900.*$","required":true}]',
    '{date} * P00000004 PostFinance AG | {description}
    ; id:{id}
    ; :Payment:, invoice:{invoice_number}
    {expense_account}        CHF {amount}
    {bank_account}           CHF -{amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'Use this macro to record bank fees, transaction charges, or other banking-related expenses. Example: Monthly bank account maintenance fee of CHF 5. Debit: Banking expense account (increases expense). Credit: Bank account (cash goes out).',
    NOW(),
    NOW()
FROM T_journal
LIMIT 1;

-- PayInvoiceFromBank: Paying an invoice using the bank, paying direct to the supplier
INSERT INTO T_macro (id, journal_id, name, description, parameters, template, validation, notes, created_date, modified_date)
SELECT 
    'macro-pay-invoice-from-bank',
    id,
    'PayInvoiceFromBank',
    'Paying an invoice using the bank, paying direct to the supplier',
    '[{"name":"id","type":"uuid","required":true},{"name":"id2","type":"uuid","required":true},{"name":"invoice_date","type":"date","prompt":"Invoice date","defaultValue":"{today}","required":true},{"name":"payment_date","type":"date","prompt":"Payment date (>= invoice date)","defaultValue":"{today}","required":true},{"name":"partner","type":"payee","prompt":"Partner (supplier)","required":true},{"name":"description","type":"text","prompt":"Description","required":true},{"name":"invoice_number","type":"code","prompt":"Invoice number (8 digits)","defaultValue":"{next_invoice_PI}","required":true},{"name":"amount","type":"amount","prompt":"Amount (e.g., 1.60)","required":true},{"name":"expense_account","type":"account","prompt":"Expense account (6..)","filter":"^6.*:.*$","required":true},{"name":"liability_account","type":"account","prompt":"Liability account (2..)","filter":"^2.*:20.*:200.*:2000.*$","required":true},{"name":"bank_account","type":"account","prompt":"Bank account (1..)","filter":"^1.*:10.*:100.*:1020.*$","required":true}]',
    '{invoice_date} * {partner} | {description}
    ; id:{id}
    ; invoice:{invoice_number}
    {expense_account}        CHF {amount}
    {liability_account}      CHF -{amount}

{payment_date} * {partner} | Payment of invoice
    ; id:{id2}
    ; :Payment:, invoice:{invoice_number}
    {liability_account}      CHF {amount}
    {bank_account}           CHF -{amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'Use this macro when paying a supplier invoice directly from the bank account. This is a two-step process: first record the invoice (creates A/P liability), then pay it. Step 1: Record invoice received (creates liability) - Debit: Expense or Asset account, Credit: Accounts Payable (you owe the supplier). Step 2: Pay the invoice (this macro) - Debit: Accounts Payable (reduces liability), Credit: Bank account (cash goes out).',
    NOW(),
    NOW()
FROM T_journal
LIMIT 1;

-- PaymentForGoods: Payment for goods which will be sold
INSERT INTO T_macro (id, journal_id, name, description, parameters, template, validation, notes, created_date, modified_date)
SELECT 
    'macro-payment-for-goods',
    id,
    'PaymentForGoods',
    'Payment by a member of staff, by cash or from the bank account, for goods which will be sold, either by modifying them or by selling them as is',
    '[{"name":"id","type":"uuid","required":true},{"name":"date","type":"date","prompt":"Transaction date","defaultValue":"{today}","required":true},{"name":"partner","type":"payee","prompt":"Partner (supplier)","required":true},{"name":"invoice_number","type":"code","prompt":"Invoice number (8 digits)","defaultValue":"{next_invoice_PI}","required":true},{"name":"amount","type":"amount","prompt":"Amount (e.g., 100.50)","required":true},{"name":"description","type":"text","prompt":"Description","required":true},{"name":"inventory_account","type":"account","prompt":"Inventory account (1..)","filter":"^1.*:10.*:120.*:12[0-9][0-9].*$","required":true},{"name":"liability_account","type":"account","prompt":"Liability account (1.. or 2..)","filter":"^1.*:10.*:100.*:10[0-9]0.*$|^2.*:20.*:220.*2210.*$","required":true}]',
    '{date} * {partner} | {description}
    ; id:{id}
    ; invoice:{invoice_number}
    {inventory_account}      CHF {amount}
    {liability_account}      CHF -{amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'Use this macro when purchasing goods for resale (inventory). The goods become an asset until sold. Example: Purchasing CHF 50 of components to build and sell. Debit: Inventory account (asset increases). Credit: Accounts Payable or Cash (liability or cash decreases).',
    NOW(),
    NOW()
FROM T_journal
LIMIT 1;

-- InvoiceForServicesOrSaas: Invoice sent to a partner for services rendered or SaaS
INSERT INTO T_macro (id, journal_id, name, description, parameters, template, validation, notes, created_date, modified_date)
SELECT 
    'macro-invoice-for-services',
    id,
    'InvoiceForServicesOrSaas',
    'Invoice sent to a partner for services rendered or SaaS',
    '[{"name":"id","type":"uuid","required":true},{"name":"date","type":"date","prompt":"Transaction date","defaultValue":"{today}","required":true},{"name":"partner","type":"payee","prompt":"Partner (customer)","required":true},{"name":"invoice_number","type":"code","prompt":"Invoice number (8 digits)","defaultValue":"{next_invoice_SI}","required":true},{"name":"amount","type":"amount","prompt":"Amount (e.g., 100.50)","required":true},{"name":"description","type":"text","prompt":"Description","required":true},{"name":"revenue_account","type":"account","prompt":"Revenue account (3..)","filter":"^3.*:3400.*$|^3.*:3600.*$","required":true},{"name":"receivable_account","type":"account","prompt":"Receivable account (1100)","filter":"^1.*:10.*:110.*:1100.*$","required":true}]',
    '{date} * {partner} | {description}
    ; id:{id}
    ; invoice:{invoice_number}
    {revenue_account}      CHF -{amount}
    {receivable_account}   CHF {amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'Use this macro when sending an invoice to a customer for services or SaaS. Revenue is recognized when the invoice is sent (accrual accounting). Example: Invoicing a customer CHF 2000 for consulting services. Debit: Accounts Receivable (asset, customer owes you). Credit: Revenue account (increases revenue).',
    NOW(),
    NOW()
FROM T_journal
LIMIT 1;

-- CustomerPaysInvoice: Customer pays a previously sent invoice
INSERT INTO T_macro (id, journal_id, name, description, parameters, template, validation, notes, created_date, modified_date)
SELECT 
    'macro-customer-pays-invoice',
    id,
    'CustomerPaysInvoice',
    'Customer pays a previously sent invoice',
    '[{"name":"id","type":"uuid","required":true},{"name":"date","type":"date","prompt":"Transaction date","defaultValue":"{today}","required":true},{"name":"partner","type":"payee","prompt":"Partner (customer)","required":true},{"name":"invoice_number","type":"code","prompt":"Invoice number (8 digits)","defaultValue":"","required":true},{"name":"amount","type":"amount","prompt":"Amount (e.g., 100.50)","required":true},{"name":"description","type":"text","prompt":"Description","required":true},{"name":"ingoing_account","type":"account","prompt":"Ingoing account (1..)","filter":"^1.*:10.*:100.*:10[0-9]0.*$","required":true},{"name":"receivable_account","type":"account","prompt":"Receivable account (1100)","filter":"^1.*:10.*:110.*:1100.*$","required":true}]',
    '{date} * {partner} | {description}
    ; id:{id}
    ; invoice:{invoice_number}
    {ingoing_account}      CHF {amount}
    {receivable_account}   CHF -{amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'Use this macro when a customer pays an invoice you previously sent. This clears the accounts receivable created by InvoiceForServicesOrSaas. Example: Customer pays CHF 2000 invoice. Debit: Bank account (cash comes in). Credit: Accounts Receivable (reduces asset, customer no longer owes you).',
    NOW(),
    NOW()
FROM T_journal
LIMIT 1;

-- InventoryAdjustment: Adjust inventory value for obsolete, damaged, or depreciated goods (year-end closing)
INSERT INTO T_macro (id, journal_id, name, description, parameters, template, validation, notes, created_date, modified_date)
SELECT 
    'macro-inventory-adjustment',
    id,
    'InventoryAdjustment',
    'Adjust inventory value for obsolete, damaged, or depreciated goods (year-end closing)',
    '[{"name":"id","type":"uuid","required":true},{"name":"date","type":"date","prompt":"Adjustment date","defaultValue":"{today}","required":true},{"name":"description","type":"text","prompt":"Description (e.g., Year-end inventory write-down)","required":true},{"name":"adjustment_amount","type":"amount","prompt":"Adjustment amount (positive for write-down)","required":true},{"name":"inventory_account","type":"account","prompt":"Inventory account (120x)","filter":"^1.*:10.*:120.*:12[0-9][0-9].*$","required":true},{"name":"expense_account","type":"account","prompt":"Expense account (typically 6700 Other operating expenses)","filter":"^6.*:6700.*$","required":true}]',
    '{date} * Inventory adjustment | {description}
    ; id:{id}
    ; :YearEnd:InventoryAdjustment:
    {expense_account}        CHF {adjustment_amount}
    {inventory_account}      CHF -{adjustment_amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'Use this macro at year-end to write down inventory value for obsolete or damaged goods. This is a year-end closing adjustment. Example: CHF 10 of components are obsolete and worthless. Debit: Expense account (increases expense, reduces profit). Credit: Inventory account (reduces asset value).',
    NOW(),
    NOW()
FROM T_journal
LIMIT 1;

-- RecordDepreciation: Record annual depreciation for fixed assets (year-end closing)
INSERT INTO T_macro (id, journal_id, name, description, parameters, template, validation, notes, created_date, modified_date)
SELECT 
    'macro-record-depreciation',
    id,
    'RecordDepreciation',
    'Record annual depreciation for fixed assets (year-end closing)',
    '[{"name":"id","type":"uuid","required":true},{"name":"date","type":"date","prompt":"Depreciation date (typically year-end)","defaultValue":"{year}-12-31","required":true},{"name":"description","type":"text","prompt":"Description (e.g., Annual depreciation for 2025)","required":true},{"name":"depreciation_amount","type":"amount","prompt":"Depreciation amount","required":true},{"name":"asset_account","type":"account","prompt":"Fixed asset account (14xx or 15xx)","filter":"^1.*:14.*:15[0-9].*$","required":true},{"name":"depreciation_expense_account","type":"account","prompt":"Depreciation expense account (6800)","filter":"^6.*:6800.*$","required":true}]',
    '{date} * Annual depreciation | {description}
    ; id:{id}
    ; :YearEnd:Depreciation:
    {depreciation_expense_account}    CHF {depreciation_amount}
    {asset_account}                   CHF -{depreciation_amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'Use this macro at year-end to record depreciation of fixed assets. Depreciation spreads the cost of an asset over its useful life. Example: CHF 128 annual depreciation on a CHF 640 laptop (5-year life). Debit: Depreciation expense (increases expense, reduces profit). Credit: Fixed asset account (reduces asset value).',
    NOW(),
    NOW()
FROM T_journal
LIMIT 1;

-- TaxProvision: Record year-end tax provision (income tax + capital tax)
INSERT INTO T_macro (id, journal_id, name, description, parameters, template, validation, notes, created_date, modified_date)
SELECT 
    'macro-tax-provision',
    id,
    'TaxProvision',
    'Record year-end tax provision (income tax + capital tax)',
    '[{"name":"id","type":"uuid","required":true},{"name":"date","type":"date","prompt":"Transaction date (typically December 31)","defaultValue":"{year}-12-31","required":true},{"name":"description","type":"text","prompt":"Description of tax provision","defaultValue":"Tax provision for {year}","required":true},{"name":"total_tax_amount","type":"amount","prompt":"Total tax provision (income + capital)","required":true}]',
    '{date} * Tax provision | {description}
    ; id:{id}
    ; :YearEnd:TaxProvision:
    8 Charges et Produits hors Explotation, Extraordinaires, Uniques ou Hors Periode / Non-Operational, Extraordinary, Non-Recurring or Prior-Period Expenses and Income:8900 Impôts directs (personnes morales) / Direct taxes (legal entities)    CHF {total_tax_amount}
    2 Passif / Liabilities:20 Capitaux étrangers à court terme / Current liabilities:220 Autres dettes à court terme / Other short-term liabilities:2208 Impôts directs / Direct taxes    CHF -{total_tax_amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'Record year-end tax provision for income and capital taxes. This creates a liability for taxes owed.',
    NOW(),
    NOW()
FROM T_journal
LIMIT 1;

-- TaxPayment: Record payment of provisioned taxes (with adjustment if actual differs)
INSERT INTO T_macro (id, journal_id, name, description, parameters, template, validation, notes, created_date, modified_date)
SELECT 
    'macro-tax-payment',
    id,
    'TaxPayment',
    'Record payment of provisioned taxes (with adjustment if actual differs)',
    '[{"name":"id","type":"uuid","required":true},{"name":"date","type":"date","prompt":"Payment date","required":true},{"name":"payee","type":"payee","prompt":"Tax authority (e.g., Canton Vaud)","required":true},{"name":"description","type":"text","prompt":"Description (e.g., Payment for 2025 taxes)","required":true},{"name":"provision_amount","type":"amount","prompt":"Amount that was provisioned (from year-end provision)","required":true},{"name":"actual_amount","type":"amount","prompt":"Actual amount paid (from tax bill)","required":true},{"name":"bank_account","type":"account","prompt":"Bank account to pay from","filter":"^1.*:10.*:100.*:1020.*$","required":true}]',
    '{date} * {payee} | {description}
    ; id:{id}
    ; :TaxPayment:
    2 Passif / Liabilities:20 Capitaux étrangers à court terme / Current liabilities:220 Autres dettes à court terme / Other short-term liabilities:2208 Impôts directs / Direct taxes    CHF {provision_amount}
    8 Charges et Produits hors Explotation, Extraordinaires, Uniques ou Hors Periode / Non-Operational, Extraordinary, Non-Recurring or Prior-Period Expenses and Income:8900 Impôts directs (personnes morales) / Direct taxes (legal entities)    CHF {actual_amount - provision_amount}
    {bank_account}    CHF -{actual_amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'This macro handles three scenarios: 1. If actual = provision: Only liability and bank accounts are affected. 2. If actual > provision: Additional tax expense is recorded. 3. If actual < provision: Tax expense is reduced (negative amount). Example: Provision was CHF 350, actual bill is CHF 380 - Debit 220 (Tax liability): CHF 350 (clears the provision), Debit 8900 (Tax expense): CHF 30 (additional expense), Credit 1020 (Bank): CHF 380 (total payment).',
    NOW(),
    NOW()
FROM T_journal
LIMIT 1;

-- LegalReserveAllocation: Allocate 5% of annual profit to legal reserves (MANDATORY for Swiss Sàrl)
INSERT INTO T_macro (id, journal_id, name, description, parameters, template, validation, notes, created_date, modified_date)
SELECT 
    'macro-legal-reserve-allocation',
    id,
    'LegalReserveAllocation',
    'Allocate 5% of annual profit to legal reserves (MANDATORY for Swiss Sàrl until reserves reach 20% of capital)',
    '[{"name":"id","type":"uuid","required":true},{"name":"date","type":"date","prompt":"Allocation date (typically December 31)","defaultValue":"{year}-12-31","required":true},{"name":"allocation_amount","type":"amount","prompt":"Amount to allocate (5% of profit, or less if target reached)","required":true},{"name":"description","type":"text","prompt":"Description","defaultValue":"Legal reserve allocation for {year} (5% of profit)","required":true}]',
    '{date} * Legal reserve allocation | {description}
    ; id:{id}
    ; :YearEnd:LegalReserve:
    2 Passif / Equity:290 Réserves, propres parts du capital et bénéfice ou perte résultant du bilan / Reserves and retained earnings, own capital shares and disposable profit:2979 Bénéfice de l''exercice ou perte de l''exercice / Annual profit or loss as negative items    CHF {allocation_amount}
    2 Passif / Equity:290 Réserves, propres parts du capital et bénéfice ou perte résultant du bilan / Reserves and retained earnings, own capital shares and disposable profit:2950 Réserves légales issues du bénéfice / Legal reserves from profit    CHF -{allocation_amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'MANDATORY for Swiss Sàrl (CO Art. 671-671a): Allocate 5% of annual profit to legal reserves. Continue until reserves reach 20% of share capital. For CHF 20,000 capital, target is CHF 4,000. Example: Annual profit is CHF 10,000 - 5% allocation = CHF 500 - Debit 2979 (Annual profit): CHF 500 (reduces distributable profit) - Credit 2950 (Legal reserves): CHF 500 (increases reserves). Stop allocating once 2950 balance reaches CHF 4,000 (20% of CHF 20,000).',
    NOW(),
    NOW()
FROM T_journal
LIMIT 1;
