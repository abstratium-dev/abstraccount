-- Remove the redundant transaction_id column from T_transaction.
-- The primary key (id) now serves as the business identifier; when a journal file
-- specifies "; id: <uuid>" that value is used directly as the primary key.
DROP INDEX I_transaction_transaction_id ON T_transaction;
ALTER TABLE T_transaction DROP COLUMN transaction_id;
