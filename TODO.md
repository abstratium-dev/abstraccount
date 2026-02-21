# TODO

These TODOs are to be resolved by the developer, NOT THE LLM.

## Before Each Release

- upgrade all and check security issues in github
- update docs to describe the changes

## Today

- make backend calculate running total, so that other services could profit from that logic.
  - remove that logic from the ui
- accounts
  - add link to account, if it isn't the same number
  - show partner name after importing them
  - header of ledger page should show parent accounts with links to them
- journal
  - links to accounts aren't shown until the accounts are loaded

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

