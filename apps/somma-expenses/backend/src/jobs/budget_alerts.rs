use chrono::Utc;
use sqlx::{PgPool, Row};
use tracing::error;
use uuid::Uuid;

pub async fn check_budget_alerts(db: &PgPool) {
    let now = Utc::now();
    let today = now.date_naive();

    struct BudgetRow {
        id: Uuid,
        user_id: Uuid,
        name: String,
        total_cents: i64,
        spent_cents: i64,
    }

    let rows = match sqlx::query(
        r#"
        SELECT b.id, b.user_id, b.name,
               COALESCE(b.allocated_amount_cents, 0)::bigint AS total_cents,
               COALESCE(s.spent_cents, 0)::bigint AS spent_cents
        FROM budgets b
        LEFT JOIN (
            SELECT budget_id,
                   SUM(CASE WHEN type = 'EXPENSE' THEN amount_cents ELSE 0 END)::bigint AS spent_cents
            FROM transactions
            WHERE is_active = true
              AND status = 'COMPLETED'
              AND budget_id IS NOT NULL
            GROUP BY budget_id
        ) s ON s.budget_id = b.id
        WHERE b.is_active = true
          AND COALESCE(b.allocated_amount_cents, 0) > 0
          AND COALESCE(s.spent_cents, 0) >= COALESCE(b.allocated_amount_cents, 0) * 0.80
        ORDER BY b.name ASC
        "#
    )
    .fetch_all(db)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            error!("jobs: budget alerts query error: {}", e);
            return;
        }
    };

    let budgets: Vec<BudgetRow> = rows
        .into_iter()
        .map(|r| BudgetRow {
            id: r.get("id"),
            user_id: r.get("user_id"),
            name: r.get("name"),
            total_cents: r.get("total_cents"),
            spent_cents: r.get("spent_cents"),
        })
        .collect();

    for b in budgets {
        let percent = (b.spent_cents as f64 / b.total_cents as f64) * 100.0;
        let thresholds = [80, 100];

        for threshold in thresholds {
            if percent < threshold as f64 {
                continue;
            }

            let exists_row = sqlx::query(
                r#"
                SELECT EXISTS(
                    SELECT 1 FROM budget_alerts
                    WHERE budget_id = $1
                      AND threshold_pct = $2
                      AND created_at::date = $3
                ) as exists
                "#,
            )
            .bind(b.id)
            .bind(threshold)
            .bind(today)
            .fetch_one(db)
            .await;

            let exists = match exists_row {
                Ok(r) => r.try_get("exists").unwrap_or(false),
                Err(_) => false,
            };

            if exists {
                continue;
            }

            let _ = sqlx::query(
                r#"
                INSERT INTO budget_alerts
                    (user_id, budget_id, budget_name, threshold_pct, percent_used, allocated_cents, spent_cents)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                "#,
            )
            .bind(b.user_id)
            .bind(b.id)
            .bind(b.name.clone())
            .bind(threshold)
            .bind(percent)
            .bind(b.total_cents)
            .bind(b.spent_cents)
            .execute(db)
            .await;
        }
    }
}
