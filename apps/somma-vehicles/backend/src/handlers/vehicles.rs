use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use somma_common::{created_json, error_response, ok_json, AuthClaims};
use sqlx::Row;
use uuid::Uuid;

use crate::models::{CreateVehicleRequest, UpdateVehicleRequest, Vehicle};
use crate::AppState;

pub async fn list_vehicles(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let rows = match sqlx::query(
        r#"
        SELECT 
            v.id, v.user_id, v.name, v.license_plate, v.brand, v.model, 
            v.year, v.tank_liters, v.fuel_type, v.odometer_km, v.is_active, v.created_at, v.updated_at,
            COALESCE(SUM(r.total_amount_cents), 0)::bigint as total_spent,
            COUNT(r.id)::bigint as total_refuelings,
            COALESCE(SUM(r.liters), 0)::float8 as total_liters
        FROM vehicles v
        LEFT JOIN refueling_logs r ON v.id = r.vehicle_id
        WHERE v.user_id = $1 AND v.is_active = TRUE
        GROUP BY v.id
        ORDER BY v.created_at DESC
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&state.db)
    .await
    {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("database error: {}", e)),
    };

    let mut vehicles = Vec::with_capacity(rows.len());

    for r in rows {
        let v_id: Uuid = r.get("id");
        let total_spent: i64 = r.try_get("total_spent").unwrap_or(0);
        let total_refuelings: i64 = r.try_get("total_refuelings").unwrap_or(0);
        let total_liters: f64 = r.try_get("total_liters").unwrap_or(0.0);

        let mut avg_km_l = 0.0;
        let mut avg_cost_per_km = 0.0;

        if total_refuelings > 1 && total_liters > 0.0 {
            if let Ok(range_row) = sqlx::query(
                r#"
                SELECT COALESCE(MIN(current_km), 0)::float8 as min_km, COALESCE(MAX(current_km), 0)::float8 as max_km
                FROM refueling_logs
                WHERE vehicle_id = $1
                "#,
            )
            .bind(v_id)
            .fetch_one(&state.db)
            .await
            {
                let min_km: f64 = range_row.try_get("min_km").unwrap_or(0.0);
                let max_km: f64 = range_row.try_get("max_km").unwrap_or(0.0);
                let distance = max_km - min_km;
                if distance > 0.0 {
                    avg_km_l = distance / total_liters;
                    avg_cost_per_km = (total_spent as f64 / 100.0) / distance;
                }
            }
        }

        vehicles.push(Vehicle {
            id: v_id,
            user_id: r.get("user_id"),
            name: r.get("name"),
            license_plate: r.try_get("license_plate").unwrap_or_default(),
            brand: r.try_get("brand").unwrap_or_default(),
            model: r.try_get("model").unwrap_or_default(),
            year: r.try_get("year").unwrap_or(0),
            tank_liters: r.get("tank_liters"),
            fuel_type: r.get("fuel_type"),
            odometer_km: r.get("odometer_km"),
            is_active: r.get("is_active"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
            total_spent_cents: total_spent,
            total_refuelings,
            total_liters,
            avg_km_l,
            avg_cost_per_km,
        });
    }

    ok_json(vehicles)
}

pub async fn create_vehicle(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(req): Json<CreateVehicleRequest>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let name = req.name.trim();
    if name.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "vehicle name is required");
    }

    let tank_liters = if req.tank_liters.unwrap_or(0.0) <= 0.0 { 50.0 } else { req.tank_liters.unwrap() };
    let fuel_type = req.fuel_type.unwrap_or_else(|| "Gasolina".to_string());
    let odometer_km = req.odometer_km.unwrap_or(0.0);
    let year = req.year.unwrap_or(0);

    let row = match sqlx::query(
        r#"
        INSERT INTO vehicles (user_id, name, license_plate, brand, model, year, tank_liters, fuel_type, odometer_km)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, user_id, name, license_plate, brand, model, year, tank_liters, fuel_type, odometer_km, is_active, created_at, updated_at
        "#,
    )
    .bind(user_uuid)
    .bind(name)
    .bind(req.license_plate)
    .bind(req.brand)
    .bind(req.model)
    .bind(year)
    .bind(tank_liters)
    .bind(fuel_type)
    .bind(odometer_km)
    .fetch_one(&state.db)
    .await
    {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("failed to create vehicle: {}", e)),
    };

    let v = Vehicle {
        id: row.get("id"),
        user_id: row.get("user_id"),
        name: row.get("name"),
        license_plate: row.try_get("license_plate").unwrap_or_default(),
        brand: row.try_get("brand").unwrap_or_default(),
        model: row.try_get("model").unwrap_or_default(),
        year: row.try_get("year").unwrap_or(0),
        tank_liters: row.get("tank_liters"),
        fuel_type: row.get("fuel_type"),
        odometer_km: row.get("odometer_km"),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        total_spent_cents: 0,
        total_refuelings: 0,
        total_liters: 0.0,
        avg_km_l: 0.0,
        avg_cost_per_km: 0.0,
    };

    created_json(v)
}

pub async fn get_vehicle(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let row = match sqlx::query(
        r#"
        SELECT 
            v.id, v.user_id, v.name, v.license_plate, v.brand, v.model, 
            v.year, v.tank_liters, v.fuel_type, v.odometer_km, v.is_active, v.created_at, v.updated_at,
            COALESCE(SUM(r.total_amount_cents), 0)::bigint as total_spent,
            COUNT(r.id)::bigint as total_refuelings,
            COALESCE(SUM(r.liters), 0)::float8 as total_liters
        FROM vehicles v
        LEFT JOIN refueling_logs r ON v.id = r.vehicle_id
        WHERE v.id = $1 AND v.user_id = $2
        GROUP BY v.id
        "#,
    )
    .bind(id)
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "vehicle not found"),
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("database error: {}", e)),
    };

    let total_spent: i64 = row.try_get("total_spent").unwrap_or(0);
    let total_refuelings: i64 = row.try_get("total_refuelings").unwrap_or(0);
    let total_liters: f64 = row.try_get("total_liters").unwrap_or(0.0);

    let mut avg_km_l = 0.0;
    let mut avg_cost_per_km = 0.0;

    if total_refuelings > 1 && total_liters > 0.0 {
        if let Ok(range_row) = sqlx::query(
            r#"
            SELECT COALESCE(MIN(current_km), 0)::float8 as min_km, COALESCE(MAX(current_km), 0)::float8 as max_km
            FROM refueling_logs
            WHERE vehicle_id = $1
            "#,
        )
        .bind(id)
        .fetch_one(&state.db)
        .await
        {
            let min_km: f64 = range_row.try_get("min_km").unwrap_or(0.0);
            let max_km: f64 = range_row.try_get("max_km").unwrap_or(0.0);
            let distance = max_km - min_km;
            if distance > 0.0 {
                avg_km_l = distance / total_liters;
                avg_cost_per_km = (total_spent as f64 / 100.0) / distance;
            }
        }
    }

    let v = Vehicle {
        id: row.get("id"),
        user_id: row.get("user_id"),
        name: row.get("name"),
        license_plate: row.try_get("license_plate").unwrap_or_default(),
        brand: row.try_get("brand").unwrap_or_default(),
        model: row.try_get("model").unwrap_or_default(),
        year: row.try_get("year").unwrap_or(0),
        tank_liters: row.get("tank_liters"),
        fuel_type: row.get("fuel_type"),
        odometer_km: row.get("odometer_km"),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        total_spent_cents: total_spent,
        total_refuelings,
        total_liters,
        avg_km_l,
        avg_cost_per_km,
    };

    ok_json(v)
}

pub async fn update_vehicle(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateVehicleRequest>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let row = match sqlx::query(
        r#"
        UPDATE vehicles
        SET name = $1, license_plate = $2, brand = $3, model = $4, year = $5, tank_liters = $6, fuel_type = $7, odometer_km = $8, updated_at = NOW()
        WHERE id = $9 AND user_id = $10
        RETURNING id, user_id, name, license_plate, brand, model, year, tank_liters, fuel_type, odometer_km, is_active, created_at, updated_at
        "#,
    )
    .bind(req.name)
    .bind(req.license_plate)
    .bind(req.brand)
    .bind(req.model)
    .bind(req.year.unwrap_or(0))
    .bind(req.tank_liters.unwrap_or(50.0))
    .bind(req.fuel_type.unwrap_or_else(|| "Gasolina".to_string()))
    .bind(req.odometer_km.unwrap_or(0.0))
    .bind(id)
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "vehicle not found"),
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("failed to update vehicle: {}", e)),
    };

    let v = Vehicle {
        id: row.get("id"),
        user_id: row.get("user_id"),
        name: row.get("name"),
        license_plate: row.try_get("license_plate").unwrap_or_default(),
        brand: row.try_get("brand").unwrap_or_default(),
        model: row.try_get("model").unwrap_or_default(),
        year: row.try_get("year").unwrap_or(0),
        tank_liters: row.get("tank_liters"),
        fuel_type: row.get("fuel_type"),
        odometer_km: row.get("odometer_km"),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        total_spent_cents: 0,
        total_refuelings: 0,
        total_liters: 0.0,
        avg_km_l: 0.0,
        avg_cost_per_km: 0.0,
    };

    ok_json(v)
}

pub async fn delete_vehicle(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    match sqlx::query("DELETE FROM vehicles WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_uuid)
        .execute(&state.db)
        .await
    {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("failed to delete vehicle: {}", e)),
    }
}
