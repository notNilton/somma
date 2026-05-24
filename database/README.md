# Database Layer

SQL migrations, seed data, and the standalone migration binary for tally'oh.

## Structure

- `migrations/` — versioned SQL migration files (up + down pairs)
- `seeds/` — seed scripts for local development
- `cmd/migrate/` — Go binary that applies migrations and seeds
- `database.go` — PostgreSQL connection helper

## Usage

### Migrations

Apply pending migrations:
```bash
go run ./database/cmd/migrate up
```

Revert one migration:
```bash
go run ./database/cmd/migrate down
```

Show current version:
```bash
go run ./database/cmd/migrate version
```

### Seeding

Full seed with sample transactions:
```bash
go run ./database/cmd/migrate seed-complete
```

Minimal seed (user only):
```bash
go run ./database/cmd/migrate seed-barebones
```

Via Makefile shortcuts:
```bash
make db-seed-complete
make db-seed-barebones
```

## Creating a Migration

1. Add `XXXXXX_description.up.sql` under `migrations/`.
2. Add `XXXXXX_description.down.sql` under `migrations/`.
3. Run `go run ./database/cmd/migrate up`.

Migration files run in numeric order. Always provide a matching `.down.sql` to keep rollbacks possible.
