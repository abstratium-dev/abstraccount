# TODO

These TODOs are to be resolved by the developer, NOT THE LLM.

## Before Each Release

- upgrade all and check security issues in github
- update docs to describe the changes

## Today

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
  - they need to be printable
  - account numbers shown in reports should use the standard format of displaying the parent account words at the start, and they should all be navigable so that the user can jump to the account ledger.
  - balance sheets - at least the swiss one shows zero net income for 2024 and 2025 which are closed years, so it should be showing no value
  - swiss income statement still not showing the individual accounts
  - filter still not working, eg. remove closing from 2025
  - swiss reports should include french and english, see specs in docs folder
  - trial balance still shows no revenue, even for 2026
  - the id of the selected report should be in the url so it can be shared and bookmarked
  - the reports page should listen to changes in the selected journal and if it changes, call "generate report"

- printing
  - journal page should make it clearer what each transaction is, and not print the header, but add a date/time field

- Inputs based on macros

- Link to receipt documents

- add a skill to abstracore so that the llm can read the database (show tables, desc table, select * from table with limit)

- filters
  - date from, inclusive
  - date to, exclusive
  - partnerId, partner name regex
  - account name regex
  - account type
  - tx status
  - description, notes, etc.
  - amounts, from, to
  - tags
    - name, name=regex
  - not, and, or

## Tomorrow

- ebita report
- report that mirrors vaud tax return
- [ ] - Update README.md with project-specific information
- [ ] - Update DATABASE.md with project-specific information
- [ ] - Search for TODO and fix
- [ ] - Create favicon, store it in root as zip and put it in `src/main/webui/public`
- [ ] - Update database migration files
- [ ] - Update clear-test-db.sh

- when adding new accounts, need to make sure that the user checks the reports, that they are added e.g. in the income statement, where the swiss template recommends it


## Later (not yet necessary for initial release)

