-- Insert payment processor (PSP) macros
-- These macros support recording sales made through an online payment processor
-- such as Stripe, PayPal, Square or Adyen, and manually recording payouts from
-- the processor's balance to the company's bank account.

-- PaymentProcessorSale: Record a single PSP sale (gross revenue, PSP fee, net amount held by the PSP)
INSERT INTO T_macro (id, name, description, parameters, template, validation, notes, created_date, modified_date)
VALUES (    'macro-payment-processor-sale',
    'PaymentProcessorSale',
    'Record a sale made through an online payment processor (e.g. Stripe, PayPal)',
    '[{"name":"date","type":"date","prompt":"Transaction date","defaultValue":"{today}","required":true},{"name":"partner","type":"partner","prompt":"Partner (customer), optional","required":false},{"name":"description","type":"text","prompt":"Description","required":true},{"name":"gross_amount","type":"amount","prompt":"Gross amount charged","required":true},{"name":"fee_amount","type":"amount","prompt":"Payment processor fee (may be 0)","required":true},{"name":"stripe_txn","type":"code","prompt":"Payment processor transaction code (e.g. pi_..., ch_..., txn_...)","required":true},{"name":"contract_id","type":"code","prompt":"Internal contract / order id","required":true},{"name":"revenue_account","type":"account","prompt":"Revenue account (3..)","filter":"^3:.*$","required":true},{"name":"fee_expense_account","type":"account","prompt":"Payment processing fee expense account (6901)","filter":"^6.*:6901.*$","required":true},{"name":"processor_account","type":"account","prompt":"Payment processor balance account (1021)","filter":"^1.*:10.*:100.*:1021.*$","required":true}]',
    '{date} * {partner} | {description}
    ; stripe_txn:{stripe_txn}, contract_id:{contract_id}
    {processor_account}       {default_currency} {gross_amount - fee_amount}
    {fee_expense_account}     {default_currency} {fee_amount}
    {revenue_account}         {default_currency} -{gross_amount}',
    '{"balanceCheck":true,"minPostings":3}',
    'Use this macro to record a sale made through an online payment processor (PSP) such as Stripe, PayPal, Square or Adyen, once the payment and its fee have been reviewed (typically by a separate application that receives the PSP webhooks). The gross amount is credited to revenue, the PSP fee is debited to the payment processing fees expense account, and the net amount (gross minus fee) is debited to the payment processor balance account, since the PSP holds it until payout. Example: a customer pays CHF 100, the PSP charges a CHF 3 fee. Debit: Payment processor balance CHF 97, Debit: Payment processing fees CHF 3, Credit: Revenue CHF 100. This macro can be executed in batch (one row per sale, e.g. from a CSV export of reviewed payments) via the batch macro execution feature.',
    NOW(),
    NOW());

-- TransferPaymentProcessorFunds: Record a payout from the PSP balance to a cash account
INSERT INTO T_macro (id, name, description, parameters, template, validation, notes, created_date, modified_date)
VALUES (    'macro-transfer-psp-funds',
    'TransferPaymentProcessorFunds',
    'Record a payout from the payment processor balance to a bank or cash account',
    '[{"name":"date","type":"date","prompt":"Transfer date","defaultValue":"{today}","required":true},{"name":"description","type":"text","prompt":"Description","required":true},{"name":"amount","type":"amount","prompt":"Amount transferred","required":true},{"name":"processor_account","type":"account","prompt":"Payment processor balance account (source, 1021)","filter":"^1.*:10.*:100.*:1021.*$","required":true},{"name":"cash_account","type":"account","prompt":"Destination cash account (1..)","filter":"^1.*:10.*:100.*:10[0-9][0-9].*$","required":true}]',
    '{date} * Payment processor payout | {description}
    ; Payment:
    {cash_account}       {default_currency} {amount}
    {processor_account}      {default_currency} -{amount}',
    '{"balanceCheck":true,"minPostings":2}',
    'Use this macro to record a payout from a payment processor (e.g. Stripe, PayPal) to any cash or bank account. This clears part of the payment processor balance built up by PaymentProcessorSale transactions. Example: Stripe pays out CHF 500 to the company bank account. Debit: Bank account CHF 500. Credit: Payment processor balance CHF 500.',
    NOW(),
    NOW());
