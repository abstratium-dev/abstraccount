-- Add account_order column to T_account table to track import order
ALTER TABLE T_account ADD COLUMN account_order INT;
