package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL not set")
	}

	command := "up"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	migrationsPath := migrationsDir()

	m, err := migrate.New("file://"+migrationsPath, dbURL)
	if err != nil {
		log.Fatalf("failed to load migrations from %s: %v", migrationsPath, err)
	}
	defer m.Close()

	switch command {
	case "up":
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			log.Fatalf("migration up failed: %v", err)
		}
		version, _, _ := m.Version()
		fmt.Printf("✅ Migrations applied (version %d)\n", version)

	case "down":
		if err := m.Steps(-1); err != nil {
			log.Fatalf("migration down failed: %v", err)
		}
		fmt.Println("✅ Rolled back 1 migration")

	case "drop":
		if err := m.Drop(); err != nil {
			log.Fatalf("drop failed: %v", err)
		}
		fmt.Println("✅ Database dropped")

	case "version":
		version, dirty, err := m.Version()
		if err != nil {
			log.Fatalf("failed to get version: %v", err)
		}
		fmt.Printf("version: %d, dirty: %v\n", version, dirty)

	default:
		log.Fatalf("unknown command %q — use: up | down | drop | version", command)
	}
}

// migrationsDir resolve o path para database/migrations/
// funciona tanto em go run ./cmd/migrate quanto no binário compilado no Docker.
func migrationsDir() string {
	// 1. Variável de ambiente explícita (Docker/CI)
	if p := os.Getenv("MIGRATIONS_PATH"); p != "" {
		return p
	}

	// 2. Relativo ao arquivo-fonte (desenvolvimento local com go run)
	_, filename, _, ok := runtime.Caller(0)
	if ok {
		// apps/backend/cmd/migrate/main.go → ../../.. → raiz → database/migrations
		root := filepath.Join(filepath.Dir(filename), "..", "..", "..", "..")
		candidate := filepath.Join(root, "database", "migrations")
		if _, err := os.Stat(candidate); err == nil {
			abs, _ := filepath.Abs(candidate)
			return abs
		}
	}

	// 3. Relativo ao binário compilado (assumindo que está em /app)
	return "/database/migrations"
}
