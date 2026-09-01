# Somma

Personal finance and vehicle fleet management platform split into two integrated modules sharing a PostgreSQL database.

## Architecture

```
apps/
  somma-expenses/
    app/              React Native Mobile App (Expo Router)
    backend/          Go API (Port 3300)
    web/              React Frontend (Port 3400)
  somma-vehicles/
    app/              React Native Mobile App (Expo Router)
    backend/          Go API (Port 3310)
    web/              React Frontend (Port 3410)
  doc/                OpenAPI specification and Swagger UI
database/
  migrations/         Shared PostgreSQL migrations
  seeds/              Seed data scripts
  cmd/migrate/        Database migration CLI
docker-compose.yml     Docker orchestration
go.work               Go workspace config
```

### Modules

- `somma-expenses`: Personal finance module (income, expenses, budgets, envelopes, categories, analytics & recurring engine).
- `somma-vehicles`: Vehicle and fuel refill log module (fleet management, consumption tracking, cost/km, odometer history).

### Shared Database Integration

Both modules connect to the same `somma` PostgreSQL database and share user authentication tables.
When a refueling log is saved in `somma-vehicles`, a corresponding transaction is automatically generated in `somma-expenses` under the `EXPENSE` type and `Fuel` category. Cascading deletes and foreign keys maintain synchronization across both services.

## Development

### Prerequisites

- Go 1.25+
- Node.js 22+ & pnpm / npm
- Docker / Podman

### Running Services

Start all containers, migrations, and seeds:

```bash
make up
```

### Service Endpoints

| Service | Type | Port | Endpoint |
|---------|------|------|----------|
| Expenses Web | Web Frontend | `3400` | http://localhost:3400 |
| Expenses API | Go Backend | `3300` | http://localhost:3300 |
| Expenses Mobile | React Native (Expo) | — | `apps/somma-expenses/app` |
| Vehicles Web | Web Frontend | `3410` | http://localhost:3410 |
| Vehicles API | Go Backend | `3310` | http://localhost:3310 |
| Vehicles Mobile | React Native (Expo) | — | `apps/somma-vehicles/app` |
| PostgreSQL | Database | `5454` | localhost:5454/somma |

## Documentation

- [📋 Roadmap & TODOs](docs/TODO.md) - Planned features and project roadmap
- [📐 Architecture](docs/ARCHITECTURE.md) - System architecture and components
