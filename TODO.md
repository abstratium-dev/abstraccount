# TODO

These TODOs are to be resolved by the developer, NOT THE LLM.

## Before Each Release

- upgrade all and check security issues in github
- update docs to describe the changes

## Today

- improve onboarding - it's aweful at the moment. e.g.
  - create a journal if none is found
  - when reimporting, offer to delete same named journals

- check duty of care 754.   Personal liability for directors — While shareholders are protected, directors/gérants of an Sàrl can face personal liability if they breach their duty of care (CO Art. 754) toward the company. But that's unrelated to your TOS; it's about how you run the company internally.
  - check gemini response

- add multi-tenancy

- add envers

- bug: does adding new year copy the account descriptions?
  - llm says no bug but why is 2026 empty?

- bug: light mode: menu on left of screen for year end etc. isn't really visible.

- is this statement too bold? "Built on Swiss GAAP FER standards."

- convert some modules to lazy

- 2025 tax declr
  - bank statement
  - check bank statement matches balance sheet!
  - explaination and company statement
    - make note that things like monthly subscriptions are not pro rated since they are monthly and negligible for selling the company (and too small for accrural accounting)
  - add reports and journal
  - translate the tax help page and put it in the wiki: http://vd.ch/index.php?id=2023786#c2112404
  - ask if my assumptions are correct: https://prestations.vd.ch/pub/101529
  - check list of what to do in which order

- year end taxes - use this for the macro and test it
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


- finish e2e tests
  - add testing of filters
  - add testing of entries (pivot)
- write user guide
- link the EQL docs to the user guide
- deploy to test and prod


## Tomorrow

- make backend calculate running total, so that other services could profit from that logic.
  - remove that logic from the ui

- add a report that shows unpaid purchase invoices

- macros
  - add a macro for purchasing something for manufacturing (4000)

    2025-09-01 * P00000018 Galaxus | 3d filament for akdg housing. 2025-09-01 galaxus Bestellung 158001158.pdf / Galaxus_Kaufbeleg_158001158.pdf
        ; invoice:PI00000048
        1:10:120:1200 Inventory of hardware and components                         CHF  20.17
        4:4000:4000 Purchases of raw materials and components for manufacturing    CHF  20.17
        4:4000:4000 Purchases of raw materials and components for manufacturing    CHF -20.17
        2:20:220:2210:2210.001 Anton Kutschera                                     CHF -20.17

  - add a macro for purchasing something for resale (4200)

    2025-09-11 * P00000020 Digitec | loudspeaker 175.00, usb key for backup 30.70 and usb adapter for esp32 8.36. 20250911 Digitec_Kaufbeleg_159132501.pdf
        ; invoice:PI00000055
        1:150 Movable tangible fixed assets        CHF  175.00
        1:150 Movable tangible fixed assets        CHF  30.70
        1:1230 Goods held for resale               CHF  8.36
        4:4200 Purchases of goods for resale       CHF  8.36
        4:4200 Purchases of goods for resale       CHF -8.36
        2:2210.001 Anton Kutschera                 CHF -214.06

- Link to receipt documents
- reports
  - configure which reports are added to the "reports bar" at the top, without having to be chosen from the dropdown, but simply clicked on.

- ability to edit and manage macros
- ability to edit and manage reports
- ebita report
- [ ] - Update README.md with project-specific information
- [ ] - Update DATABASE.md with project-specific information
- [ ] - Search for TODO and fix
- [ ] - Update clear-test-db.sh

- when adding new accounts, need to make sure that the user checks the reports, that they are added e.g. in the income statement, where the swiss template recommends it


## Later (not yet necessary for initial release)

- add a skill to abstracore so that the llm can read the database (show tables, desc table, select * from table with limit)
