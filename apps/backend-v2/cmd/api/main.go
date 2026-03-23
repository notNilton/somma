package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/nilbyte/mirante/backend-v2/internal/config"
	"github.com/nilbyte/mirante/backend-v2/internal/database"
	"github.com/nilbyte/mirante/backend-v2/internal/routes"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	app := fiber.New(fiber.Config{
		AppName: "Mirante API v2",
	})

	app.Use(recover.New())
	app.Use(logger.New())

	routes.Register(app, db)

	log.Printf("starting server on :%s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
