
# Payment by a member of staff which will then need to be reimbursed

Partner is the supplier
New invoice number - incremented from the previous invoice number
Use a 6er account for the expense
Use the 2er account belonging to the member of staff

`$date` is the date, in the format `YYYY-MM-DD`, defaulting to today
`$partner` is the partner being paid, in the format `Pnnnnnnnn`
`$invoiceNumber` is the invoice number, in the format `nnnnnnnn`, defaulting to the next invoice number that starts with `PI` (purchase invoice)
`$amount` is the amount, in the format `#.nn`, so with two decimal places and at least one digit before the decimal point
`$description` is the description, as free text
`$expenseAccount` is the 6er account for the expense, selected from the list of 6er leaf accounts (accounts with no children), whose names match the regex `^6.*:.*$`
`$memberOfStaffAccount` is the 2er account belonging to the member of staff, selected from the list of 2er leaf accounts (accounts with no children), whose names match the regex `^2.*:20.*:210.*2160\.\d{3}.*$`

There MUST be at least two spaces after the account name and before the `CHF` and amount.

Template:

    ${date} * ${partner} | ${description}
        ; invoice:PI${invoiceNumber}
        ${expenseAccount}        CHF ${amount}
        ${memberOfStaffAccount}  CHF -${amount}

Example:

    2025-03-12 * P00000010 Anthropic | anthropic (claude api) credits to use AI services paid with revolut USD15.00 - 2025-03-12 anthropic Receipt-2508-1939.pdf
        ; invoice:PI00000028
        6 Autres Charges d'Explotation, Amortissements et Corrections de Valeur et Resultats Financiers / Other Operating Expenses, Depreciations and Value Adjustments, Financial result:6570 Charges informatiques, yc leasing / IT and computing expenses, including leasing:6570.004 Anthropic  CHF 13.26
        2 Passif / Liabilities:20 Capitaux étrangers à court terme / Current liabilities:210 Dettes à court terme portant intérêt / Current interest-bearing liabilites:2160 Autres dettes à court terme non rémunérées / Other non-remunerated short-term liabilities:2160.001 John Smith                CHF -13.26


# Repaying cash owed to a member of staff

Partner is the member of staff
Use the :Payment: tag, because money is leaving abstratium
Invoice numbers should list all of those being reimbursed
Use exactly this 1er account to make the payment from the bank
Use the 2er account belonging to the member of staff

`$date` is the date, in the format `YYYY-MM-DD`, defaulting to today
`$partner` is the partner being paid, in the format `Pnnnnnnnn`
`$description` is the description, as free text
`$repeat{...}` is a loop construct, it will repeat the content of the loop for each invoice number, with commas in between
`${invoiceNumber}` is the invoice number, in the format `nnnnnnnn`, where the user gets to select invoice numbers from previous existing transactions
`${bankAccount}` is the 1er account to make the payment from the bank which matches the regex `^1.*:10.*:100.*:1020.*$`
`${amount}` is the amount, in the format `#.nn`, so with two decimal places and at least one digit before the decimal point
`${memberOfStaffAccount}` is the 2er account belonging to the member of staff, selected from the list of 2er leaf accounts (accounts with no children), whose name matches the regex `^2.*:20.*:210.*2160\.\d{3}.*$`

There MUST be at least two spaces after the account name and before the `CHF` and amount.

Template:

    ${date} * ${partner} | ${description}
        ; :Payment:, $repeat{invoice:PI${invoiceNumber}}
        ${bankAccount}           CHF -${amount}
        ${memberOfStaffAccount}  CHF ${amount}

Example:

    2025-03-17 * P00000001 John Smith | repay petty cash to J. Smith - 2025-03-17 petty cash to john
        ; :Payment:, invoice:PI00000023, invoice:PI00000025, invoice:PI00000026, invoice:PI00000027, invoice:PI00000028
        1 Actifs / Assets:10 Actif circulants / Current Assets:100 Trésorerie / Cash and cash equivalents:1020 Avoirs en banque / Bank Account (asset)                CHF -33.78
        2 Passif / Liabilities:20 Capitaux étrangers à court terme / Current liabilities:210 Dettes à court terme portant intérêt / Current interest-bearing liabilites:2160 Autres dettes à court terme non rémunérées / Other non-remunerated short-term liabilities:2160.001 John Smith                CHF 33.78


# Payment for banking expenses

Partner is the bank
Use the :Payment: tag, because money is leaving abstratium
New invoice number - incremented from the previous invoice number
Use exactly this 6er account for the expense
Use exactly this 1er account to make the payment

`$date` is the date, in the format `YYYY-MM-DD`, defaulting to today
`$bankPartner` is the partner being paid, always `P00000004 Bank AG`
`$description` is the description, as free text
`$invoiceNumber` is the invoice number, in the format `nnnnnnnn`, defaulting to the next invoice number that starts with `PI` (purchase invoice)
`$bankAccount` is the 1er account to make the payment from the bank, matching regex `^1.*:10.*:100.*:1020.*$`
`$amount` is the amount, in the format `#.nn`, so with two decimal places and at least one digit before the decimal point
`$expenseAccount` is the 6er account for the expense, matching regex `^6.*:6900.*$`

There MUST be at least two spaces after the account name and before the `CHF` and amount.

Template:

    ${date} * ${bankPartner} | ${description}
        ; :Payment:, invoice:PI${invoiceNumber}
        ${bankAccount}           CHF -${amount}
        ${expenseAccount}        CHF ${amount}

Example:

    2025-02-28 * P00000004 Bank AG | Bank charges
        ; :Payment:, invoice:PI00000024
        1 Actifs / Assets:10 Actif circulants / Current Assets:100 Trésorerie / Cash and cash equivalents:1020 Avoirs en banque / Bank Account (asset)                CHF -5.00
        6 Autres Charges d'Explotation, Amortissements et Corrections de Valeur et Resultats Financiers / Other Operating Expenses, Depreciations and Value Adjustments, Financial result:6900 Charges financières / Financial expense                CHF 5.00

# Paying an invoice using just the bank, paying direct to the supplier

Dates can be different (invoice date; payment date)
Partner is the same in both transactions
The second one gets the :Payment: tag, because money is leaving abstratium
Use same invoice number - incremented from the previous invoice number
Use a 6er account for the expense
Use a 2er account to note the liability
Use a 1er account to make the payment

`$invoiceDate` is the date, in the format `YYYY-MM-DD`, defaulting to today
`$paymentDate` is the date, in the format `YYYY-MM-DD`, defaulting to today, must be greater than or equal to `$invoiceDate`
`$partner` is the partner being paid, in the format `Pnnnnnnnn`
`$description` is the description, as free text
`$invoiceNumber` is the invoice number, in the format `nnnnnnnn`, defaulting to the next invoice number that starts with `PI` (purchase invoice)
`$amount` is the amount, in the format `#.nn`, so with two decimal places and at least one digit before the decimal point
`$expenseAccount` is the 6er account for the expense, a leaf account, matching regex `^6.*:.*$`
`$liabilityAccount` is the 2er account to note the liability, a leaf account, matching regex `^2.*:20.*:200.*2000.*$`
`$bankAccount` is the 1er account to make the payment from the bank, a leaf account, matching regex `^1.*:10.*:100.*:1020.*$`

There MUST be at least two spaces after the account name and before the `CHF` and amount.

Template:

    ${invoiceDate} * ${partner} | ${description}
        ; invoice:PI${invoiceNumber}
        ${expenseAccount}        CHF ${amount}
        ${liabilityAccount}      CHF -${amount}

    ${paymentDate} * ${partner} | Payment of invoice
        ; :Payment:, invoice:PI${invoiceNumber}
        ${liabilityAccount}      CHF ${amount}
        ${bankAccount}           CHF -${amount}

Example:

    2025-01-04 * P00000007 Hoststar | hoststar invoice domain name monitor-everything.online - Invoice_9100383280_04012025.pdf
        ; invoice:PI00000017
        6 Autres Charges d'Explotation, Amortissements et Corrections de Valeur et Resultats Financiers / Other Operating Expenses, Depreciations and Value Adjustments, Financial result:6570 Charges informatiques, yc leasing / IT and computing expenses, including leasing:6570.001 Domain Names                CHF 1.60
        2 Passif / Liabilities:20 Capitaux étrangers à court terme / Current liabilities:200 Dettes résultant de l'achat de biens et de prestations de services / Accounts payable (A/P):2000 Dettes résultant de l'achat de biens et de prestations de services (créanciers) / Accounts payable (suppliers&creditors)                CHF -1.60

    2025-01-05 * P00000007 Hoststar | Payment of invoice
        ; :Payment:, invoice:PI00000017
        2 Passif / Liabilities:20 Capitaux étrangers à court terme / Current liabilities:200 Dettes résultant de l'achat de biens et de prestations de services / Accounts payable (A/P):2000 Dettes résultant de l'achat de biens et de prestations de services (créanciers) / Accounts payable (suppliers&creditors)                CHF 1.60
        1 Actifs / Assets:10 Actif circulants / Current Assets:100 Trésorerie / Cash and cash equivalents:1020 Avoirs en banque / Bank Account (asset)                CHF -1.60

# Purchasing goods to make products

## Purchase the materials

Similar to Payment by a member of staff or a Paying an invoice using just the bank, but instead of booking the expense account, book the inventory account 1200.

`$date` is the date, in the format `YYYY-MM-DD`, defaulting to today
`$partner` is the partner being paid, in the format `Pnnnnnnnn`
`$description` is the description, as free text
`$invoiceNumber` is the invoice number, in the format `nnnnnnnn`, defaulting to the next invoice number that starts with `PI` (purchase invoice)
`$amount` is the amount, in the format `#.nn`, so with two decimal places and at least one digit before the decimal point
`$inventoryAccount` is the 2er account as we are increasing the value of the inventory, a leaf account, matching regex `^1.*:10.*:120.*:12\d\d.*$`
`$liabilityAccount` is the 2er account to note the liability, a leaf account, matching regex `^2.*:20.*:210.*2160.*$`, or it is the bank or cash account matching regex `^1.*:10.*:100.*:10\d0.*$`

Note: if the goods are to be simply resold, use account 1230 instead of 1200.

Template:

    ${date} * ${partner} | ${description}
        ; invoice:PI${invoiceNumber}
        ${inventoryAccount}      CHF ${amount}
        ${liabilityAccount}      CHF -${amount}

There MUST be at least two spaces after the account name and before the `CHF` and amount.

## Start production

    ${date} * ${partner} | ${description}
        ; invoice:PI${invoiceNumber}
        1200      CHF -${amount}
        1220      CHF ${amount}

## Complete production

    ${date} * ${partner} | ${description}
        ; invoice:PI${invoiceNumber}
        1220      CHF -${amount}
        1210      CHF ${amount}

## Sale of finished goods

### Sale of finished goods that I produced

This will create a sale invoice and reduce the inventory, turning the inventory into an expense at the time of sale.
The difference in expense and sale is the profit.

    ${date} * ${partner} | ${description}
        ; invoice:SI${invoiceNumber}
        1100      CHF -${amountSoldFor} ; accounts receivable, sales invoice issued
        3000      CHF ${amountSoldFor} ; sales of manufactured goods
        4000      CHF ${costOfMaterials}  ; hardware expense that I paid for
        1210      CHF ${costOfMaterials}  ; finished goods

### Sale of finished goods that I resold

Same as above, but using accounts 3200 instead of 3000, and 4200 instead of 4000.

# Sale of SaaS

    ${date} * ${partner} | ${description}
        ; invoice:SI${invoiceNumber}
        1100      CHF -${amount}
        3600      CHF ${amount}

# Sale of Services rendered (consulting / SaaS)

    ${date} * ${partner} | ${description}
        ; invoice:SI${invoiceNumber}
        1100      CHF -${amount}
        3400      CHF ${amount}

# Customer pays invoice

    ${date} * ${partner} | ${description}
        ; :Receipt:, invoice:SI${invoiceNumberBeingPaid}
        1100              CHF -${amount}
        1000 or 1020      CHF ${amount}
