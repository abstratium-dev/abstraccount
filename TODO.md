# TODO

These TODOs are to be resolved by the developer, NOT THE LLM.

## Before Each Release

- upgrade all and check security issues in github
- update docs to describe the changes
- ensure coverage goal, esp. ui, is met

## Today

- macros: use account 4000 or 4200 when purchasing stuff that goes into stock

- mark which macros are as yet untested

- 2025 tax declr
  - bank statement
  - check bank statement matches balance sheet!
  - explaination and company statement
    - make note that things like monthly subscriptions are not pro rated since they are monthly and negligible for selling the company
  - add reports and journal
  - explain specialities
  - ask if my assumptions are correct
  - read book Compta2025v3.pdf
  - check list of what to do in which order
  - ensure certain tags are ignored for certain reports so that they can be regenerated even after closing

- add more links
  - each tag that is displayed should link to the journal with a filter
  - each partner that is displayed should link to the journal with a filter
  - each day that is displayed should link to the journal with a filter
- make backend calculate running total, so that other services could profit from that logic.
  - remove that logic from the ui
- accounts
  - add link to account, if it isn't the same number
  - header of ledger page should show parent accounts with links to them
- add a pivot table based on the entry search
- reports
  - configure which reports are added to the "reports bar" at the top, without having to be chosen from the dropdown, but simply clicked on.
  - account numbers shown in reports should use the standard format of displaying the parent account words at the start, and they should all be navigable so that the user can jump to the account ledger.
  - balance sheets - at least the swiss one shows zero net income for 2024 and 2025 which are closed years, so it should be showing no value
  - swiss income statement still not showing the individual accounts
  - filter still not working, eg. remove closing from 2025
  - swiss reports should include french and english, see specs in docs folder
  - trial balance still shows no revenue, even for 2026
  - the id of the selected report should be in the url so it can be shared and bookmarked
  - the reports page should listen to changes in the selected journal and if it changes, call "generate report"

- add a report that shows unpaid invoices

- year end taxes
  - 2024-12-31 * taxes based on equity tax (about 38 chf) and 15% of profit (0)
    ; YearEnd:TaxProvision
    8900    CHF  38.00
    2208    CHF -38.00
  - 2024-12-31
    ; Closing:
    2979    CHF  38.00
    8900    CHF -38.00
  - ; the following is when the bill arrived. we adjusted the provisional 38.00 to 38.10, and paid it 3 days later
  - 2025-03-28
    8900    CHF   0.10
    2208    CHF  38.00
    2208    CHF -38.10
  - 2025-03-31
    ; Payment:, invoice:PI00000030
    2208    CHF  38.10
    1020    CHF -38.10



- printing
  - reports need to hide filter and show title, logo and subtitle

- Link to receipt documents

- always sort tags alphabetically

- standardise filters
  - date from, inclusive
  - date to, exclusive
  - partnerId, partner name regex
  - account name regex
  - account type
  - tx status
  - description, notes, etc.
  - amounts, from, to
  - tags
    - name, name=regex, name as regex
  - not, and, or

## Tomorrow

- ebita report
- [ ] - Update README.md with project-specific information
- [ ] - Update DATABASE.md with project-specific information
- [ ] - Search for TODO and fix
- [ ] - Update clear-test-db.sh

- when adding new accounts, need to make sure that the user checks the reports, that they are added e.g. in the income statement, where the swiss template recommends it


## Later (not yet necessary for initial release)

- add a skill to abstracore so that the llm can read the database (show tables, desc table, select * from table with limit)
