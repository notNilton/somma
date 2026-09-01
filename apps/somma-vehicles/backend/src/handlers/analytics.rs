use axum::{
    extract::State,
    http::StatusCode,
    response::Response,
};
use somma_common::{error_response, ok_json, AuthClaims};
use sqlx::Row;
use uuid::Uuid;

use crate::models::{AnalyticsSummary, FuelPricePoint, VehicleSpendSummary};
use crate::AppState;

pub async fn get_analytics(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let mut summary = AnalyticsSummary::default();

    // 1. Overall stats
    if let Ok(row) = sqlx::query(
        r#"
        SELECT 
            COALESCE(SUM(total_amount_cents), 0)::bigint as total_spent,
            COALESCE(SUM(liters), 0)::float8 as total_liters,
            COUNT(id)::bigint as total_refuelings
        FROM refueling_logs
        WHERE user_id = $1
        "#,
    )
    .bind(user_uuid)
    .fetch_one(&state.db)
    .await
    {
        summary.total_spent_cents = row.try_get("total_spent").unwrap_or(0);
        summary.total_liters = row.try_get("total_liters").unwrap_or(0.0);
        summary.total_refuelings = row.try_get("total_refuelings").unwrap_or(0);
    }

    // 2. Count active vehicles
    if let Ok(row) = sqlx::query(
        r#"SELECT COUNT(id)::bigint as count FROM vehicles WHERE user_id = $1 AND is_active = TRUE"#,
    )
    .bind(user_uuid)
    .fetch_one(&state.db)
    .await
    {
        summary.total_vehicles = row.try_get("count").unwrap_or(0);
    }

    // 3. Compute overall avg km/L and cost/km
    if let Ok(range_row) = sqlx::query(
        r#"
        SELECT COALESCE(MIN(current_km), 0)::float8 as min_km, COALESCE(MAX(current_km), 0)::float8 as max_km
        FROM refueling_logs
        WHERE user_id = $1
        "#,
    )
    .bind(user_uuid)
    .fetch_one(&state.db)
    .await
    {
        let min_km: f64 = range_row.try_get("min_km").unwrap_or(0.0);
        let max_km: f64 = range_row.try_get("max_km").unwrap_or(0.0);
        let distance = max_km - min_km;
        if distance > 0.0 {
            if summary.total_liters > 0.0 {
                summary.avg_km_l = distance / summary.total_liters;
            }
            if summary.total_spent_cents > 0 {
                summary.avg_cost_per_km = (summary.total_spent_cents as f64 / 100.0) / distance;
            }
        }
    }

    // 4. Vehicle spend breakdown
    if let Ok(rows) = sqlx::query(
        r#"
        SELECT v.id, v.name, COALESCE(SUM(r.total_amount_cents), 0)::bigint as total
        FROM vehicles v
        LEFT JOIN refueling_logs r ON v.id = r.vehicle_id
        WHERE v.user_id = $1 AND v.is_active = TRUE
        GROUP BY v.id, v.name
        ORDER BY SUM(r.total_amount_cents) DESC NULLS LAST
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&state.db)
    .await
    {
        summary.vehicle_spend = rows
            .into_iter()
            .map(|r| VehicleSpendSummary {
                vehicle_id: r.get("id"),
                vehicle_name: r.get("name"),
                total_spent_cents: r.try_get("total").unwrap_or(0),
            })
            .collect();
    }

    // 5. Price history
    if let Ok(rows) = sqlx::query(
        r#"
        SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, fuel_type, price_per_liter_cents
        FROM refueling_logs
        WHERE user_id = $1
        ORDER BY date ASC
        LIMIT 20
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&state.db)
    .await
    {
        summary.price_history = rows
            .into_iter()
            .map(|r| {
                let price_cents: i64 = r.get("price_per_liter_cents");
                FuelPricePoint {
                    date: r.try_get("date").unwrap_or_default(),
                    fuel_type: r.get("fuel_type"),
                    price_per_liter_cents: price_cents,
                    price_per_liter_reais: price_cents as f64 / 100.0,
                }
            })
            .collect();
    }

    ok_json(summary)
}
