use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Response,
};
use chrono::{Datelike, Utc};
use serde::Deserialize;
use serde_json::json;
use somma_common::{error_response, ok_json, to_reais, AuthClaims};
use sqlx::Row;
use std::collections::HashMap;
use uuid::Uuid;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct TrendsQuery {
    pub r#type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CategoryBreakdownQuery {
    pub month: Option<String>,
    pub r#type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AnnualEvolutionQuery {
    pub year: Option<i32>,
}

pub async fn get_trends(
    State(state): State<AppState>,
    claims: AuthClaims,
    Query(query): Query<TrendsQuery>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let tx_type = query.r#type.unwrap_or_else(|| "EXPENSE".to_string());

    let rows = match sqlx::query(
        r#"
        WITH monthly AS (
            SELECT c.id AS cat_id, c.name AS cat_name, c.color AS cat_color,
                   DATE_TRUNC('month', t.date) AS month,
                   SUM(t.amount_cents)::bigint AS total_cents
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id
            WHERE t.user_id = $1
              AND t.is_active = true
              AND t.status = 'COMPLETED'
              AND t.type = $2::text::transaction_direction
              AND t.date >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
            GROUP BY c.id, c.name, c.color, DATE_TRUNC('month', t.date)
        ),
        with_window AS (
            SELECT cat_id, cat_name, cat_color, month, total_cents,
                   LAG(total_cents) OVER (PARTITION BY cat_id ORDER BY month)::bigint AS prev_month_cents,
                   AVG(total_cents) OVER (
                       PARTITION BY cat_id ORDER BY month
                       ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
                   )::float8 AS moving_avg
            FROM monthly
        )
        SELECT cat_id, cat_name, cat_color, total_cents,
               COALESCE(prev_month_cents, 0)::bigint AS prev_month_cents,
               ROUND(COALESCE(moving_avg, 0))::float8 AS moving_avg
        FROM with_window
        WHERE month = DATE_TRUNC('month', NOW())
        ORDER BY total_cents DESC
        "#,
    )
    .bind(user_uuid)
    .bind(tx_type.clone())
    .fetch_all(&state.db)
    .await
    {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("internal error: {}", e)),
    };

    let mut items = Vec::new();
    for r in rows {
        let total_c: i64 = r.try_get("total_cents").unwrap_or(0);
        let prev_c: i64 = r.try_get("prev_month_cents").unwrap_or(0);
        let moving_avg: f64 = r.try_get("moving_avg").unwrap_or(0.0);
        let moving_avg_c = moving_avg as i64;

        let delta_pct = if prev_c != 0 {
            Some(((total_c - prev_c) as f64 / prev_c as f64) * 100.0)
        } else {
            None
        };

        let cat_id: Option<Uuid> = r.try_get("cat_id").ok().flatten();
        let cat_name: Option<String> = r.try_get("cat_name").ok().flatten();
        let cat_color: Option<String> = r.try_get("cat_color").ok().flatten();

        items.push(json!({
            "categoryId": cat_id,
            "categoryName": cat_name,
            "categoryColor": cat_color,
            "total": to_reais(total_c),
            "totalCents": total_c,
            "movingAvg": to_reais(moving_avg_c),
            "movingAvgCents": moving_avg_c,
            "deltaPct": delta_pct,
            "prevMonth": to_reais(prev_c),
            "prevMonthCents": prev_c,
        }));
    }

    let now_month = Utc::now().format("%Y-%m").to_string();
    ok_json(json!({
        "type": tx_type,
        "month": now_month,
        "items": items
    }))
}

pub async fn get_monthly_evolution(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let rows = match sqlx::query(
        r#"
        SELECT TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
               type::text AS tx_type,
               COALESCE(SUM(amount_cents), 0)::bigint AS total
        FROM transactions
        WHERE user_id = $1
          AND is_active = true
          AND status = 'COMPLETED'
          AND type IN ('INCOME', 'EXPENSE')
          AND date >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
        GROUP BY month, type
        ORDER BY month ASC
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&state.db)
    .await
    {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("internal error: {}", e)),
    };

    #[derive(Default)]
    struct Point {
        income_cents: i64,
        expense_cents: i64,
    }

    let mut point_map: HashMap<String, Point> = HashMap::new();
    for r in rows {
        let m: String = r.try_get("month").unwrap_or_default();
        let t: String = r.try_get("tx_type").unwrap_or_default();
        let tot: i64 = r.try_get("total").unwrap_or(0);

        let entry = point_map.entry(m).or_default();
        if t == "INCOME" {
            entry.income_cents = tot;
        } else {
            entry.expense_cents = tot;
        }
    }

    let mut result = Vec::new();
    let now = Utc::now();
    for i in (0..=5).rev() {
        let date = now - chrono::Duration::days(i * 30);
        let m = date.format("%Y-%m").to_string();
        let p = point_map.get(&m);
        let inc = p.map(|x| x.income_cents).unwrap_or(0);
        let exp = p.map(|x| x.expense_cents).unwrap_or(0);

        result.push(json!({
            "month": m,
            "income": to_reais(inc),
            "expenses": to_reais(exp),
            "net": to_reais(inc - exp),
            "incomeCents": inc,
            "expenseCents": exp,
        }));
    }

    ok_json(result)
}

pub async fn get_category_breakdown(
    State(state): State<AppState>,
    claims: AuthClaims,
    Query(query): Query<CategoryBreakdownQuery>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let month = query
        .month
        .unwrap_or_else(|| Utc::now().format("%Y-%m").to_string());
    let month_date = format!("{}-01", month);
    let tx_type = query.r#type.unwrap_or_else(|| "EXPENSE".to_string());

    let month_naive = chrono::NaiveDate::parse_from_str(&month_date, "%Y-%m-%d")
        .unwrap_or_else(|_| chrono::NaiveDate::from_ymd_opt(2026, 1, 1).unwrap());

    let rows = match sqlx::query(
        r#"
        SELECT c.id, c.name, c.color, t.type::text as tx_type,
               SUM(t.amount_cents)::bigint AS total_cents,
               COUNT(*)::bigint AS tx_count
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.user_id = $1
          AND t.is_active = true
          AND t.status = 'COMPLETED'
          AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date)
          AND t.type = $3::text::transaction_direction
        GROUP BY c.id, c.name, c.color, t.type
        ORDER BY total_cents DESC
        "#,
    )
    .bind(user_uuid)
    .bind(month_naive)
    .bind(tx_type.clone())
    .fetch_all(&state.db)
    .await
    {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("internal error: {}", e)),
    };

    let mut items = Vec::new();
    for r in rows {
        let total: i64 = r.try_get("total_cents").unwrap_or(0);
        let id: Option<Uuid> = r.try_get("id").ok().flatten();
        let name: Option<String> = r.try_get("name").ok().flatten();
        let color: Option<String> = r.try_get("color").ok().flatten();
        let tx_t: String = r.try_get("tx_type").unwrap_or_default();
        let count: i64 = r.try_get("tx_count").unwrap_or(0);

        items.push(json!({
            "categoryId": id,
            "categoryName": name,
            "categoryColor": color,
            "type": tx_t,
            "total": to_reais(total),
            "totalCents": total,
            "count": count,
        }));
    }

    ok_json(json!({
        "month": month,
        "type": tx_type,
        "items": items,
    }))
}

pub async fn get_annual_evolution(
    State(state): State<AppState>,
    claims: AuthClaims,
    Query(query): Query<AnnualEvolutionQuery>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let year = query.year.unwrap_or_else(|| Utc::now().year() as i32);

    let rows = match sqlx::query(
        r#"
        SELECT EXTRACT(MONTH FROM date)::INT AS month,
               type::text AS tx_type,
               COALESCE(SUM(amount_cents), 0)::bigint AS total
        FROM transactions
        WHERE user_id = $1
          AND is_active = true
          AND status = 'COMPLETED'
          AND type IN ('INCOME', 'EXPENSE')
          AND EXTRACT(YEAR FROM date) = $2
        GROUP BY month, type
        ORDER BY month ASC
        "#,
    )
    .bind(user_uuid)
    .bind(year as f64)
    .fetch_all(&state.db)
    .await
    {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("internal error: {}", e)),
    };

    #[derive(Default)]
    struct Point {
        income_cents: i64,
        expense_cents: i64,
    }

    let mut point_map: HashMap<i32, Point> = HashMap::new();
    for r in rows {
        let m: i32 = r.try_get("month").unwrap_or(0);
        let t: String = r.try_get("tx_type").unwrap_or_default();
        let tot: i64 = r.try_get("total").unwrap_or(0);

        let entry = point_map.entry(m).or_default();
        if t == "INCOME" {
            entry.income_cents = tot;
        } else {
            entry.expense_cents = tot;
        }
    }

    let mut data = Vec::with_capacity(12);
    for m in 1..=12 {
        let label = format!("{:04}-{:02}", year, m);
        let p = point_map.get(&m);
        let inc = p.map(|x| x.income_cents).unwrap_or(0);
        let exp = p.map(|x| x.expense_cents).unwrap_or(0);

        data.push(json!({
            "month": label,
            "income": to_reais(inc),
            "expenses": to_reais(exp),
            "net": to_reais(inc - exp),
            "incomeCents": inc,
            "expenseCents": exp,
        }));
    }

    ok_json(json!({
        "year": year,
        "data": data,
    }))
}
