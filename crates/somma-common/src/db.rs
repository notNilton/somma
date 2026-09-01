use sqlx::postgres::{PgPool, PgPoolOptions};
use std::time::Duration;
use tracing::{info, warn};

pub async fn connect(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let mut attempts = 0;
    let max_attempts = 5;

    loop {
        attempts += 1;
        match PgPoolOptions::new()
            .max_connections(20)
            .acquire_timeout(Duration::from_secs(5))
            .connect(database_url)
            .await
        {
            Ok(pool) => {
                info!("Database connected successfully on attempt {}", attempts);
                return Ok(pool);
            }
            Err(e) => {
                if attempts >= max_attempts {
                    return Err(e);
                }
                warn!(
                    "Failed to connect to database (attempt {}/{}): {}. Retrying in 2s...",
                    attempts, max_attempts, e
                );
                tokio::time::sleep(Duration::from_secs(2)).await;
            }
        }
    }
}
