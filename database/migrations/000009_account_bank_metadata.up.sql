-- Bank metadata to make transfer inference more precise
ALTER TABLE accounts
    ADD COLUMN bank_code VARCHAR(8),
    ADD COLUMN bank_agency VARCHAR(16);
