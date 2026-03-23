package handlers

import (
	"github.com/gofiber/fiber/v2"
)

type healthResponse struct {
	Status   string `json:"status"`
	Database string `json:"database"`
	Version  string `json:"version"`
}

func (h *Handler) Health(c *fiber.Ctx) error {
	dbStatus := "connected"

	sqlDB, err := h.db.DB()
	if err != nil || sqlDB.Ping() != nil {
		dbStatus = "disconnected"
	}

	status := fiber.StatusOK
	if dbStatus == "disconnected" {
		status = fiber.StatusServiceUnavailable
	}

	return c.Status(status).JSON(healthResponse{
		Status:   "ok",
		Database: dbStatus,
		Version:  "2.0.0",
	})
}
