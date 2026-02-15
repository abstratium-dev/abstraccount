-- Add transaction_id column to T_transaction table for business identifier
ALTER TABLE T_transaction ADD COLUMN transaction_id VARCHAR(100);

CREATE INDEX I_transaction_transaction_id ON T_transaction(transaction_id);
