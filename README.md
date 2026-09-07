# Somma

Personal finance management platform.

## Architecture

```
app/              React Native Mobile App (Expo Router)
backend/          Go API (Port 3300)
web/              React Frontend (Port 3400)
database/         PostgreSQL migrations & seeds
docker-compose.yml Docker orchestration
go.work           Go workspace config
Makefile          Development scripts
```

## Development

### Prerequisites

- Go 1.25+
- Node.js 22+ & pnpm / npm
- Docker / Podman

### Running Services

Start database, migrations, seeds and dev containers:

```bash
make up
```

### Service Endpoints

| Service | Type | Port | Endpoint |
|---------|------|------|----------|
| Web Frontend | React | `3400` | http://localhost:3400 |
| Backend API | Go | `3300` | http://localhost:3300 |
| Mobile App | React Native (Expo) | — | `app/` |
| PostgreSQL | Database | `5454` | localhost:5454/somma |
