package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
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

	case "seed":
		if err := runSeed(dbURL); err != nil {
			log.Fatalf("seed failed: %v", err)
		}
		fmt.Println("✅ Seed data applied")

	default:
		log.Fatalf("unknown command %q — use: up | down | drop | version | seed", command)
	}
}

func runSeed(dbURL string) error {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		return fmt.Errorf("connect failed: %v", err)
	}
	defer pool.Close()

	// Relative to binary or source
	migrationsPath := migrationsDir()
	seedPath := filepath.Join(filepath.Dir(migrationsPath), "seeds", "initial_seed.sql")

	content, err := os.ReadFile(seedPath)
	if err != nil {
		return fmt.Errorf("read seed file failed (%s): %v", seedPath, err)
	}

	_, err = pool.Exec(ctx, string(content))
	if err != nil {
		return fmt.Errorf("exec seed failed: %v", err)
	}

	return nil
}

func migrationsDir() string {
	if p := os.Getenv("MIGRATIONS_PATH"); p != "" {
		return p
	}

	_, filename, _, ok := runtime.Caller(0)
	if ok {
		// database/cmd/migrate/main.go -> ../../migrations
		root := filepath.Join(filepath.Dir(filename), "..", "..", "migrations")
		if _, err := os.Stat(root); err == nil {
			abs, _ := filepath.Abs(root)
			return abs
		}
	}

	return "./migrations"
}
