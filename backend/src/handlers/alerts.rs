use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use chrono::{DateTime, Utc};
use serde::Serialize;
use serde_json::json;
use somma_common::{error_response, ok_json, to_reais, AuthClaims};
use sqlx::Row;
use uuid::Uuid;

use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlertItem {
    pub id: Uuid,
    pub budget_id: Uuid,
    pub budget_name: String,
    pub threshold_pct: i32,
    pub percent_used: f64,
    pub allocated: f64,
    pub allocated_cents: i64,
    pub spent: f64,
    pub spent_cents: i64,
    pub is_read: bool,
    pub created_at: String,
}

pub async fn list_alerts(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let rows = match sqlx::query(
        r#"
        SELECT id, budget_id, budget_name, threshold_pct, percent_used,
               allocated_cents, spent_cents, is_read, created_at
        FROM budget_alerts
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&state.db)
    .await
    {
        Ok(r) => r,
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let items: Vec<AlertItem> = rows
        .into_iter()
        .map(|r| {
            let created_at: DateTime<Utc> = r.get("created_at");
            let allocated_cents: i64 = r.get("allocated_cents");
            let spent_cents: i64 = r.get("spent_cents");
            AlertItem {
                id: r.get("id"),
                budget_id: r.get("budget_id"),
                budget_name: r.get("budget_name"),
                threshold_pct: r.get("threshold_pct"),
                percent_used: r.get("percent_used"),
                allocated: to_reais(allocated_cents),
                allocated_cents,
                spent: to_reais(spent_cents),
                spent_cents,
                is_read: r.get("is_read"),
                created_at: created_at.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
            }
        })
        .collect();

    ok_json(json!({ "items": items }))
}

pub async fn mark_alert_read(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let res = sqlx::query("UPDATE budget_alerts SET is_read = true WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_uuid)
        .execute(&state.db)
        .await;

    match res {
        Ok(tag) if tag.rows_affected() > 0 => StatusCode::NO_CONTENT.into_response(),
        Ok(_) => error_response(StatusCode::NOT_FOUND, "not found"),
        Err(_) => error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

pub async fn clear_read_alerts(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let _ = sqlx::query("DELETE FROM budget_alerts WHERE user_id = $1 AND is_read = true")
        .bind(user_uuid)
        .execute(&state.db)
        .await;

    StatusCode::NO_CONTENT.into_response()
}
