use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use somma_common::{created_json, error_response, ok_json, AuthClaims};
use sqlx::Row;
use uuid::Uuid;

use crate::models::{CreateRefuelingRequest, RefuelingLog, UpdateRefuelingRequest};
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct ListRefuelingsQuery {
    pub vehicle_id: Option<Uuid>,
}

pub async fn list_refuelings(
    State(state): State<AppState>,
    claims: AuthClaims,
    Query(params): Query<ListRefuelingsQuery>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let mut query = String::from(
        r#"
        WITH ordered_logs AS (
            SELECT 
                r.id, r.vehicle_id, r.transaction_id, r.user_id, r.date, 
                r.station, r.fuel_type, r.current_km, r.liters, 
                r.price_per_liter_cents, r.total_amount_cents, r.is_full_tank, r.notes, 
                r.created_at, r.updated_at,
                v.name as vehicle_name, v.license_plate,
                LAG(r.current_km) OVER (PARTITION BY r.vehicle_id ORDER BY r.date ASC, r.current_km ASC) as prev_km
            FROM refueling_logs r
            JOIN vehicles v ON r.vehicle_id = v.id
            WHERE r.user_id = $1
        "#,
    );

    if params.vehicle_id.is_some() {
        query.push_str(" AND r.vehicle_id = $2");
    }

    query.push_str(
        r#"
        )
        SELECT 
            id, vehicle_id, transaction_id, user_id, date, 
            station, fuel_type, current_km, liters, 
            price_per_liter_cents, total_amount_cents, is_full_tank, notes, 
            created_at, updated_at, vehicle_name, license_plate,
            COALESCE(CASE WHEN prev_km IS NOT NULL AND current_km > prev_km THEN current_km - prev_km ELSE 0 END, 0)::float8 as distance_since_last_km,
            COALESCE(CASE WHEN prev_km IS NOT NULL AND current_km > prev_km AND liters > 0 THEN (current_km - prev_km) / liters ELSE 0 END, 0)::float8 as calculated_km_l
        FROM ordered_logs
        ORDER BY date DESC, current_km DESC
        "#,
    );

    let mut q = sqlx::query(&query).bind(user_uuid);
    if let Some(v_id) = params.vehicle_id {
        q = q.bind(v_id);
    }

    let rows = match q.fetch_all(&state.db).await {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("database error: {}", e)),
    };

    let logs: Vec<RefuelingLog> = rows
        .into_iter()
        .map(|r| RefuelingLog {
            id: r.get("id"),
            vehicle_id: r.get("vehicle_id"),
            transaction_id: r.try_get("transaction_id").ok(),
            user_id: r.get("user_id"),
            date: r.get("date"),
            station: r.try_get("station").unwrap_or_default(),
            fuel_type: r.get("fuel_type"),
            current_km: r.get("current_km"),
            liters: r.get("liters"),
            price_per_liter_cents: r.get("price_per_liter_cents"),
            total_amount_cents: r.get("total_amount_cents"),
            is_full_tank: r.get("is_full_tank"),
            notes: r.try_get("notes").unwrap_or_default(),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
            vehicle_name: r.get("vehicle_name"),
            license_plate: r.try_get("license_plate").unwrap_or_default(),
            distance_since_last_km: r.try_get("distance_since_last_km").unwrap_or(0.0),
            calculated_km_l: r.try_get("calculated_km_l").unwrap_or(0.0),
        })
        .collect();

    ok_json(logs)
}

pub async fn create_refueling(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(req): Json<CreateRefuelingRequest>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    if req.liters <= 0.0 {
        return error_response(StatusCode::BAD_REQUEST, "liters must be greater than 0");
    }

    let mut total_amount_cents = req.total_amount_cents;
    if total_amount_cents <= 0 && req.price_per_liter_cents > 0 {
        total_amount_cents = (req.price_per_liter_cents as f64 * req.liters).round() as i64;
    }

    let refuel_date = if let Some(ref d) = req.date {
        if let Ok(parsed) = DateTime::parse_from_rfc3339(d) {
            parsed.with_timezone(&Utc)
        } else if let Ok(naive) = chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d") {
            DateTime::<Utc>::from_naive_utc_and_offset(naive.and_hms_opt(12, 0, 0).unwrap(), Utc)
        } else {
            Utc::now()
        }
    } else {
        Utc::now()
    };

    let mut tx = match state.db.begin().await {
        Ok(t) => t,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("db error: {}", e)),
    };

    // 1. Check vehicle
    let vehicle_row = match sqlx::query("SELECT name FROM vehicles WHERE id = $1 AND user_id = $2")
        .bind(req.vehicle_id)
        .bind(user_uuid)
        .fetch_optional(&mut *tx)
        .await
    {
        Ok(Some(v)) => v,
        Ok(None) => return error_response(StatusCode::BAD_REQUEST, "vehicle not found or access denied"),
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("db error: {}", e)),
    };
    let vehicle_name: String = vehicle_row.get("name");

    // 2. Category
    let category_row = sqlx::query("SELECT id FROM categories WHERE user_id = $1 AND name IN ('Combustível', 'Veículos') AND type = 'EXPENSE' LIMIT 1")
        .bind(user_uuid)
        .fetch_optional(&mut *tx)
        .await;

    let category_id: Uuid = match category_row {
        Ok(Some(row)) => row.get("id"),
        _ => {
            match sqlx::query(
                r#"
                INSERT INTO categories (user_id, name, type, description, color)
                VALUES ($1, 'Combustível', 'EXPENSE', 'Gastos com combustível e veículos', '#0284c7')
                RETURNING id
                "#,
            )
            .bind(user_uuid)
            .fetch_one(&mut *tx)
            .await
            {
                Ok(new_row) => new_row.get("id"),
                Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("failed to create category: {}", e)),
            }
        }
    };

    // 3. Transactions table
    let station_str = req.station.as_deref().unwrap_or("");
    let tx_description = if !station_str.is_empty() {
        format!("Abastecimento: {} ({:.1}L) - {}", vehicle_name, req.liters, station_str)
    } else {
        format!("Abastecimento: {} ({:.1}L)", vehicle_name, req.liters)
    };

    let tx_row = match sqlx::query(
        r#"
        INSERT INTO transactions (
            user_id, category_id, type, kind, status,
            amount_cents, date, description, notes, currency_code, is_active
        )
        VALUES ($1, $2, 'EXPENSE', 'EXPENSE', 'COMPLETED', $3, $4, $5, $6, 'BRL', TRUE)
        RETURNING id
        "#,
    )
    .bind(user_uuid)
    .bind(category_id)
    .bind(total_amount_cents)
    .bind(refuel_date)
    .bind(tx_description)
    .bind(req.notes.as_deref())
    .fetch_one(&mut *tx)
    .await
    {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("failed to create linked tx: {}", e)),
    };
    let tx_id: Uuid = tx_row.get("id");

    // 4. Refueling log
    let log_row = match sqlx::query(
        r#"
        INSERT INTO refueling_logs (
            vehicle_id, transaction_id, user_id, date, station, fuel_type,
            current_km, liters, price_per_liter_cents, total_amount_cents, is_full_tank, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, vehicle_id, transaction_id, user_id, date, station, fuel_type,
                  current_km, liters, price_per_liter_cents, total_amount_cents, is_full_tank, notes,
                  created_at, updated_at
        "#,
    )
    .bind(req.vehicle_id)
    .bind(tx_id)
    .bind(user_uuid)
    .bind(refuel_date)
    .bind(req.station)
    .bind(req.fuel_type)
    .bind(req.current_km)
    .bind(req.liters)
    .bind(req.price_per_liter_cents)
    .bind(total_amount_cents)
    .bind(req.is_full_tank)
    .bind(req.notes)
    .fetch_one(&mut *tx)
    .await
    {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("failed to insert log: {}", e)),
    };

    // 5. Update vehicle odometer
    let _ = sqlx::query("UPDATE vehicles SET odometer_km = GREATEST(odometer_km, $1), updated_at = NOW() WHERE id = $2")
        .bind(req.current_km)
        .bind(req.vehicle_id)
        .execute(&mut *tx)
        .await;

    if let Err(e) = tx.commit().await {
        return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("commit error: {}", e));
    }

    let log = RefuelingLog {
        id: log_row.get("id"),
        vehicle_id: log_row.get("vehicle_id"),
        transaction_id: log_row.try_get("transaction_id").ok(),
        user_id: log_row.get("user_id"),
        date: log_row.get("date"),
        station: log_row.try_get("station").unwrap_or_default(),
        fuel_type: log_row.get("fuel_type"),
        current_km: log_row.get("current_km"),
        liters: log_row.get("liters"),
        price_per_liter_cents: log_row.get("price_per_liter_cents"),
        total_amount_cents: log_row.get("total_amount_cents"),
        is_full_tank: log_row.get("is_full_tank"),
        notes: log_row.try_get("notes").unwrap_or_default(),
        created_at: log_row.get("created_at"),
        updated_at: log_row.get("updated_at"),
        vehicle_name,
        license_plate: String::new(),
        distance_since_last_km: 0.0,
        calculated_km_l: 0.0,
    };

    created_json(log)
}

pub async fn update_refueling(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateRefuelingRequest>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let mut tx = match state.db.begin().await {
        Ok(t) => t,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("db error: {}", e)),
    };

    let log_row = match sqlx::query(
        r#"
        UPDATE refueling_logs
        SET station = $1, fuel_type = $2, current_km = $3, liters = $4,
            price_per_liter_cents = $5, total_amount_cents = $6, is_full_tank = $7, notes = $8, updated_at = NOW()
        WHERE id = $9 AND user_id = $10
        RETURNING id, vehicle_id, transaction_id, user_id, date, station, fuel_type,
                  current_km, liters, price_per_liter_cents, total_amount_cents, is_full_tank, notes,
                  created_at, updated_at
        "#,
    )
    .bind(req.station)
    .bind(req.fuel_type)
    .bind(req.current_km)
    .bind(req.liters)
    .bind(req.price_per_liter_cents)
    .bind(req.total_amount_cents)
    .bind(req.is_full_tank)
    .bind(req.notes.clone())
    .bind(id)
    .bind(user_uuid)
    .fetch_optional(&mut *tx)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "refueling log not found"),
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("db error: {}", e)),
    };

    let vehicle_id: Uuid = log_row.get("vehicle_id");
    let tx_id: Option<Uuid> = log_row.try_get("transaction_id").ok();

    if let Some(t_id) = tx_id {
        let _ = sqlx::query("UPDATE transactions SET amount_cents = $1, notes = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4")
            .bind(req.total_amount_cents)
            .bind(req.notes)
            .bind(t_id)
            .bind(user_uuid)
            .execute(&mut *tx)
            .await;
    }

    let _ = sqlx::query(
        r#"
        UPDATE vehicles
        SET odometer_km = (SELECT COALESCE(MAX(current_km), 0) FROM refueling_logs WHERE vehicle_id = $1), updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(vehicle_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = tx.commit().await {
        return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("commit error: {}", e));
    }

    let resp = RefuelingLog {
        id: log_row.get("id"),
        vehicle_id,
        transaction_id: tx_id,
        user_id: log_row.get("user_id"),
        date: log_row.get("date"),
        station: log_row.try_get("station").unwrap_or_default(),
        fuel_type: log_row.get("fuel_type"),
        current_km: log_row.get("current_km"),
        liters: log_row.get("liters"),
        price_per_liter_cents: log_row.get("price_per_liter_cents"),
        total_amount_cents: log_row.get("total_amount_cents"),
        is_full_tank: log_row.get("is_full_tank"),
        notes: log_row.try_get("notes").unwrap_or_default(),
        created_at: log_row.get("created_at"),
        updated_at: log_row.get("updated_at"),
        vehicle_name: String::new(),
        license_plate: String::new(),
        distance_since_last_km: 0.0,
        calculated_km_l: 0.0,
    };

    ok_json(resp)
}

pub async fn delete_refueling(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let mut tx = match state.db.begin().await {
        Ok(t) => t,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("db error: {}", e)),
    };

    let deleted = match sqlx::query("DELETE FROM refueling_logs WHERE id = $1 AND user_id = $2 RETURNING transaction_id, vehicle_id")
        .bind(id)
        .bind(user_uuid)
        .fetch_optional(&mut *tx)
        .await
    {
        Ok(Some(d)) => d,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "refueling log not found"),
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("db error: {}", e)),
    };

    let tx_id: Option<Uuid> = deleted.try_get("transaction_id").ok();
    let vehicle_id: Uuid = deleted.get("vehicle_id");

    if let Some(t_id) = tx_id {
        let _ = sqlx::query("DELETE FROM transactions WHERE id = $1 AND user_id = $2")
            .bind(t_id)
            .bind(user_uuid)
            .execute(&mut *tx)
            .await;
    }

    let _ = sqlx::query(
        r#"
        UPDATE vehicles
        SET odometer_km = (SELECT COALESCE(MAX(current_km), 0) FROM refueling_logs WHERE vehicle_id = $1), updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(vehicle_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = tx.commit().await {
        return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("commit error: {}", e));
    }

    StatusCode::NO_CONTENT.into_response()
}
