-- Create account table
CREATE TABLE T_account (
    id VARCHAR(36) PRIMARY KEY,
    account_name VARCHAR(500),
    type VARCHAR(20) NOT NULL,
    note VARCHAR(1000),
    parent_account_id VARCHAR(36),
    journal_id VARCHAR(36) NOT NULL,
    CONSTRAINT FK_account_journal FOREIGN KEY (journal_id) REFERENCES T_journal(id) ON DELETE CASCADE,
    CONSTRAINT FK_account_parent FOREIGN KEY (parent_account_id) REFERENCES T_account(id) ON DELETE CASCADE
);

CREATE INDEX I_account_name ON T_account(account_name);
CREATE INDEX I_account_journal ON T_account(journal_id);
CREATE INDEX I_account_parent ON T_account(parent_account_id);
