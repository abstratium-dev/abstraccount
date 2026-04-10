-- Add transaction_order column to track transaction position within a date
-- Uses epoch milliseconds for single transactions, incremented for bulk imports
ALTER TABLE T_transaction ADD COLUMN transaction_order BIGINT;

-- Create index for efficient sorting
CREATE INDEX I_transaction_order ON T_transaction(transaction_date DESC, transaction_order DESC);
