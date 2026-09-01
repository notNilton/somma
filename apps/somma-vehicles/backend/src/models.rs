use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Vehicle {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub license_plate: String,
    pub brand: String,
    pub model: String,
    pub year: i32,
    pub tank_liters: f64,
    pub fuel_type: String,
    pub odometer_km: f64,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub total_spent_cents: i64,
    #[serde(default)]
    pub total_refuelings: i64,
    #[serde(default)]
    pub total_liters: f64,
    #[serde(default)]
    pub avg_km_l: f64,
    #[serde(default)]
    pub avg_cost_per_km: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVehicleRequest {
    pub name: String,
    #[serde(default)]
    pub license_plate: Option<String>,
    #[serde(default)]
    pub brand: Option<String>,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub year: Option<i32>,
    #[serde(default)]
    pub tank_liters: Option<f64>,
    #[serde(default)]
    pub fuel_type: Option<String>,
    #[serde(default)]
    pub odometer_km: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVehicleRequest {
    pub name: String,
    #[serde(default)]
    pub license_plate: Option<String>,
    #[serde(default)]
    pub brand: Option<String>,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub year: Option<i32>,
    #[serde(default)]
    pub tank_liters: Option<f64>,
    #[serde(default)]
    pub fuel_type: Option<String>,
    #[serde(default)]
    pub odometer_km: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct RefuelingLog {
    pub id: Uuid,
    pub vehicle_id: Uuid,
    pub transaction_id: Option<Uuid>,
    pub user_id: Uuid,
    pub date: DateTime<Utc>,
    pub station: String,
    pub fuel_type: String,
    pub current_km: f64,
    pub liters: f64,
    pub price_per_liter_cents: i64,
    pub total_amount_cents: i64,
    pub is_full_tank: bool,
    pub notes: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    #[serde(default)]
    pub vehicle_name: String,
    #[serde(default)]
    pub license_plate: String,
    #[serde(default)]
    pub distance_since_last_km: f64,
    #[serde(default)]
    pub calculated_km_l: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRefuelingRequest {
    pub vehicle_id: Uuid,
    pub current_km: f64,
    pub liters: f64,
    #[serde(default)]
    pub price_per_liter_cents: i64,
    #[serde(default)]
    pub total_amount_cents: i64,
    pub fuel_type: String,
    #[serde(default)]
    pub station: Option<String>,
    #[serde(default)]
    pub date: Option<String>,
    #[serde(default)]
    pub is_full_tank: bool,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRefuelingRequest {
    pub current_km: f64,
    pub liters: f64,
    #[serde(default)]
    pub price_per_liter_cents: i64,
    #[serde(default)]
    pub total_amount_cents: i64,
    pub fuel_type: String,
    #[serde(default)]
    pub station: Option<String>,
    #[serde(default)]
    pub is_full_tank: bool,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VehicleSpendSummary {
    pub vehicle_id: Uuid,
    pub vehicle_name: String,
    pub total_spent_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FuelPricePoint {
    pub date: String,
    pub fuel_type: String,
    pub price_per_liter_cents: i64,
    pub price_per_liter_reais: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsSummary {
    pub total_spent_cents: i64,
    pub total_liters: f64,
    pub total_refuelings: i64,
    pub total_vehicles: i64,
    pub avg_km_l: f64,
    pub avg_cost_per_km: f64,
    pub price_history: Vec<FuelPricePoint>,
    pub vehicle_spend: Vec<VehicleSpendSummary>,
}
