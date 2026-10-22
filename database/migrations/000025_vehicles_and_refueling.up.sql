-- ============================================================
-- Vehicles Table
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id            TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id       TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    license_plate VARCHAR(20),
    brand         VARCHAR(50),
    model         VARCHAR(50),
    year          INT,
    tank_liters   NUMERIC(10,2) DEFAULT 50.00,
    fuel_type     VARCHAR(50)  NOT NULL DEFAULT 'Gasolina',
    odometer_km   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Refueling Logs Table (Linked to transactions table)
-- ============================================================
CREATE TABLE IF NOT EXISTS refueling_logs (
    id                    TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    vehicle_id            TEXT          NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    transaction_id        TEXT          NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    user_id               TEXT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    station               VARCHAR(100),
    fuel_type             VARCHAR(50)   NOT NULL DEFAULT 'Gasolina',
    current_km            NUMERIC(10,2) NOT NULL,
    liters                NUMERIC(10,3) NOT NULL,
    price_per_liter_cents BIGINT        NOT NULL,
    total_amount_cents    BIGINT        NOT NULL,
    is_full_tank          BOOLEAN       NOT NULL DEFAULT TRUE,
    notes                 TEXT,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_refueling_logs_vehicle_id ON refueling_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_refueling_logs_user_id ON refueling_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_refueling_logs_date ON refueling_logs(date);
