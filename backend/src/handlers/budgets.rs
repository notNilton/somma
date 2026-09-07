use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use somma_common::{created_json, error_response, ok_json, to_cents, to_reais, AuthClaims};
use sqlx::Row;
use uuid::Uuid;

use crate::models::Budget;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct UpsertBudgetDto {
    pub name: String,
    #[serde(rename = "allocatedAmount")]
    pub allocated_amount: f64,
    pub notes: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BudgetResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub allocated_amount: f64,
    pub allocated_amount_cents: i64,
    pub spent: f64,
    pub spent_cents: i64,
    pub remaining: f64,
    pub remaining_cents: i64,
    pub progress: f64,
    pub notes: Option<String>,
    pub is_active: bool,
    pub deleted_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

fn budget_response(b: Budget, spent_cents: i64) -> BudgetResponse {
    let remaining_cents = b.allocated_amount_cents - spent_cents;
    let progress = if b.allocated_amount_cents > 0 {
        (spent_cents as f64 / b.allocated_amount_cents as f64) * 100.0
    } else {
        0.0
    };

    BudgetResponse {
        id: b.id,
        user_id: b.user_id,
        name: b.name,
        allocated_amount: to_reais(b.allocated_amount_cents),
        allocated_amount_cents: b.allocated_amount_cents,
        spent: to_reais(spent_cents),
        spent_cents,
        remaining: to_reais(remaining_cents),
        remaining_cents,
        progress,
        notes: b.notes,
        is_active: b.is_active,
        deleted_at: b.deleted_at,
        created_at: b.created_at,
        updated_at: b.updated_at,
    }
}

pub async fn list_budgets(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let rows = match sqlx::query(
        r#"
        SELECT b.id, b.user_id, b.name, b.allocated_amount_cents, b.notes, b.is_active, b.deleted_at, b.created_at, b.updated_at,
               COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount_cents ELSE 0 END), 0)::bigint AS spent_cents
        FROM budgets b
        LEFT JOIN transactions t
          ON t.budget_id = b.id
         AND t.user_id = b.user_id
         AND t.is_active = true
         AND t.status = 'COMPLETED'
        WHERE b.user_id = $1
          AND b.is_active = true
        GROUP BY b.id, b.user_id, b.name, b.allocated_amount_cents, b.notes, b.is_active, b.deleted_at, b.created_at, b.updated_at
        ORDER BY b.name ASC
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&state.db)
    .await
    {
        Ok(r) => r,
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let result: Vec<BudgetResponse> = rows
        .into_iter()
        .map(|r| {
            let b = Budget {
                id: r.get("id"),
                user_id: r.get("user_id"),
                name: r.get("name"),
                allocated_amount_cents: r.get("allocated_amount_cents"),
                notes: r.try_get("notes").ok().flatten(),
                is_active: r.get("is_active"),
                deleted_at: r.try_get("deleted_at").ok().flatten(),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            };
            let spent_cents: i64 = r.try_get("spent_cents").unwrap_or(0);
            budget_response(b, spent_cents)
        })
        .collect();

    ok_json(result)
}

pub async fn create_budget(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(dto): Json<UpsertBudgetDto>,
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
    if dto.allocated_amount < 0.0 {
        return error_response(StatusCode::BAD_REQUEST, "allocatedAmount must be >= 0");
    }

    let allocated_cents = to_cents(dto.allocated_amount);

    let plan_row = match sqlx::query(
        r#"
        INSERT INTO budgets (user_id, name, allocated_amount_cents, notes, is_active)
        VALUES ($1, $2, $3, $4, true)
        RETURNING id, user_id, name, allocated_amount_cents, notes, is_active, deleted_at, created_at, updated_at
        "#,
    )
    .bind(user_uuid)
    .bind(name)
    .bind(allocated_cents)
    .bind(dto.notes)
    .fetch_one(&state.db)
    .await
    {
        Ok(p) => p,
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let plan = Budget {
        id: plan_row.get("id"),
        user_id: plan_row.get("user_id"),
        name: plan_row.get("name"),
        allocated_amount_cents: plan_row.get("allocated_amount_cents"),
        notes: plan_row.try_get("notes").ok().flatten(),
        is_active: plan_row.get("is_active"),
        deleted_at: plan_row.try_get("deleted_at").ok().flatten(),
        created_at: plan_row.get("created_at"),
        updated_at: plan_row.get("updated_at"),
    };

    created_json(budget_response(plan, 0))
}

pub async fn update_budget(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
    Json(dto): Json<UpsertBudgetDto>,
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
    if dto.allocated_amount < 0.0 {
        return error_response(StatusCode::BAD_REQUEST, "allocatedAmount must be >= 0");
    }

    let allocated_cents = to_cents(dto.allocated_amount);

    let row = match sqlx::query(
        r#"
        WITH updated AS (
            UPDATE budgets
            SET name = $1,
                allocated_amount_cents = $2,
                notes = $3,
                is_active = true,
                deleted_at = NULL,
                updated_at = NOW()
            WHERE id = $4 AND user_id = $5
            RETURNING id, user_id, name, allocated_amount_cents, notes, is_active, deleted_at, created_at, updated_at
        )
        SELECT u.id, u.user_id, u.name, u.allocated_amount_cents, u.notes, u.is_active, u.deleted_at, u.created_at, u.updated_at,
               COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount_cents ELSE 0 END), 0)::bigint AS spent_cents
        FROM updated u
        LEFT JOIN transactions t
          ON t.budget_id = u.id
         AND t.user_id = u.user_id
         AND t.is_active = true
         AND t.status = 'COMPLETED'
        GROUP BY u.id, u.user_id, u.name, u.allocated_amount_cents, u.notes, u.is_active, u.deleted_at, u.created_at, u.updated_at
        "#,
    )
    .bind(name)
    .bind(allocated_cents)
    .bind(dto.notes)
    .bind(id)
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "budget not found"),
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let b = Budget {
        id: row.get("id"),
        user_id: row.get("user_id"),
        name: row.get("name"),
        allocated_amount_cents: row.get("allocated_amount_cents"),
        notes: row.try_get("notes").ok().flatten(),
        is_active: row.get("is_active"),
        deleted_at: row.try_get("deleted_at").ok().flatten(),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };
    let spent_cents: i64 = row.try_get("spent_cents").unwrap_or(0);

    ok_json(budget_response(b, spent_cents))
}

pub async fn delete_budget(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let res = sqlx::query("UPDATE budgets SET is_active = false, deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_uuid)
        .execute(&state.db)
        .await;

    match res {
        Ok(tag) if tag.rows_affected() > 0 => StatusCode::NO_CONTENT.into_response(),
        Ok(_) => error_response(StatusCode::NOT_FOUND, "budget not found"),
        Err(_) => error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}
