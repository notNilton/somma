package models

import "time"

type Vehicle struct {
	ID           string
	UserID       string
	Name         string
	LicensePlate *string
	Brand        *string
	Model        *string
	Year         *int
	Tank         *float64
	IsActive     bool
	DeletedAt    *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type RefuelingLog struct {
	ID              string
	VehicleID       string
	TransactionID   string
	Station         *string
	FuelType        string
	CurrentKm       *float64
	Liters          *float64
	PricePerLiterCents *int64
	CreatedAt       time.Time
	UpdatedAt       time.Time
}
