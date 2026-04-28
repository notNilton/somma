-- Bank details to improve transfer inference
ALTER TABLE accounts
    ADD COLUMN bank_account_number VARCHAR(32);
