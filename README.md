# Somma

Personal financial management and vehicle fleet management platform split into two integrated projects sharing the same PostgreSQL database.

---

## 🚀 Application Structure

The **Somma** ecosystem consists of two main parts:

### 1. `somma-expenses`
- **Description**: Complete personal financial management module (income, expenses, envelope budgets, categories, and analytics).
- **Backend**: Go (`net/http` + `pgx/v5`) — Port `3300`
- **Web**: React 19 + React Router v7 + Vite + TanStack Query — Port `3400`
- **Directory**: `apps/somma-expenses/`

### 2. `somma-vehicles`
- **Description**: Vehicle management and fuel refill log module (consumption calculation in km/L, cost per km, price history, and odometer tracking).
- **Backend**: Go (`net/http` + `pgx/v5`) — Port `3310`
- **Web**: React 19 + Vite + TailwindCSS + Lucide Icons — Port `3410`
- **Directory**: `apps/somma-vehicles/`

---

## 🎯 Key Feature: Shared Database & Automatic Sync

Both projects share the same PostgreSQL database (`somma`) as well as the user and JWT authentication tables.

### How integration works:
1. When you record a **Refueling Log** in `somma-vehicles` (providing liters, total cost, price per liter, station, and current odometer):
   - The entry is saved in the `refueling_logs` table.
   - An entry is **automatically** created in the `transactions` table with type `EXPENSE` and category `Fuel` (Combustível).
2. As soon as the refueling log is saved, it **immediately appears in `somma-expenses`** as a standard expense, updating financial charts and monthly balances!
3. If a refueling record is edited or deleted in `somma-vehicles`, the linked transaction in `somma-expenses` is automatically updated/deleted via `FOREIGN KEY ... ON DELETE CASCADE` constraints and atomic SQL transactions.

---

## 📁 Monorepo Structure

```
apps/
  somma-expenses/
    backend/          → Go API (Port 3300)
    web/              → React frontend (Port 3400)
  somma-vehicles/
    backend/          → Go API (Port 3310)
    web/              → React frontend (Port 3410)
  doc/                → OpenAPI specification + Swagger UI
database/
  migrations/         → Shared SQL migrations (vehicle and refueling tables in 000025)
  seeds/              → Initial seed scripts
  cmd/migrate/        → CLI migration tool
docker-compose.yml     → Orchestration of all 4 services + PostgreSQL database
go.work               → Shared Go workspaces referencing database module
```

---

## 🛠️ Local Development

### Prerequisites

- Go 1.25+
- Node.js 22+
- Docker or Podman

### Start All Services

```bash
make up
```

This command:
1. Starts the PostgreSQL container on port `5454`.
2. Runs automatic database migrations.
3. Applies the seed data (dev user, transactions, vehicles, and refuelings).
4. Launches APIs and frontends for `somma-expenses` and `somma-vehicles`.

---

## 🔌 Service Ports

| Service | Type | Port | Local URL |
|---------|------|------|-----------|
| **Expenses Web** | Frontend | `3400` | http://localhost:3400 |
| **Expenses API** | Backend | `3300` | http://localhost:3300 |
| **Vehicles Web** | Frontend | `3410` | http://localhost:3410 |
| **Vehicles API** | Backend | `3310` | http://localhost:3310 |
| **PostgreSQL** | Database | `5454` | `localhost:5454/somma` |
