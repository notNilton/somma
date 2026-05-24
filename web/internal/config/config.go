package config

import "os"

type Config struct {
	Port   string
	APIURL string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3400"
	}
	apiURL := os.Getenv("API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:3300"
	}
	return &Config{Port: port, APIURL: apiURL}
}
