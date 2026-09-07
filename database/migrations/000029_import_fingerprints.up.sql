CREATE TABLE import_fingerprints (
    user_id        TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fingerprint    TEXT        NOT NULL,
    transaction_id TEXT        REFERENCES transactions(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, fingerprint)
);
