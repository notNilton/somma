package config

import "os"

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	Env         string
	WebappURL   string
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "3000"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		JWTSecret:   getEnv("JWT_SECRET", "changeme"),
		Env:         getEnv("ENV", "development"),
		WebappURL:   getEnv("WEBAPP_URL", "http://localhost:3400"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
