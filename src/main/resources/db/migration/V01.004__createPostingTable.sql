-- Create posting table
CREATE TABLE T_posting (
    id VARCHAR(36) PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    commodity VARCHAR(10) NOT NULL,
    amount DECIMAL(19, 4) NOT NULL,
    note VARCHAR(1000),
    posting_order INT NOT NULL,
    CONSTRAINT FK_posting_transaction FOREIGN KEY (transaction_id) REFERENCES T_transaction(id) ON DELETE CASCADE
);

CREATE INDEX I_posting_account ON T_posting(account_number);
