package models

import "time"

type Vehicle struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	Name         string    `json:"name"`
	LicensePlate string    `json:"license_plate"`
	Brand        string    `json:"brand"`
	Model        string    `json:"model"`
	Year         int       `json:"year"`
	TankLiters   float64   `json:"tank_liters"`
	FuelType     string    `json:"fuel_type"`
	OdometerKM   float64   `json:"odometer_km"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	// Summary metrics calculated dynamically
	TotalSpentCents int64   `json:"total_spent_cents,omitempty"`
	TotalRefuelings int     `json:"total_refuelings,omitempty"`
	TotalLiters     float64 `json:"total_liters,omitempty"`
	AvgKmL          float64 `json:"avg_km_l,omitempty"`
	AvgCostPerKM    float64 `json:"avg_cost_per_km,omitempty"`
}

type CreateVehicleRequest struct {
	Name         string  `json:"name"`
	LicensePlate string  `json:"license_plate"`
	Brand        string  `json:"brand"`
	Model        string  `json:"model"`
	Year         int     `json:"year"`
	TankLiters   float64 `json:"tank_liters"`
	FuelType     string  `json:"fuel_type"`
	OdometerKM   float64 `json:"odometer_km"`
}

type UpdateVehicleRequest struct {
	Name         string  `json:"name"`
	LicensePlate string  `json:"license_plate"`
	Brand        string  `json:"brand"`
	Model        string  `json:"model"`
	Year         int     `json:"year"`
	TankLiters   float64 `json:"tank_liters"`
	FuelType     string  `json:"fuel_type"`
	OdometerKM   float64 `json:"odometer_km"`
}

type RefuelingLog struct {
	ID                  string    `json:"id"`
	VehicleID           string    `json:"vehicle_id"`
	TransactionID       string    `json:"transaction_id"`
	UserID              string    `json:"user_id"`
	Date                time.Time `json:"date"`
	Station             string    `json:"station"`
	FuelType            string    `json:"fuel_type"`
	CurrentKM           float64   `json:"current_km"`
	Liters              float64   `json:"liters"`
	PricePerLiterCents  int64     `json:"price_per_liter_cents"`
	TotalAmountCents    int64     `json:"total_amount_cents"`
	IsFullTank          bool      `json:"is_full_tank"`
	Notes               string    `json:"notes"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`

	// Related info for frontend display
	VehicleName         string    `json:"vehicle_name,omitempty"`
	LicensePlate        string    `json:"license_plate,omitempty"`
	CalculatedKmL       float64   `json:"calculated_km_l,omitempty"`
	DistanceSinceLastKM float64   `json:"distance_since_last_km,omitempty"`
}

type CreateRefuelingRequest struct {
	VehicleID          string  `json:"vehicle_id"`
	Date               string  `json:"date"` // RFC3339 or ISO YYYY-MM-DD
	Station            string  `json:"station"`
	FuelType           string  `json:"fuel_type"`
	CurrentKM          float64 `json:"current_km"`
	Liters             float64 `json:"liters"`
	PricePerLiterCents int64   `json:"price_per_liter_cents"`
	TotalAmountCents   int64   `json:"total_amount_cents"`
	IsFullTank         bool    `json:"is_full_tank"`
	Notes              string  `json:"notes"`
}

type UpdateRefuelingRequest struct {
	Station            string  `json:"station"`
	FuelType           string  `json:"fuel_type"`
	CurrentKM          float64 `json:"current_km"`
	Liters             float64 `json:"liters"`
	PricePerLiterCents int64   `json:"price_per_liter_cents"`
	TotalAmountCents   int64   `json:"total_amount_cents"`
	IsFullTank         bool    `json:"is_full_tank"`
	Notes              string  `json:"notes"`
}

type FuelPricePoint struct {
	Date               string  `json:"date"`
	FuelType           string  `json:"fuel_type"`
	PricePerLiterCents int64   `json:"price_per_liter_cents"`
	PricePerLiterReais float64 `json:"price_per_liter_reais"`
}

type VehicleSpendSummary struct {
	VehicleID       string `json:"vehicle_id"`
	VehicleName     string `json:"vehicle_name"`
	TotalSpentCents int64  `json:"total_spent_cents"`
}

type AnalyticsSummary struct {
	TotalSpentCents int64                 `json:"total_spent_cents"`
	TotalLiters     float64               `json:"total_liters"`
	TotalRefuelings int                   `json:"total_refuelings"`
	TotalVehicles   int                   `json:"total_vehicles"`
	AvgKmL          float64               `json:"avg_km_l"`
	AvgCostPerKM    float64               `json:"avg_cost_per_km"`
	PriceHistory    []FuelPricePoint      `json:"price_history"`
	VehicleSpend    []VehicleSpendSummary `json:"vehicle_spend"`
}

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}
