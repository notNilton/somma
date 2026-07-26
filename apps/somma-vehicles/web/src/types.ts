export interface Vehicle {
  id: string
  user_id: string
  name: string
  license_plate: string
  brand: string
  model: string
  year: number
  tank_liters: number
  fuel_type: string
  odometer_km: number
  is_active: boolean
  created_at: string
  updated_at: string

  // Dynamic metrics
  total_spent_cents?: number
  total_refuelings?: number
  total_liters?: number
  avg_km_l?: number
  avg_cost_per_km?: number
}

export interface RefuelingLog {
  id: string
  vehicle_id: string
  transaction_id: string
  user_id: string
  date: string
  station: string
  fuel_type: string
  current_km: number
  liters: number
  price_per_liter_cents: number
  total_amount_cents: number
  is_full_tank: boolean
  notes: string
  created_at: string
  updated_at: string

  // Related info
  vehicle_name?: string
  license_plate?: string
  calculated_km_l?: number
  distance_since_last_km?: number
}

export interface CreateVehiclePayload {
  name: string
  license_plate: string
  brand: string
  model: string
  year: number
  tank_liters: number
  fuel_type: string
  odometer_km: number
}

export interface CreateRefuelingPayload {
  vehicle_id: string
  date: string
  station: string
  fuel_type: string
  current_km: number
  liters: number
  price_per_liter_cents: number
  total_amount_cents: number
  is_full_tank: boolean
  notes: string
}

export interface FuelPricePoint {
  date: string
  fuel_type: string
  price_per_liter_cents: number
  price_per_liter_reais: number
}

export interface VehicleSpendSummary {
  vehicle_id: string
  vehicle_name: string
  total_spent_cents: number
}

export interface AnalyticsSummary {
  total_spent_cents: number
  total_liters: number
  total_refuelings: number
  total_vehicles: number
  avg_km_l: number
  avg_cost_per_km: number
  price_history: FuelPricePoint[]
  vehicle_spend: VehicleSpendSummary[]
}
