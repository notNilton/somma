mod handlers;
mod jobs;
mod models;

use axum::{
    extract::FromRef,
    routing::{delete, get, patch, post},
    Router,
};
use somma_common::{connect, AuthState};
use sqlx::PgPool;
use std::env;
use std::net::SocketAddr;
use tower_http::cors::{AllowOrigin, Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub auth: AuthState,
    pub jwt_secret: String,
    pub is_production: bool,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth.clone()
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = dotenvy::dotenv();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,somma_expenses_backend=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let env_name = env::var("ENV").unwrap_or_else(|_| "development".to_string());
    let is_production = env_name == "production";
    let port = env::var("PORT").unwrap_or_else(|_| "3300".to_string());
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let webapp_url = env::var("WEBAPP_URL").unwrap_or_else(|_| "http://localhost:3400".to_string());

    info!("STARTING EXPENSES BACKEND (RUST AXUM)");

    let db = connect(&database_url).await?;

    // Start background jobs scheduler
    let scheduler = jobs::Scheduler::new(db.clone());
    scheduler.start();

    let auth_state = AuthState {
        jwt_secret: jwt_secret.clone(),
        db: db.clone(),
        is_dev: !is_production,
    };

    let app_state = AppState {
        db,
        auth: auth_state,
        jwt_secret,
        is_production,
    };

    let cors = if is_production {
        if let Ok(origin) = webapp_url.parse() {
            CorsLayer::new()
                .allow_origin(AllowOrigin::exact(origin))
                .allow_methods(Any)
                .allow_headers(Any)
                .allow_credentials(true)
        } else {
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
        }
    } else {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    };

    let app = Router::new()
        // Health
        .route("/api/health", get(handlers::health))
        // Auth
        .route("/api/auth/register", post(handlers::auth::register))
        .route("/api/auth/login", post(handlers::auth::login))
        .route("/api/auth/logout", post(handlers::auth::logout))
        // Users
        .route("/api/users/me", get(handlers::users::get_me))
        .route("/api/users/me", patch(handlers::users::update_me))
        // Categories
        .route("/api/v1/categories", get(handlers::categories::list_categories))
        .route("/api/v1/categories", post(handlers::categories::create_category))
        .route("/api/v1/categories/:id", get(handlers::categories::get_category))
        .route("/api/v1/categories/:id", patch(handlers::categories::update_category))
        .route("/api/v1/categories/:id", delete(handlers::categories::delete_category))
        // Transactions
        .route("/api/v1/transactions", get(handlers::transactions::list_transactions))
        .route("/api/v1/transactions", post(handlers::transactions::create_transaction))
        .route("/api/v1/transactions/future", get(handlers::transactions::list_future_transactions))
        .route("/api/v1/transactions/:id", get(handlers::transactions::get_transaction))
        .route("/api/v1/transactions/:id", patch(handlers::transactions::update_transaction))
        .route("/api/v1/transactions/:id", delete(handlers::transactions::delete_transaction))
        .route("/api/v1/transactions/:id/restore", patch(handlers::transactions::restore_transaction))
        // Budgets
        .route("/api/v1/budgets", get(handlers::budgets::list_budgets))
        .route("/api/v1/budgets", post(handlers::budgets::create_budget))
        .route("/api/v1/budgets/:id", patch(handlers::budgets::update_budget))
        .route("/api/v1/budgets/:id", delete(handlers::budgets::delete_budget))
        // Dashboard & Analytics
        .route("/api/v1/dashboard", get(handlers::dashboard::get_dashboard))
        .route("/api/v1/dashboard/monthly-evolution", get(handlers::analytics::get_monthly_evolution))
        .route("/api/v1/dashboard/category-breakdown", get(handlers::analytics::get_category_breakdown))
        .route("/api/v1/analytics/annual-evolution", get(handlers::analytics::get_annual_evolution))
        .route("/api/v1/analytics/trends", get(handlers::analytics::get_trends))
        // Settings
        .route("/api/v1/settings/profile", get(handlers::settings::get_profile))
        .route("/api/v1/settings/profile", patch(handlers::settings::update_profile))
        .route("/api/v1/settings/change-password", patch(handlers::settings::change_password))
        .route("/api/v1/settings/account", delete(handlers::settings::delete_my_account))
        .route("/api/v1/settings/initial-balance", get(handlers::settings::get_initial_balance))
        .route("/api/v1/settings/initial-balance", patch(handlers::settings::update_initial_balance))
        // Import
        .route("/api/v1/import/preview", post(handlers::import_tx::preview_import))
        .route("/api/v1/import/confirm", post(handlers::import_tx::confirm_import))
        // Goals
        .route("/api/v1/goals", get(handlers::goals::list_goals))
        .route("/api/v1/goals", post(handlers::goals::create_goal))
        .route("/api/v1/goals/:id", patch(handlers::goals::update_goal))
        .route("/api/v1/goals/:id", delete(handlers::goals::delete_goal))
        // Alerts
        .route("/api/v1/alerts", get(handlers::alerts::list_alerts))
        .route("/api/v1/alerts/:id/read", patch(handlers::alerts::mark_alert_read))
        .route("/api/v1/alerts", delete(handlers::alerts::clear_read_alerts))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(app_state);

    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse()?;
    info!("Expenses API listening at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
