use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use somma_common::{
    created_json, error_response, ok_json, to_cents, to_reais, AuthClaims,
};
use sqlx::Row;
use uuid::Uuid;

use crate::models::{TransactionCategoryInfo, TransactionResponse};
use crate::AppState;

#[derive(Debug, Serialize, Deserialize)]
struct TxCursor {
    d: String,
    i: String,
}

fn encode_cursor(date: DateTime<Utc>, id: Uuid) -> String {
    let cursor = TxCursor {
        d: date.format("%Y-%m-%d").to_string(),
        i: id.to_string(),
    };
    let json_bytes = serde_json::to_vec(&cursor).unwrap_or_default();
    URL_SAFE_NO_PAD.encode(json_bytes)
}

fn decode_cursor(raw: &str) -> Option<(String, String)> {
    let bytes = URL_SAFE_NO_PAD.decode(raw).ok()?;
    let cursor: TxCursor = serde_json::from_slice(&bytes).ok()?;
    Some((cursor.d, cursor.i))
}

#[derive(Debug, Deserialize)]
pub struct ListTransactionsQuery {
    pub limit: Option<usize>,
    pub cursor: Option<String>,
    #[serde(rename = "categoryId")]
    pub category_id: Option<Uuid>,
    pub r#type: Option<String>,
    pub kind: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    #[serde(rename = "budgetId")]
    pub budget_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTransactionDto {
    #[serde(rename = "categoryId")]
    pub category_id: Option<Uuid>,
    #[serde(rename = "budgetId")]
    pub budget_id: Option<Uuid>,
    pub r#type: String,
    pub kind: Option<String>,
    pub status: Option<String>,
    pub amount: f64,
    pub date: String,
    pub description: Option<String>,
    pub notes: Option<String>,
    #[serde(rename = "currencyCode")]
    pub currency_code: Option<String>,
    #[serde(rename = "goalId")]
    pub goal_id: Option<Uuid>,
    #[serde(default, rename = "isRecurring")]
    pub is_recurring: bool,
    #[serde(rename = "recurrenceFreq")]
    pub recurrence_freq: Option<String>,
    #[serde(rename = "recurrenceEnd")]
    pub recurrence_end: Option<String>,
}

fn parse_transaction_date(raw: &str) -> Result<DateTime<Utc>, &'static str> {
    if raw.len() < 10 {
        return Err("invalid date format, use YYYY-MM-DD");
    }
    if let Ok(d) = NaiveDate::parse_from_str(&raw[..10], "%Y-%m-%d") {
        Ok(DateTime::<Utc>::from_naive_utc_and_offset(
            d.and_hms_opt(12, 0, 0).unwrap(),
            Utc,
        ))
    } else {
        Err("invalid date format, use YYYY-MM-DD")
    }
}

fn fallback_description(tx_type: &str, kind: &str, desc: Option<String>) -> String {
    let d = desc.unwrap_or_default().trim().to_string();
    if !d.is_empty() {
        return d;
    }
    if tx_type == "INCOME" {
        return "Receita".to_string();
    }
    match kind {
        "SAVING" => "Economia".to_string(),
        "BUDGET" => "Orcamento".to_string(),
        "CREDIT" => "Credito".to_string(),
        _ => "Lancamento".to_string(),
    }
}

pub async fn list_transactions(
    State(state): State<AppState>,
    claims: AuthClaims,
    Query(query): Query<ListTransactionsQuery>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let limit = query.limit.unwrap_or(20).clamp(1, 200);

    let (cursor_date, cursor_id) = match query.cursor.as_deref().and_then(decode_cursor) {
        Some((d, i)) => (Some(d), Uuid::parse_str(&i).ok()),
        None => (None, None),
    };

    let from_date = query.from.and_then(|f| NaiveDate::parse_from_str(&f, "%Y-%m-%d").ok());
    let to_date = query.to.and_then(|t| NaiveDate::parse_from_str(&t, "%Y-%m-%d").ok());
    let search_pattern = query.search.map(|s| format!("%{}%", s));
    let cursor_d = cursor_date.and_then(|d| NaiveDate::parse_from_str(&d, "%Y-%m-%d").ok());

    let rows = match sqlx::query(
        r#"
        SELECT t.id, t.user_id, t.category_id, t.budget_id,
               t.type::text AS "type", t.kind::text AS "kind", t.status::text AS "status", t.amount_cents, t.date,
               t.description, t.notes, t.currency_code, t.is_active, t.deleted_at, t.created_at, t.updated_at,
               t.is_recurring, t.recurrence_freq, t.recurrence_end_date, t.recurring_origin_id, t.goal_id,
               c.name AS category_name, c.color AS category_color
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.user_id = $1
          AND t.is_active = true
          AND ($2::uuid IS NULL OR t.category_id = $2)
          AND ($3::text IS NULL OR t.type = $3::transaction_direction)
          AND ($4::text IS NULL OR t.kind = $4::transaction_kind)
          AND ($5::text IS NULL OR t.status = $5::transaction_status)
          AND ($6::text IS NULL OR t.description ILIKE $6)
          AND ($7::date IS NULL OR t.date >= $7)
          AND ($8::date IS NULL OR t.date < ($8 + INTERVAL '1 day'))
          AND ($9::uuid IS NULL OR t.budget_id = $9)
          AND (
              $10::date IS NULL OR 
              t.date < $10 OR 
              (t.date = $10 AND t.id < $11)
          )
        ORDER BY t.date DESC, t.id DESC
        LIMIT $12
        "#,
    )
    .bind(user_uuid)
    .bind(query.category_id)
    .bind(query.r#type)
    .bind(query.kind)
    .bind(query.status)
    .bind(search_pattern)
    .bind(from_date)
    .bind(to_date)
    .bind(query.budget_id)
    .bind(cursor_d)
    .bind(cursor_id)
    .bind((limit + 1) as i64)
    .fetch_all(&state.db)
    .await
    {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("internal error: {}", e)),
    };

    let count = rows.len();
    let has_more = count > limit;
    let take_count = if has_more { limit } else { count };

    let mut items = Vec::with_capacity(take_count);
    let mut next_cursor = None;

    for (idx, r) in rows.into_iter().enumerate() {
        if idx < take_count {
            let cat_name: Option<String> = r.try_get("category_name").ok().flatten();
            let cat_color: Option<String> = r.try_get("category_color").ok().flatten();
            let cat_info = if cat_name.is_some() {
                Some(TransactionCategoryInfo {
                    name: cat_name,
                    color: cat_color,
                })
            } else {
                None
            };

            let tx_id: Uuid = r.get("id");
            let tx_date: DateTime<Utc> = r.get("date");
            let amount_cents: i64 = r.get("amount_cents");
            let end_date: Option<NaiveDate> = r.try_get("recurrence_end_date").ok().flatten();

            if idx == take_count - 1 && has_more {
                next_cursor = Some(encode_cursor(tx_date, tx_id));
            }

            items.push(TransactionResponse {
                id: tx_id,
                user_id: r.get("user_id"),
                category_id: r.try_get("category_id").ok().flatten(),
                budget_id: r.try_get("budget_id").ok().flatten(),
                r#type: r.get("type"),
                kind: r.get("kind"),
                status: r.get("status"),
                amount: to_reais(amount_cents),
                date: tx_date,
                description: r.get("description"),
                notes: r.try_get("notes").ok().flatten(),
                currency_code: r.get("currency_code"),
                is_active: r.get("is_active"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
                is_recurring: r.get("is_recurring"),
                recurrence_freq: r.try_get("recurrence_freq").ok().flatten(),
                recurrence_end_date: end_date.map(|d| d.format("%Y-%m-%d").to_string()),
                recurring_origin_id: r.try_get("recurring_origin_id").ok().flatten(),
                goal_id: r.try_get("goal_id").ok().flatten(),
                category: cat_info,
            });
        }
    }

    ok_json(json!({
        "items": items,
        "nextCursor": next_cursor
    }))
}

pub async fn get_transaction(
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
        SELECT t.id, t.user_id, t.category_id, t.budget_id,
               t.type::text AS "type", t.kind::text AS "kind", t.status::text AS "status", t.amount_cents, t.date,
               t.description, t.notes, t.currency_code, t.is_active, t.deleted_at, t.created_at, t.updated_at,
               t.is_recurring, t.recurrence_freq, t.recurrence_end_date, t.recurring_origin_id, t.goal_id,
               c.name AS category_name, c.color AS category_color
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.id = $1 AND t.user_id = $2 AND t.is_active = true
        "#,
    )
    .bind(id)
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "transaction not found"),
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let cat_name: Option<String> = row.try_get("category_name").ok().flatten();
    let cat_color: Option<String> = row.try_get("category_color").ok().flatten();
    let cat_info = if cat_name.is_some() {
        Some(TransactionCategoryInfo {
            name: cat_name,
            color: cat_color,
        })
    } else {
        None
    };

    let amount_cents: i64 = row.get("amount_cents");
    let end_date: Option<NaiveDate> = row.try_get("recurrence_end_date").ok().flatten();

    ok_json(TransactionResponse {
        id: row.get("id"),
        user_id: row.get("user_id"),
        category_id: row.try_get("category_id").ok().flatten(),
        budget_id: row.try_get("budget_id").ok().flatten(),
        r#type: row.get("type"),
        kind: row.get("kind"),
        status: row.get("status"),
        amount: to_reais(amount_cents),
        date: row.get("date"),
        description: row.get("description"),
        notes: row.try_get("notes").ok().flatten(),
        currency_code: row.get("currency_code"),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        is_recurring: row.get("is_recurring"),
        recurrence_freq: row.try_get("recurrence_freq").ok().flatten(),
        recurrence_end_date: end_date.map(|d| d.format("%Y-%m-%d").to_string()),
        recurring_origin_id: row.try_get("recurring_origin_id").ok().flatten(),
        goal_id: row.try_get("goal_id").ok().flatten(),
        category: cat_info,
    })
}

pub async fn create_transaction(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(dto): Json<CreateTransactionDto>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    if dto.amount <= 0.0 {
        return error_response(StatusCode::BAD_REQUEST, "amount must be > 0");
    }

    let tx_date = match parse_transaction_date(&dto.date) {
        Ok(d) => d,
        Err(e) => return error_response(StatusCode::BAD_REQUEST, e),
    };

    let kind = dto.kind.unwrap_or_else(|| {
        if dto.r#type == "INCOME" {
            "INCOME".to_string()
        } else {
            "EXPENSE".to_string()
        }
    });

    let status = dto.status.unwrap_or_else(|| "COMPLETED".to_string());
    let currency = dto.currency_code.unwrap_or_else(|| "BRL".to_string());
    let amount_cents = to_cents(dto.amount);
    let desc = fallback_description(&dto.r#type, &kind, dto.description);

    let recurrence_freq = if dto.is_recurring {
        Some(dto.recurrence_freq.unwrap_or_else(|| "MONTHLY".to_string()))
    } else {
        None
    };

    let recurrence_end = dto
        .recurrence_end
        .as_deref()
        .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok());

    let row = match sqlx::query(
        r#"
        INSERT INTO transactions (
            user_id, category_id, budget_id, goal_id, type, kind, status, amount_cents,
            date, description, notes, currency_code,
            is_recurring, recurrence_freq, recurrence_end_date
        ) VALUES ($1, $2, $3, $4, $5::text::transaction_direction, $6::text::transaction_kind, $7::text::transaction_status, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, user_id, category_id, budget_id, type::text AS "type", kind::text AS "kind", status::text AS "status", amount_cents,
                  date, description, notes, currency_code, is_active, deleted_at, created_at, updated_at,
                  is_recurring, recurrence_freq, recurrence_end_date, recurring_origin_id, goal_id
        "#,
    )
    .bind(user_uuid)
    .bind(dto.category_id)
    .bind(dto.budget_id)
    .bind(dto.goal_id)
    .bind(dto.r#type)
    .bind(kind)
    .bind(status)
    .bind(amount_cents)
    .bind(tx_date)
    .bind(desc)
    .bind(dto.notes)
    .bind(currency)
    .bind(dto.is_recurring)
    .bind(recurrence_freq)
    .bind(recurrence_end)
    .fetch_one(&state.db)
    .await
    {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("internal error: {}", e)),
    };

    let end_date: Option<NaiveDate> = row.try_get("recurrence_end_date").ok().flatten();

    created_json(TransactionResponse {
        id: row.get("id"),
        user_id: row.get("user_id"),
        category_id: row.try_get("category_id").ok().flatten(),
        budget_id: row.try_get("budget_id").ok().flatten(),
        r#type: row.get("type"),
        kind: row.get("kind"),
        status: row.get("status"),
        amount: to_reais(amount_cents),
        date: row.get("date"),
        description: row.get("description"),
        notes: row.try_get("notes").ok().flatten(),
        currency_code: row.get("currency_code"),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        is_recurring: row.get("is_recurring"),
        recurrence_freq: row.try_get("recurrence_freq").ok().flatten(),
        recurrence_end_date: end_date.map(|d| d.format("%Y-%m-%d").to_string()),
        recurring_origin_id: row.try_get("recurring_origin_id").ok().flatten(),
        goal_id: row.try_get("goal_id").ok().flatten(),
        category: None,
    })
}

pub async fn update_transaction(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
    Json(dto): Json<CreateTransactionDto>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    if dto.amount <= 0.0 {
        return error_response(StatusCode::BAD_REQUEST, "amount must be > 0");
    }

    let tx_date = match parse_transaction_date(&dto.date) {
        Ok(d) => d,
        Err(e) => return error_response(StatusCode::BAD_REQUEST, e),
    };

    let kind = dto.kind.unwrap_or_else(|| {
        if dto.r#type == "INCOME" {
            "INCOME".to_string()
        } else {
            "EXPENSE".to_string()
        }
    });

    let status = dto.status.unwrap_or_else(|| "COMPLETED".to_string());
    let currency = dto.currency_code.unwrap_or_else(|| "BRL".to_string());
    let amount_cents = to_cents(dto.amount);
    let desc = fallback_description(&dto.r#type, &kind, dto.description);

    let row = match sqlx::query(
        r#"
        UPDATE transactions
        SET category_id = $1,
            budget_id = $2,
            type = $3::text::transaction_direction,
            kind = $4::text::transaction_kind,
            status = $5::text::transaction_status,
            amount_cents = $6,
            date = $7,
            description = $8,
            notes = $9,
            currency_code = $10,
            updated_at = NOW()
        WHERE id = $11 AND user_id = $12 AND is_active = true
        RETURNING id, user_id, category_id, budget_id, type::text AS "type", kind::text AS "kind", status::text AS "status", amount_cents,
                  date, description, notes, currency_code, is_active, deleted_at, created_at, updated_at,
                  is_recurring, recurrence_freq, recurrence_end_date, recurring_origin_id, goal_id
        "#,
    )
    .bind(dto.category_id)
    .bind(dto.budget_id)
    .bind(dto.r#type)
    .bind(kind)
    .bind(status)
    .bind(amount_cents)
    .bind(tx_date)
    .bind(desc)
    .bind(dto.notes)
    .bind(currency)
    .bind(id)
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "transaction not found"),
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("internal error: {}", e)),
    };

    let end_date: Option<NaiveDate> = row.try_get("recurrence_end_date").ok().flatten();

    ok_json(TransactionResponse {
        id: row.get("id"),
        user_id: row.get("user_id"),
        category_id: row.try_get("category_id").ok().flatten(),
        budget_id: row.try_get("budget_id").ok().flatten(),
        r#type: row.get("type"),
        kind: row.get("kind"),
        status: row.get("status"),
        amount: to_reais(amount_cents),
        date: row.get("date"),
        description: row.get("description"),
        notes: row.try_get("notes").ok().flatten(),
        currency_code: row.get("currency_code"),
        is_active: row.get("is_active"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        is_recurring: row.get("is_recurring"),
        recurrence_freq: row.try_get("recurrence_freq").ok().flatten(),
        recurrence_end_date: end_date.map(|d| d.format("%Y-%m-%d").to_string()),
        recurring_origin_id: row.try_get("recurring_origin_id").ok().flatten(),
        goal_id: row.try_get("goal_id").ok().flatten(),
        category: None,
    })
}

pub async fn delete_transaction(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let res = sqlx::query("UPDATE transactions SET is_active = false, deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2 AND is_active = true")
        .bind(id)
        .bind(user_uuid)
        .execute(&state.db)
        .await;

    match res {
        Ok(tag) if tag.rows_affected() > 0 => StatusCode::NO_CONTENT.into_response(),
        Ok(_) => error_response(StatusCode::NOT_FOUND, "transaction not found"),
        Err(_) => error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

pub async fn restore_transaction(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let res = sqlx::query("UPDATE transactions SET is_active = true, deleted_at = NULL, updated_at = NOW() WHERE id = $1 AND user_id = $2 AND is_active = false")
        .bind(id)
        .bind(user_uuid)
        .execute(&state.db)
        .await;

    match res {
        Ok(tag) if tag.rows_affected() > 0 => StatusCode::NO_CONTENT.into_response(),
        Ok(_) => error_response(StatusCode::NOT_FOUND, "transaction not found or already active"),
        Err(_) => error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

pub async fn list_future_transactions(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let rows = match sqlx::query(
        r#"
        SELECT t.id, t.user_id, t.category_id, t.budget_id,
               t.type::text AS "type", t.kind::text AS "kind", t.status::text AS "status", t.amount_cents, t.date,
               t.description, t.notes, t.currency_code, t.is_active, t.deleted_at, t.created_at, t.updated_at,
               t.is_recurring, t.recurrence_freq, t.recurrence_end_date, t.recurring_origin_id, t.goal_id,
               c.name AS category_name, c.color AS category_color
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.user_id = $1
          AND t.is_active = true
          AND (t.date > NOW() OR t.status = 'PENDING')
        ORDER BY t.date ASC
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&state.db)
    .await
    {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("internal error: {}", e)),
    };

    let result: Vec<TransactionResponse> = rows
        .into_iter()
        .map(|r| {
            let cat_name: Option<String> = r.try_get("category_name").ok().flatten();
            let cat_color: Option<String> = r.try_get("category_color").ok().flatten();
            let cat_info = if cat_name.is_some() {
                Some(TransactionCategoryInfo {
                    name: cat_name,
                    color: cat_color,
                })
            } else {
                None
            };
            let amount_cents: i64 = r.get("amount_cents");
            let end_date: Option<NaiveDate> = r.try_get("recurrence_end_date").ok().flatten();

            TransactionResponse {
                id: r.get("id"),
                user_id: r.get("user_id"),
                category_id: r.try_get("category_id").ok().flatten(),
                budget_id: r.try_get("budget_id").ok().flatten(),
                r#type: r.get("type"),
                kind: r.get("kind"),
                status: r.get("status"),
                amount: to_reais(amount_cents),
                date: r.get("date"),
                description: r.get("description"),
                notes: r.try_get("notes").ok().flatten(),
                currency_code: r.get("currency_code"),
                is_active: r.get("is_active"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
                is_recurring: r.get("is_recurring"),
                recurrence_freq: r.try_get("recurrence_freq").ok().flatten(),
                recurrence_end_date: end_date.map(|d| d.format("%Y-%m-%d").to_string()),
                recurring_origin_id: r.try_get("recurring_origin_id").ok().flatten(),
                goal_id: r.try_get("goal_id").ok().flatten(),
                category: cat_info,
            }
        })
        .collect();

    ok_json(result)
}
