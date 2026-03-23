package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nilbyte/mirante/backend-v2/internal/handlers"
	"gorm.io/gorm"
)

func Register(app *fiber.App, db *gorm.DB) {
	h := handlers.New(db)

	app.Get("/health", h.Health)

	v1 := app.Group("/api/v1")
	_ = v1 // rotas futuras aqui
}
