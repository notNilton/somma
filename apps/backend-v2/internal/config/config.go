package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DatabaseURL string
	Env         string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, using environment variables")
	}

	return &Config{
		Port:        getEnv("PORT", "3000"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		Env:         getEnv("NODE_ENV", "development"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
