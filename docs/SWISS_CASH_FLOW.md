# Swiss Cash Flow Statement Comparison

## What Is a Cash Flow Statement?

You already know how to build journals, how double-entry bookkeeping keeps
debits and credits in balance, and how a **balance sheet** (assets,
liabilities, equity at a point in time) and an **income statement**
(revenue minus expenses over a period) are put together. The **cash flow
statement** is the third core financial report, and it answers a question
that neither of the other two reports can answer on their own:

> "Where did the company's cash actually come from, and where did it
> actually go, during this period?"

It reconciles the cash balance at the start of the period with the cash
balance at the end of the period, by explaining every movement in between.
In terms of the accounts in this application, it is essentially a report
about the accounts of `type:Cash` (e.g. bank and till accounts) — but
instead of just showing the opening and closing balance like the balance
sheet does, it groups *why* the balance changed.

### Why not just look at the income statement?

Because **profit is not the same as cash**. Double-entry bookkeeping
records transactions when they are legally/economically incurred (accrual
accounting), not necessarily when cash physically moves. A few examples
that show why a profitable company can still run out of cash, and why a
company that lost money on paper can still have plenty of cash in the
bank:

- **Sales on credit.** You invoice a customer 10'000 CHF. The journal
  entry is `Dr 1100 Receivables / Cr 3200 Sales of goods`. Your income
  statement shows 10'000 CHF of revenue and (if everything else is equal)
  10'000 CHF more profit — but not a single Rappen has hit your bank
  account (`1000 Cash`) yet. Profit went up, cash did not move.
- **Buying inventory or equipment.** You pay 20'000 CHF cash for a
  machine. The entry is `Dr 1500 Machinery / Cr 1000 Cash`. Your income
  statement is untouched (no expense account was used), but your cash
  balance just dropped by 20'000 CHF.
- **Depreciation.** Each year you post `Dr 6800 Depreciation expense /
  Cr 1509 Accumulated depreciation` to spread the cost of that machine
  over its useful life. This *reduces* profit on the income statement,
  but it involves no cash movement at all — no entry ever touches
  `1000 Cash`.
- **Repaying a loan.** You pay back 5'000 CHF of principal on a bank
  loan: `Dr 2100 Bank loan / Cr 1000 Cash`. Cash goes down by 5'000 CHF,
  but the income statement does not show this at all, because reducing a
  liability is not an expense.

A company can be very profitable and still fail because it cannot pay its
bills on time ("profitable but illiquid"), and a company can show a loss
for the year but be perfectly safe because it is sitting on a pile of
cash from previous years. The cash flow statement is the report that lets
you see this liquidity picture directly, instead of trying to infer it
from the balance sheet and income statement.

### What it tells the reader about the company

Broadly, a reader (owner, bank, investor, tax authority) uses the cash
flow statement to answer questions like:

- Does the **core business itself** generate cash, or does the company
  only survive by injecting new loans/capital or selling off assets?
  (This is the whole point of splitting the statement into the three
  sections described below.)
- Can the company **fund its own growth** (buying equipment, expanding
  stock) from operations, or does it need external financing for that?
- Is the company **paying down debt** or **taking on more debt**?
- Is the company **returning cash to owners** (dividends, buybacks) at a
  reasonable and sustainable rate?
- Is the reported profit "real", i.e. backed by actual cash, or is it
  largely made up of non-cash items and growing receivables?

### The three sections, explained

Every cash flow statement — Swiss or otherwise — splits the change in
cash into three buckets, based on *why* the cash moved:

1. **Operating activities** (`Flux de trésorerie provenant de l'activité
   d'exploitation`): cash generated or consumed by the normal, day-to-day
   business — collecting money from customers, paying suppliers,
   employees, rent, interest, taxes. This is the section people care
   about most: a healthy company should generate positive cash flow from
   operations most of the time. If a company only survives on financing
   or investing cash flows, that is a warning sign.
2. **Investing activities** (`Flux de trésorerie provenant de l'activité
   d'investissement`): cash spent buying (or received from selling)
   long-term assets — machinery, real estate, financial investments,
   participations. Negative investing cash flow is often *good news*
   (the company is investing in its future), as long as operations can
   afford to fund it.
3. **Financing activities** (`Flux de trésorerie provenant de l'activité
   de financement`): cash exchanged with the people who fund the company
   — banks (taking out or repaying loans), and shareholders (raising
   share capital, buying back shares, paying dividends).

Adding the three subtotals together gives the total change in cash for
the period, which must reconcile exactly to `closing cash balance −
opening cash balance` of the `type:Cash` accounts on the balance sheet.
This is the same "the numbers must tie out" discipline you already know
from double-entry bookkeeping — nothing here is allowed to be a plug
figure.

### Direct vs. indirect method

There are two accepted ways to build the operating activities section:

- **Direct method**: list actual cash receipts and payments (cash
  received from customers, cash paid to suppliers, cash paid for wages,
  etc.) — essentially a "cash version" of the income statement. This is
  intuitive to read but requires filtering every cash transaction by
  purpose.
- **Indirect method**: start from the **net profit/loss for the year**
  (taken straight from the income statement) and then adjust it for
  every difference between "profit" and "cash", by walking through the
  balance sheet changes. This is the method used almost universally in
  Switzerland (and the one shown in the [Template
  Structure](#template-structure) section below), because it can be
  built entirely from the balance sheet and income statement you already
  have, without re-processing every transaction.

The indirect method's operating section is best understood as a
checklist of "what changed on the balance sheet that doesn't represent a
cash movement, or is cash but is classified elsewhere":

| Adjustment | Why it is added back / deducted |
|---|---|
| + Depreciation/amortisation | Reduced profit but used no cash (see example above) |
| +/- Change in provisions/reserves | Non-cash charges or releases against profit |
| − Increase in receivables (`1100`) | Sale is in profit, but the cash hasn't arrived yet |
| + Decrease in receivables (`1100`) | Cash arrived from sales made (and profited on) earlier |
| − Increase in inventory (`120x`) | Cash was spent building up stock, but it isn't an expense yet |
| + Increase in payables (`2000`) | Expense is in profit, but the cash hasn't left yet |
| − Decrease in payables (`2000`) | Cash left to pay for expenses recorded earlier |
| − Profit / + Loss on disposal of fixed assets | Moves the *investing* portion of a sale out of the operating section |

In other words: start with profit, then walk the balance sheet line by
line and undo everything that isn't a cash movement, or move it to the
section it actually belongs to (investing/financing).

### A small worked example

Suppose during the year a company's only activities were:

1. Opening cash balance: 12'000 CHF.
2. Net profit for the year (from the income statement): 8'000 CHF.
3. Depreciation charged during the year: 3'000 CHF (non-cash).
4. Trade receivables (`1100`) increased by 2'000 CHF (customers owe more
   at year end than at the start — some of the profit is still
   uncollected).
5. Trade payables (`2000`) increased by 1'500 CHF (the company owes
   suppliers a bit more than at the start — it hasn't paid for
   everything it used).
6. Bought a machine for cash: 5'000 CHF (investing).
7. Took out a new bank loan: 3'000 CHF (financing).

The indirect-method cash flow statement reads:

```
Net profit for the year                              8'000
+ Depreciation (non-cash)                             3'000
- Increase in trade receivables                      -2'000
+ Increase in trade payables                          1'500
= Cash flow from operating activities                10'500

- Purchase of machinery                              -5'000
= Cash flow from investing activities                -5'000

+ Proceeds from new bank loan                          3'000
= Cash flow from financing activities                  3'000

= Total change in cash                                8'500
+ Opening cash balance                                12'000
= Closing cash balance                                20'500
```

Reading this tells a story that the income statement alone could not:
the company reported 8'000 CHF of profit, but the *operating* business
generated 10'500 CHF in cash. That is more than profit because the
depreciation add-back (3'000 CHF) and the extra credit from suppliers
(1'500 CHF) outweigh the cash still tied up in customer receivables
(2'000 CHF). It then reinvested 5'000 CHF of that cash into a machine
and topped up with 3'000 CHF of new debt, ending the year with 8'500
CHF more cash than it started with.

Notice how each number plays a different role: profit is the starting
point, depreciation is the biggest adjustment, the receivables and
payables changes show timing differences, and the machine purchase plus
new loan are completely separate decisions reported in their own
sections. If instead the receivables had grown by, say, 15'000 CHF
(customers taking much longer to pay), the operating cash flow would
have been negative even with a healthy profit — exactly the
"profitable but illiquid" trap described above, and exactly what a
lender or owner needs to be warned about early.

## Template Structure


The Swiss SME accounting standard (KMU-Kontenplan) defines a cash flow statement structure with specific groupings and subtotals. The original, taken from the PDF available at https://www.kmu.admin.ch/kmu/de/home/praktisches-wissen/finanzielles/buchhaltung-und-revision/jahresabschluesse/revisionsstelle/wie-man-seine-buchhaltung-organisiert.html and https://www.kmu.admin.ch/dam/kmu/de/dokumente/savoir-pratique/Finances/240812%20Schulkontenrahmen%20VEB%20-%20DE.pdf.download.pdf/240812%20Schulkontenrahmen%20VEB%20-%20DE.pdf online is:

```
Exemple de classification d’un tableau des flux de trésorerie selon la méthode indirecte
** +/– Bénéfice annuel(+) ou perte annuelle (-) **
+/ – Amortissements/ajustements de valeurs (+) et attribution (-) aux comptes d‘immobilisation
+ / – Constitutions (+) et dissolutions (-) de réserves
+ / – Dépréciation (+) et augmentation de la valeur (-) des avoirs à court terme cotés en bourse
+ / – Diminution (+) ou augmentation (-) des créances provenant de livraisons et de prestations
+ / – Diminution (+) ou augmentation (-) des créances à court terme
+ / – Diminution (+) et augmentation (-) des stocks et des prestations non facturées
+ / – Diminution (+) et augmentation (-) des comptes de régularisation d’actifs
+ / – Augmentation (+) et diminution (-) des dettes à court terme résultant d’achats et de prestations de services
+ / – Augmentation (+) et diminution (-) des dettes à court terme
+ / – Augmentation (+) et diminution (-) des comptes de régularisation de passifs
+ / – Pertes (+) et bénéfices (-) sur cessions d’immobilisations
+ / – Autres charges (+) et produits (-) sans effet sur la trésorerie
** = Flux de trésorerie provenant de l’activité d‘exploitation **

– Investissements dans les immobilisations financières
+ Désinvestissements dans les immobilisations financières
– Investissements dans les participations
+ Désinvestissements dans les participations
– Investissements dans les immobilisations corporelles meubles
+ Désinvestissements dans les immobilisations corporelles meubles
– Investissements dans les immobilisations corporelles immeubles
+ Désinvestissements dans les immobilisations corporelles immeubles
– Investissements dans les immobilisations incorporelles
+ Désinvestissements dans les immobilisations incorporelles
** = Flux de trésorerie provenant de l’activité d‘investissement **

+/ – Augmentation (+) ou remboursement (-) de dettes financières à court et à long terme
– Versements de dividendes
+ / – Augmentation (+) ou réduction (-) du capital
+ / – Achat (-) ou vente (+) de propres actions
** = Flux de trésorerie provenant de l’activité de financement **
** = Augmentation ou diminution de la trésorerie **

** Variation de la trésorerie: **
+ Trésorerie initiale
- Trésorerie finale
** = Augmentation ou diminution de la trésorerie **
```

This is line-by-line the same indirect-method logic explained above, just
with a few extra line items you may not hit in a small business every
year (revaluations of listed securities, constitution/dissolution of
reserves, deferred income/expense accruals, gains/losses on disposing of
fixed assets, buying back own shares). Each line still falls into one of
the three buckets:

- Everything down to and including `Flux de trésorerie provenant de
  l'activité d'exploitation` is the **operating** section (starts from
  annual profit/loss and adjusts for non-cash items and short-term
  balance sheet changes).
- Everything down to `Flux de trésorerie provenant de l'activité
  d'investissement` is the **investing** section (purchases/disposals of
  financial assets, participations, and fixed assets — movable and
  immovable tangible assets, and intangible assets).
- Everything down to `Flux de trésorerie provenant de l'activité de
  financement` is the **financing** section (raising/repaying debt,
  dividends, capital changes, treasury shares).
- The final block simply proves that `opening cash + total change in
  cash = closing cash`, i.e. that the statement reconciles to the actual
  `type:Cash` account balances on the balance sheet.

### Practical tips for reading any cash flow statement

- **Read the three subtotals before the details.** Is operating cash
  flow positive? Is the company financing investments from operations or
  from new debt/equity? Is financing cash flow negative (paying down
  debt/dividends, a sign of a mature, self-funding business) or positive
  (raising money, which is normal for a growing or new business, but
  unsustainable forever)?
- **Compare operating cash flow to net profit** over several periods. If
  operating cash flow is consistently and significantly lower than
  profit, that's often a sign of slow-paying customers (growing
  receivables) or an inventory build-up — worth investigating even
  though the income statement looks fine.
- **A negative total change in cash is not automatically bad** if it is
  driven by planned investment (buying equipment) funded by prior years'
  cash reserves. Likewise, **a positive total change in cash is not
  automatically good** if it only came from taking on new debt while
  operations burned cash.
- Because this report is built entirely from changes between two balance
  sheets plus one income statement, it can always be produced after the
  fact from data you already record through ordinary double-entry
  journal transactions — no separate "cash journal" is required.
