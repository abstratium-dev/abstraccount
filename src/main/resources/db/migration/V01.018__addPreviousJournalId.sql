-- Add previous_journal_id to T_journal to support ordered journal history.
-- Nullable: the first journal in a sequence has no predecessor.
ALTER TABLE T_journal ADD COLUMN previous_journal_id VARCHAR(36) NULL;
ALTER TABLE T_journal ADD CONSTRAINT FK_journal_previous_journal FOREIGN KEY (previous_journal_id) REFERENCES T_journal(id) ON DELETE SET NULL;
