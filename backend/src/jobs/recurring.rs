use chrono::{DateTime, Datelike, NaiveDate, Utc};
use sqlx::{PgPool, Row};
use tracing::{error, info};
use uuid::Uuid;

fn compute_next_date(base: NaiveDate, freq: &str) -> NaiveDate {
    match freq {
        "DAILY" => base + chrono::Duration::days(1),
        "WEEKLY" => base + chrono::Duration::weeks(1),
        "YEARLY" => {
            let y = base.year() + 1;
            let m = base.month();
            let d = base.day();
            NaiveDate::from_ymd_opt(y, m, d).unwrap_or_else(|| {
                NaiveDate::from_ymd_opt(y, m, 28).unwrap()
            })
        }
        _ => { // MONTHLY
            let (mut y, mut m) = (base.year(), base.month() + 1);
            if m > 12 {
                m = 1;
                y += 1;
            }
            let d = base.day().min(28);
            NaiveDate::from_ymd_opt(y, m, d).unwrap_or_else(|| {
                NaiveDate::from_ymd_opt(y, m, 28).unwrap()
            })
        }
    }
}

pub async fn spawn_recurring(db: &PgPool) {
    struct RecurringTemplate {
        id: Uuid,
        user_id: Uuid,
        category_id: Option<Uuid>,
        budget_id: Option<Uuid>,
        tx_type: String,
        kind: String,
        amount_cents: i64,
        description: String,
        notes: Option<String>,
        currency_code: String,
        recurrence_freq: Option<String>,
        recurrence_end_date: Option<NaiveDate>,
    }

    let rows = match sqlx::query(
        r#"
        SELECT id, user_id, category_id, budget_id, type::text as tx_type, kind::text as kind,
               amount_cents, description, notes, currency_code,
               recurrence_freq, recurrence_end_date
        FROM transactions
        WHERE is_active = true
          AND is_recurring = true
          AND recurring_origin_id IS NULL
          AND recurrence_freq IS NOT NULL
        "#
    )
    .fetch_all(db)
    .await
    {
        Ok(t) => t,
        Err(e) => {
            error!("jobs: recurring query error: {}", e);
            return;
        }
    };

    let templates: Vec<RecurringTemplate> = rows
        .into_iter()
        .map(|r| RecurringTemplate {
            id: r.get("id"),
            user_id: r.get("user_id"),
            category_id: r.try_get("category_id").ok().flatten(),
            budget_id: r.try_get("budget_id").ok().flatten(),
            tx_type: r.get("tx_type"),
            kind: r.get("kind"),
            amount_cents: r.get("amount_cents"),
            description: r.get("description"),
            notes: r.try_get("notes").ok().flatten(),
            currency_code: r.get("currency_code"),
            recurrence_freq: r.try_get("recurrence_freq").ok().flatten(),
            recurrence_end_date: r.try_get("recurrence_end_date").ok().flatten(),
        })
        .collect();

    let today = Utc::now().date_naive();
    let mut spawned = 0;

    for t in templates {
        let freq = t.recurrence_freq.as_deref().unwrap_or("MONTHLY");

        let latest_date_row = sqlx::query(
            r#"
            SELECT COALESCE(MAX(date)::date, '1970-01-01'::date) as latest_d
            FROM transactions
            WHERE (id = $1 OR recurring_origin_id = $1)
              AND is_active = true
            "#,
        )
        .bind(t.id)
        .fetch_one(db)
        .await;

        let latest_date = match latest_date_row {
            Ok(r) => r.try_get("latest_d").unwrap_or(today),
            Err(_) => today,
        };

        let mut next_date = compute_next_date(latest_date, freq);

        while next_date <= today {
            if let Some(end_date) = t.recurrence_end_date {
                if next_date > end_date {
                    break;
                }
            }

            let exists_row = sqlx::query(
                r#"
                SELECT EXISTS(
                    SELECT 1 FROM transactions
                    WHERE recurring_origin_id = $1
                      AND DATE(date) = $2
                      AND is_active = true
                ) as exists
                "#,
            )
            .bind(t.id)
            .bind(next_date)
            .fetch_one(db)
            .await;

            let exists = match exists_row {
                Ok(r) => r.try_get("exists").unwrap_or(false),
                Err(_) => false,
            };

            if !exists {
                let tx_dt = DateTime::<Utc>::from_naive_utc_and_offset(
                    next_date.and_hms_opt(12, 0, 0).unwrap(),
                    Utc,
                );

                let res = sqlx::query(
                    r#"
                    INSERT INTO transactions (
                        user_id, category_id, budget_id, type, kind, status,
                        amount_cents, date, description, notes, currency_code,
                        recurring_origin_id
                    ) VALUES ($1,$2,$3,$4::text::transaction_direction,$5::text::transaction_kind,'COMPLETED',$6,$7,$8,$9,$10,$11)
                    "#,
                )
                .bind(t.user_id)
                .bind(t.category_id)
                .bind(t.budget_id)
                .bind(t.tx_type.clone())
                .bind(t.kind.clone())
                .bind(t.amount_cents)
                .bind(tx_dt)
                .bind(t.description.clone())
                .bind(t.notes.clone())
                .bind(t.currency_code.clone())
                .bind(t.id)
                .execute(db)
                .await;

                if res.is_ok() {
                    spawned += 1;
                }
            }

            next_date = compute_next_date(next_date, freq);
        }
    }

    if spawned > 0 {
        info!("jobs: recurring: spawned {} transaction(s)", spawned);
    }
}
