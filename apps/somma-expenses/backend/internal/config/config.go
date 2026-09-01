package config

import (
	"fmt"
	"log"
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	Env         string
	WebappURL   string
}

func Load() *Config {
	jwtSecret := requireEnv("JWT_SECRET")
	if len(jwtSecret) < 32 {
		log.Fatal("JWT_SECRET must be at least 32 characters")
	}

	cfg := &Config{
		Port:        getEnv("PORT", "3300"),
		DatabaseURL: requireEnv("DATABASE_URL"),
		JWTSecret:   jwtSecret,
		Env:         getEnv("ENV", "development"),
		WebappURL:   getEnv("WEBAPP_URL", "http://localhost:3400"),
	}
	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("%s is required", key)
	}
	return v
}

// IsProduction returns true when running in production environment.
func (c *Config) IsProduction() bool {
	return c.Env == "production"
}

func init() {
	// Suppress "imported and not used" for fmt during development
	_ = fmt.Sprintf
}
