-- Create entry table
CREATE TABLE T_entry (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL,
    account_id VARCHAR(36) NOT NULL,
    commodity VARCHAR(10) NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    note VARCHAR(1000),
    entry_order INT NOT NULL,
    CONSTRAINT FK_entry_transaction FOREIGN KEY (transaction_id) REFERENCES T_transaction(id) ON DELETE CASCADE,
    CONSTRAINT FK_entry_account FOREIGN KEY (account_id) REFERENCES T_account(id) ON DELETE CASCADE
);

CREATE INDEX I_entry_account ON T_entry(account_id);
CREATE INDEX I_entry_transaction ON T_entry(transaction_id);
