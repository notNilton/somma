use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use somma_common::{created_json, error_response, ok_json, to_cents, to_reais, AuthClaims};
use sqlx::Row;
use uuid::Uuid;

use crate::models::Goal;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct UpsertGoalDto {
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "targetAmount")]
    pub target_amount: f64,
    pub color: Option<String>,
    #[serde(rename = "targetDate")]
    pub target_date: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub target_amount: f64,
    pub saved_amount: f64,
    pub remaining: f64,
    pub progress: f64,
    pub color: String,
    pub is_achieved: bool,
    pub target_date: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

fn goal_response(g: Goal, saved_cents: i64) -> GoalResponse {
    let mut pct = 0.0;
    if g.target_amount_cents > 0 {
        pct = (saved_cents as f64 / g.target_amount_cents as f64) * 100.0;
        if pct > 100.0 {
            pct = 100.0;
        }
    }

    GoalResponse {
        id: g.id,
        user_id: g.user_id,
        name: g.name,
        description: g.description,
        target_amount: to_reais(g.target_amount_cents),
        saved_amount: to_reais(saved_cents),
        remaining: to_reais(g.target_amount_cents - saved_cents),
        progress: pct,
        color: g.color,
        is_achieved: g.is_achieved,
        target_date: g.target_date.map(|d| d.format("%Y-%m-%d").to_string()),
        created_at: g.created_at,
        updated_at: g.updated_at,
    }
}

async fn get_saved_cents(state: &AppState, user_id: Uuid, goal_id: Uuid) -> i64 {
    let row = sqlx::query(
        r#"
        SELECT COALESCE(SUM(amount_cents), 0)::bigint as saved_cents
        FROM transactions
        WHERE goal_id = $1
          AND user_id = $2
          AND is_active = true
          AND status = 'COMPLETED'
        "#,
    )
    .bind(goal_id)
    .bind(user_id)
    .fetch_one(&state.db)
    .await;

    match row {
        Ok(r) => r.try_get("saved_cents").unwrap_or(0),
        Err(_) => 0,
    }
}

pub async fn list_goals(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let rows = match sqlx::query(
        r#"
        SELECT id, user_id, name, description, target_amount_cents, color, target_date,
               is_achieved, is_active, created_at, updated_at
        FROM goals
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&state.db)
    .await
    {
        Ok(r) => r,
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let mut result = Vec::with_capacity(rows.len());
    for r in rows {
        let g = Goal {
            id: r.get("id"),
            user_id: r.get("user_id"),
            name: r.get("name"),
            description: r.try_get("description").ok().flatten(),
            target_amount_cents: r.get("target_amount_cents"),
            color: r.get("color"),
            target_date: r.try_get("target_date").ok().flatten(),
            is_achieved: r.get("is_achieved"),
            is_active: r.get("is_active"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        };
        let saved = get_saved_cents(&state, user_uuid, g.id).await;
        result.push(goal_response(g, saved));
    }

    ok_json(result)
}

pub async fn create_goal(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(dto): Json<UpsertGoalDto>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let name = dto.name.trim();
    if name.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "name is required");
    }
    if name.len() > 120 {
        return error_response(StatusCode::BAD_REQUEST, "name max 120 chars");
    }
    if dto.target_amount <= 0.0 {
        return error_response(StatusCode::BAD_REQUEST, "targetAmount must be > 0");
    }

    let color = dto.color.unwrap_or_else(|| "#3b82f6".to_string());
    let target_date = dto
        .target_date
        .as_deref()
        .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok());

    let target_amount_cents = to_cents(dto.target_amount);

    let row = match sqlx::query(
        r#"
        INSERT INTO goals (user_id, name, description, target_amount_cents, color, target_date)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, user_id, name, description, target_amount_cents, color, target_date,
                  is_achieved, is_active, created_at, updated_at
        "#,
    )
    .bind(user_uuid)
    .bind(name)
    .bind(dto.description)
    .bind(target_amount_cents)
    .bind(color)
    .bind(target_date)
    .fetch_one(&state.db)
    .await
    {
        Ok(res) => res,
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let g = Goal {
        id: row.get("id"),
        user_id: row.get("user_id"),
        name: row.get("name"),
        description: row.try_get("description").ok().flatten(),
        target_amount_cents: row.get("target_amount_cents"),
        color: row.get("color"),
        target_date: row.try_get("target_date").ok().flatten(),
        is_achieved: row.get("is_achieved"),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    created_json(goal_response(g, 0))
}

pub async fn update_goal(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
    Json(dto): Json<UpsertGoalDto>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let name = dto.name.trim();
    if name.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "name is required");
    }
    if name.len() > 120 {
        return error_response(StatusCode::BAD_REQUEST, "name max 120 chars");
    }
    if dto.target_amount <= 0.0 {
        return error_response(StatusCode::BAD_REQUEST, "targetAmount must be > 0");
    }

    let color = dto.color.unwrap_or_else(|| "#3b82f6".to_string());
    let target_date = dto
        .target_date
        .as_deref()
        .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok());

    let target_amount_cents = to_cents(dto.target_amount);

    let row = match sqlx::query(
        r#"
        UPDATE goals
        SET name = $1, description = $2, target_amount_cents = $3,
            color = $4, target_date = $5, updated_at = NOW()
        WHERE id = $6 AND user_id = $7 AND is_active = true
        RETURNING id, user_id, name, description, target_amount_cents, color, target_date,
                  is_achieved, is_active, created_at, updated_at
        "#,
    )
    .bind(name)
    .bind(dto.description)
    .bind(target_amount_cents)
    .bind(color)
    .bind(target_date)
    .bind(id)
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(res)) => res,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "goal not found"),
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let g = Goal {
        id: row.get("id"),
        user_id: row.get("user_id"),
        name: row.get("name"),
        description: row.try_get("description").ok().flatten(),
        target_amount_cents: row.get("target_amount_cents"),
        color: row.get("color"),
        target_date: row.try_get("target_date").ok().flatten(),
        is_achieved: row.get("is_achieved"),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    let saved = get_saved_cents(&state, user_uuid, g.id).await;
    ok_json(goal_response(g, saved))
}

pub async fn delete_goal(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let res = sqlx::query("UPDATE goals SET is_active = false, updated_at = NOW() WHERE id = $1 AND user_id = $2 AND is_active = true")
        .bind(id)
        .bind(user_uuid)
        .execute(&state.db)
        .await;

    match res {
        Ok(tag) if tag.rows_affected() > 0 => StatusCode::NO_CONTENT.into_response(),
        Ok(_) => error_response(StatusCode::NOT_FOUND, "goal not found"),
        Err(_) => error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}
