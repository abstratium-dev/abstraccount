# TODO

These TODOs are to be resolved by the developer, NOT THE LLM.

## Before Each Release

- upgrade all and check security issues in github
- update docs to describe the changes

## Today

- what is sql in 1.007 about?

- transactions can have comments between entries - add a test for this, then make sure the parser handles it properly.

        2024-01-01 * Opening Balances
            ; id:fdde1faa-b9b9-45cf-959b-122a39cf72a3
            ; Equity
            2 Passif / Equity:28 Capitaux propres (personnes morales) / Shareholders Equity (legal entities):280 Capital social ou capital de fondation / Basic, shareholder or foundation capital:2800 Capital-actions, capital social, capital de la fondation / Basic, shareholder or foundation capital                CHF 0.00
            2 Passif / Equity:290 Réserves, propres parts du capital et bénéfice ou perte résultant du bilan / Reserves and retained earnings, own capital shares and disposable profit:2970 Bénéfice reporté ou perte reportée / Profit carried forward or loss carried forward as negative item                CHF 0.00
            2 Passif / Equity:290 Réserves, propres parts du capital et bénéfice ou perte résultant du bilan / Reserves and retained earnings, own capital shares and disposable profit:2979 Bénéfice de l'exercice ou perte de l'exercice / Annual profit or loss as negative items                CHF 0.00
    >>>>    ; Assets
            1 Actifs / Assets:10 Actif circulants / Current Assets:100 Trésorerie / Cash and cash equivalents:1000 Caisse / Cash                CHF 0.00



- add an order number to the transactions, so that when we import, the order is respected. thats important so that bank transactions on the last day of the year occur before the closing of the accounts. don't display the number, but use it to sort the transactions. and show the index number of the array in the journal. that way there won't ever be gaps in what the user sees.

- Only ever use leaf nodes when selecting accounts
- Viewing journal of parent accounts includes children, because you can't book on a parent
- Show journal of transaction
- Show individual accounts with link from entry to the tx
- Reports based on templates
- Inputs based on macros
- Link to receipt documents
- add a skill to abstracore so that the llm can read the database (show tables, desc table, select * from table with limit)
- filters
  - date from, inclusive
  - date to, exclusive
  - partnerId
  - account name regex
  - account type
  - tx status
  - description, notes, etc.
  - amounts, from, to
  - tags
    - name, name=regex
  - not, and, or

## Tomorrow

- [ ] - Update README.md with project-specific information
- [ ] - Update DATABASE.md with project-specific information
- [ ] - Search for TODO and fix
- [ ] - Create favicon, store it in root as zip and put it in `src/main/webui/public`
- [ ] - Update database migration files
- [ ] - Update clear-test-db.sh


## Later (not yet necessary for initial release)

