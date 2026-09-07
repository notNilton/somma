use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Response,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::json;
use somma_common::{error_response, ok_json, to_reais, AuthClaims};
use sqlx::Row;
use uuid::Uuid;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct DashboardQuery {
    pub month: Option<String>,
}

pub async fn get_dashboard(
    State(state): State<AppState>,
    claims: AuthClaims,
    Query(query): Query<DashboardQuery>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let month = query
        .month
        .unwrap_or_else(|| Utc::now().format("%Y-%m").to_string());
    let month_date = format!("{}-01", month);

    // 1. User name
    let user_name_row = sqlx::query("SELECT COALESCE(name, email) as name FROM users WHERE id = $1")
        .bind(user_uuid)
        .fetch_optional(&state.db)
        .await;

    let user_name: String = match user_name_row {
        Ok(Some(r)) => r.try_get("name").unwrap_or_else(|_| "User".to_string()),
        _ => "User".to_string(),
    };

    let display_name = match user_name.split_whitespace().next() {
        Some(first) => first.to_string(),
        None => user_name,
    };

    // 2. Initial balance
    let init_row = sqlx::query("SELECT initial_balance_cents FROM users WHERE id = $1")
        .bind(user_uuid)
        .fetch_optional(&state.db)
        .await;

    let initial_balance_cents: i64 = match init_row {
        Ok(Some(r)) => r.try_get("initial_balance_cents").unwrap_or(0),
        _ => 0,
    };

    // 3. Total balance
    let tx_row = sqlx::query(
        r#"
        SELECT COALESCE(SUM(
            CASE
                WHEN type = 'INCOME' THEN amount_cents
                WHEN type = 'EXPENSE' THEN -amount_cents
                ELSE 0
            END
        ), 0)::bigint as tx_balance
        FROM transactions
        WHERE user_id = $1
          AND is_active = true
          AND status = 'COMPLETED'
        "#,
    )
    .bind(user_uuid)
    .fetch_one(&state.db)
    .await;

    let tx_balance_cents: i64 = match tx_row {
        Ok(r) => r.try_get("tx_balance").unwrap_or(0),
        _ => 0,
    };

    let total_balance_cents = initial_balance_cents + tx_balance_cents;

    // 4. Monthly income and expenses
    let mut monthly_income_cents: i64 = 0;
    let mut monthly_expenses_cents: i64 = 0;

    let month_naive = chrono::NaiveDate::parse_from_str(&month_date, "%Y-%m-%d")
        .unwrap_or_else(|_| chrono::NaiveDate::from_ymd_opt(2026, 1, 1).unwrap());

    if let Ok(rows) = sqlx::query(
        r#"
        SELECT type::text as tx_type, COALESCE(SUM(amount_cents), 0)::bigint as cents
        FROM transactions
        WHERE user_id = $1
          AND is_active = true
          AND type IN ('INCOME', 'EXPENSE')
          AND status = 'COMPLETED'
          AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date)
        GROUP BY type
        "#,
    )
    .bind(user_uuid)
    .bind(month_naive)
    .fetch_all(&state.db)
    .await
    {
        for r in rows {
            let t: String = r.try_get("tx_type").unwrap_or_default();
            let c: i64 = r.try_get("cents").unwrap_or(0);
            if t == "INCOME" {
                monthly_income_cents = c;
            } else if t == "EXPENSE" {
                monthly_expenses_cents = c;
            }
        }
    }

    // 5. Recent 5 transactions
    let mut recent_txs = Vec::new();
    if let Ok(rows) = sqlx::query(
        r#"
        SELECT t.id, t.description, t.amount_cents, t.type::text AS tx_type, t.date,
               c.name AS category_name, c.color AS category_color
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.user_id = $1 AND t.is_active = true
        ORDER BY t.date DESC LIMIT 5
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&state.db)
    .await
    {
        for r in rows {
            let tx_id: Uuid = r.get("id");
            let desc: String = r.get("description");
            let cents: i64 = r.get("amount_cents");
            let t_type: String = r.get("tx_type");
            let dt: DateTime<Utc> = r.get("date");
            let cat_name: Option<String> = r.try_get("category_name").ok().flatten();
            let cat_color: Option<String> = r.try_get("category_color").ok().flatten();

            recent_txs.push(json!({
                "id": tx_id,
                "description": desc,
                "amount": to_reais(cents),
                "type": t_type,
                "date": dt,
                "category": {
                    "name": cat_name,
                    "color": cat_color
                }
            }));
        }
    }

    // 6. Cash flow (last 7 days)
    let mut cash_flow = Vec::new();
    if let Ok(rows) = sqlx::query(
        r#"
        SELECT DATE(date) AS day, SUM(amount_cents)::bigint AS total
        FROM transactions
        WHERE user_id = $1
          AND is_active = true
          AND status = 'COMPLETED'
          AND date >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(date)
        ORDER BY day
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&state.db)
    .await
    {
        for r in rows {
            let day: chrono::NaiveDate = match r.try_get("day") {
                Ok(d) => d,
                Err(_) => continue,
            };
            let total_c: i64 = r.try_get("total").unwrap_or(0);
            cash_flow.push(json!({
                "day": day.format("%Y-%m-%d").to_string(),
                "value": to_reais(total_c)
            }));
        }
    }

    let safe_to_spend_cents = total_balance_cents - monthly_expenses_cents;

    ok_json(json!({
        "userName": display_name,
        "month": month,
        "totalBalance": to_reais(total_balance_cents),
        "monthlyIncome": to_reais(monthly_income_cents),
        "monthlyExpenses": to_reais(monthly_expenses_cents),
        "safeToSpend": to_reais(safe_to_spend_cents),
        "recentTransactions": recent_txs,
        "cashFlow": cash_flow
    }))
}
