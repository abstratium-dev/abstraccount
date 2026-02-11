-- Create transaction table
CREATE TABLE T_transaction (
    id VARCHAR(36) PRIMARY KEY,
    transaction_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    transaction_id VARCHAR(100),
    journal_id VARCHAR(36) NOT NULL,
    CONSTRAINT FK_transaction_journal FOREIGN KEY (journal_id) REFERENCES T_journal(id) ON DELETE CASCADE
);

CREATE INDEX I_transaction_date ON T_transaction(transaction_date);
CREATE INDEX I_transaction_id ON T_transaction(transaction_id);
CREATE INDEX I_transaction_journal ON T_transaction(journal_id);
