-- Add machine-runnable flag to macros and create standard machine-only macros.
-- Machine clients can only invoke macros where machine_runnable = true.

ALTER TABLE T_macro
    ADD COLUMN machine_runnable BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE T_macro_AUD
    ADD COLUMN machine_runnable BOOLEAN;

-- Update existing standard macros to keep them UI-only.
UPDATE T_macro
    SET machine_runnable = FALSE
    WHERE machine_runnable IS NULL;

-- RecordOnlinePayment: customer orders and pays online in one step.
-- Money lands net of fees in the Stripe e-money account.
INSERT INTO T_macro (id, name, description, parameters, template, validation, notes, machine_runnable, created_date, modified_date)
VALUES (
    'macro-record-online-payment',
    'RecordOnlinePayment',
    'Record revenue for an order that was paid online through a payment provider',
    '[{"name":"date","type":"date","prompt":"Transaction date","defaultValue":"{today}","required":true},{"name":"partner","type":"partner","prompt":"Partner (customer)","required":true},{"name":"order_number","type":"text","prompt":"External order number","required":true},{"name":"payment_provider","type":"text","prompt":"Payment provider reference","required":true},{"name":"gross_amount","type":"amount","prompt":"Gross amount charged to the customer","required":true},{"name":"net_amount","type":"amount","prompt":"Net amount received by the payment provider","required":true},{"name":"fee_amount","type":"amount","prompt":"Payment provider fee","required":true},{"name":"description","type":"text","prompt":"Description","required":true},{"name":"stripe_account","type":"account","prompt":"Stripe/e-money account (1021)","filter":"^1.*:10.*:100.*:1021.*$","required":true},{"name":"revenue_account","type":"account","prompt":"Revenue account (3400 or 3600)","filter":"^3.*:3400.*$|^3.*:3600.*$","required":true},{"name":"financial_expense_account","type":"account","prompt":"Financial expense account (6900)","filter":"^6.*:6900.*$","required":true}]',
    '{date} * {partner} | {description}
    ; order:{order_number}
    ; payment_provider:{payment_provider}
    {stripe_account}           {default_currency} {net_amount}
    {financial_expense_account}  {default_currency} {fee_amount}
    {revenue_account}          {default_currency} -{gross_amount}',
    '{"balanceCheck":true,"minPostings":3}',
    'Use for online orders paid immediately. The Stripe/e-money balance increases by the net amount, the provider fee is recorded as a financial expense, and revenue is credited for the gross amount.',
    TRUE,
    NOW(),
    NOW());

-- RecordInvoiceIssued: send an invoice to a customer who will pay later.
INSERT INTO T_macro (id, name, description, parameters, template, validation, notes, machine_runnable, created_date, modified_date)
VALUES (
    'macro-record-invoice-issued',
    'RecordInvoiceIssued',
    'Record an invoice issued to a customer who will pay later',
    '[{"name":"date","type":"date","prompt":"Invoice date","defaultValue":"{today}","required":true},{"name":"partner","type":"partner","prompt":"Partner (customer)","required":true},{"name":"order_number","type":"text","prompt":"External order number","required":true},{"name":"invoice_number","type":"invoice","prompt":"Invoice number","defaultValue":"{next_invoice_SI}","required":true},{"name":"gross_amount","type":"amount","prompt":"Gross invoice amount","required":true},{"name":"description","type":"text","prompt":"Description","required":true},{"name":"revenue_account","type":"account","prompt":"Revenue account (3400 or 3600)","filter":"^3.*:3400.*$|^3.*:3600.*$","required":true},{"name":"receivable_account","type":"account","prompt":"Receivable account (1100)","filter":"^1.*:10.*:110.*:1100.*$","required":true}]',
    '{date} * {partner} | {description}
    ; invoice:{invoice_number}
    ; order:{order_number}
    {revenue_account}          {default_currency} -{gross_amount}
    {receivable_account}     {default_currency} {gross_amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'Use when a customer orders now and will be invoiced later. Records revenue and an accounts receivable asset. No Stripe account is involved at this stage.',
    TRUE,
    NOW(),
    NOW());

-- RecordInvoicePayment: customer pays a previously issued invoice through a payment provider.
INSERT INTO T_macro (id, name, description, parameters, template, validation, notes, machine_runnable, created_date, modified_date)
VALUES (
    'macro-record-invoice-payment',
    'RecordInvoicePayment',
    'Record a payment received through a payment provider for an existing invoice',
    '[{"name":"date","type":"date","prompt":"Payment date","defaultValue":"{today}","required":true},{"name":"partner","type":"partner","prompt":"Partner (customer)","required":true},{"name":"invoice_number","type":"invoice","prompt":"Invoice number being paid","required":true},{"name":"order_number","type":"text","prompt":"External order number","required":true},{"name":"payment_provider","type":"text","prompt":"Payment provider reference","required":true},{"name":"gross_amount","type":"amount","prompt":"Gross invoice amount","required":true},{"name":"net_amount","type":"amount","prompt":"Net amount received by the payment provider","required":true},{"name":"fee_amount","type":"amount","prompt":"Payment provider fee","required":true},{"name":"description","type":"text","prompt":"Description","required":true},{"name":"stripe_account","type":"account","prompt":"Stripe/e-money account (1021)","filter":"^1.*:10.*:100.*:1021.*$","required":true},{"name":"receivable_account","type":"account","prompt":"Receivable account (1100)","filter":"^1.*:10.*:110.*:1100.*$","required":true},{"name":"financial_expense_account","type":"account","prompt":"Financial expense account (6900)","filter":"^6.*:6900.*$","required":true}]',
    '{date} * {partner} | {description}
    ; invoice:{invoice_number}
    ; order:{order_number}
    ; payment_provider:{payment_provider}
    {stripe_account}           {default_currency} {net_amount}
    {financial_expense_account}  {default_currency} {fee_amount}
    {receivable_account}     {default_currency} -{gross_amount}',
    '{"balanceCheck":true,"minPostings":3}',
    'Use when a customer pays an existing invoice online. Clears the full receivable, records the Stripe/e-money inflow net of fees, and records the provider fee as a financial expense.',
    TRUE,
    NOW(),
    NOW());

-- TransferStripeToBank: sweep accumulated Stripe balance to the bank account.
INSERT INTO T_macro (id, name, description, parameters, template, validation, notes, machine_runnable, created_date, modified_date)
VALUES (
    'macro-transfer-stripe-to-bank',
    'TransferStripeToBank',
    'Transfer accumulated Stripe/e-money balance to the bank account',
    '[{"name":"date","type":"date","prompt":"Payout date","defaultValue":"{today}","required":true},{"name":"amount","type":"amount","prompt":"Amount actually transferred to the bank","required":true},{"name":"payout_reference","type":"text","prompt":"Payout reference","required":true},{"name":"bank_account","type":"account","prompt":"Bank account (1020)","filter":"^1.*:10.*:100.*:1020.*$","required":true},{"name":"stripe_account","type":"account","prompt":"Stripe/e-money account (1021)","filter":"^1.*:10.*:100.*:1021.*$","required":true}]',
    '{date} * Stripe | Stripe payout to bank
    ; payout:{payout_reference}
    {bank_account}           {default_currency} {amount}
    {stripe_account}         {default_currency} -{amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'Use periodically (for example monthly) to move the Stripe/e-money balance that was paid out to the bank account. Total cash is unchanged; only the composition between 1020 and 1021 changes.',
    TRUE,
    NOW(),
    NOW());
