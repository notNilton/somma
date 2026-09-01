pub mod budget_alerts;
pub mod recurring;

use chrono::Utc;
use sqlx::PgPool;
use std::time::Duration;
use tracing::info;

pub struct Scheduler {
    db: PgPool,
}

impl Scheduler {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub fn start(self) {
        info!("jobs: scheduler started");

        let db1 = self.db.clone();
        tokio::spawn(async move {
            run_at(0, 5, "budget-alerts", || {
                let db = db1.clone();
                async move {
                    budget_alerts::check_budget_alerts(&db).await;
                }
            })
            .await;
        });

        let db2 = self.db.clone();
        tokio::spawn(async move {
            run_at(0, 1, "recurring-transactions", || {
                let db = db2.clone();
                async move {
                    recurring::spawn_recurring(&db).await;
                }
            })
            .await;
        });
    }
}

async fn run_at<F, Fut>(hour: u32, minute: u32, name: &'static str, f: F)
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = ()>,
{
    loop {
        let now = Utc::now();
        let mut next = now
            .date_naive()
            .and_hms_opt(hour, minute, 0)
            .unwrap()
            .and_local_timezone(Utc)
            .unwrap();

        if now >= next {
            next = (now.date_naive() + chrono::Duration::days(1))
                .and_hms_opt(hour, minute, 0)
                .unwrap()
                .and_local_timezone(Utc)
                .unwrap();
        }

        let duration = match (next - now).to_std() {
            Ok(d) => d,
            Err(_) => Duration::from_secs(60),
        };

        tokio::time::sleep(duration).await;
        info!("jobs: running {}", name);
        f().await;
    }
}
