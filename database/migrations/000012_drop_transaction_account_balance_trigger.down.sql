CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.is_active = true AND NEW.status = 'COMPLETED' AND NEW.affects_account = true) THEN
            UPDATE accounts
            SET balance_cents = balance_cents + (CASE WHEN NEW.type = 'INCOME' THEN NEW.amount_cents ELSE -NEW.amount_cents END),
                updated_at = NOW()
            WHERE id = NEW.account_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.is_active = true AND OLD.status = 'COMPLETED' AND OLD.affects_account = true) THEN
            UPDATE accounts
            SET balance_cents = balance_cents - (CASE WHEN OLD.type = 'INCOME' THEN OLD.amount_cents ELSE -OLD.amount_cents END),
                updated_at = NOW()
            WHERE id = OLD.account_id;
        END IF;
        IF (NEW.is_active = true AND NEW.status = 'COMPLETED' AND NEW.affects_account = true) THEN
            UPDATE accounts
            SET balance_cents = balance_cents + (CASE WHEN NEW.type = 'INCOME' THEN NEW.amount_cents ELSE -NEW.amount_cents END),
                updated_at = NOW()
            WHERE id = NEW.account_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.is_active = true AND OLD.status = 'COMPLETED' AND OLD.affects_account = true) THEN
            UPDATE accounts
            SET balance_cents = balance_cents - (CASE WHEN OLD.type = 'INCOME' THEN OLD.amount_cents ELSE -OLD.amount_cents END),
                updated_at = NOW()
            WHERE id = OLD.account_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_account_balance
AFTER INSERT OR DELETE OR UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_account_balance();
