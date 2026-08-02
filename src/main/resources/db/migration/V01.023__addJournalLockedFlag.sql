-- Add a "locked" flag to T_journal so that closed periods can be protected
-- from further changes (transactions, accounts, macros, etc.).
-- Defaults to FALSE so existing journals remain editable until explicitly locked.
ALTER TABLE T_journal ADD COLUMN locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Mirror the new column in the Envers audit table so journal revisions
-- capture the locked state alongside the rest of the row.
ALTER TABLE T_journal_AUD ADD COLUMN locked BOOLEAN;
