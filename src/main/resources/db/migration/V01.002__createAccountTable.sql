-- Create account table
CREATE TABLE T_account (
    id VARCHAR(36) PRIMARY KEY,
    account_number VARCHAR(50) NOT NULL,
    full_name VARCHAR(500) NOT NULL,
    type VARCHAR(20) NOT NULL,
    note VARCHAR(1000),
    parent_account_number VARCHAR(50),
    journal_id VARCHAR(36) NOT NULL,
    CONSTRAINT IU_account_number_journal UNIQUE (account_number, journal_id),
    CONSTRAINT IU_account_full_name_journal UNIQUE (full_name, journal_id),
    CONSTRAINT FK_account_journal FOREIGN KEY (journal_id) REFERENCES T_journal(id) ON DELETE CASCADE
);

CREATE INDEX I_account_number ON T_account(account_number);
CREATE INDEX I_account_full_name ON T_account(full_name);
CREATE INDEX I_account_journal ON T_account(journal_id);
