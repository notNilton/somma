mod handlers;
mod models;

use axum::{
    extract::FromRef,
    routing::{delete, get, post, put},
    Router,
};
use somma_common::{connect, AuthState};
use sqlx::PgPool;
use std::env;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub auth: AuthState,
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
                .unwrap_or_else(|_| "info,somma_vehicles_backend=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let env_name = env::var("ENV").unwrap_or_else(|_| "development".to_string());
    let is_dev = env_name == "development";
    let port = env::var("PORT").unwrap_or_else(|_| "3310".to_string());
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let jwt_secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    info!("Starting somma-vehicles backend service on port {}", port);

    let db = connect(&database_url).await?;

    let auth_state = AuthState {
        jwt_secret,
        db: db.clone(),
        is_dev,
    };

    let app_state = AppState {
        db,
        auth: auth_state,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/health", get(handlers::health))
        .route("/api/vehicles", get(handlers::vehicles::list_vehicles))
        .route("/api/vehicles", post(handlers::vehicles::create_vehicle))
        .route("/api/vehicles/:id", get(handlers::vehicles::get_vehicle))
        .route("/api/vehicles/:id", put(handlers::vehicles::update_vehicle))
        .route("/api/vehicles/:id", delete(handlers::vehicles::delete_vehicle))
        .route("/api/refuelings", get(handlers::refuelings::list_refuelings))
        .route("/api/refuelings", post(handlers::refuelings::create_refueling))
        .route("/api/refuelings/:id", put(handlers::refuelings::update_refueling))
        .route("/api/refuelings/:id", delete(handlers::refuelings::delete_refueling))
        .route("/api/analytics", get(handlers::analytics::get_analytics))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(app_state);

    let addr: SocketAddr = format!("0.0.0.0:{}", port).parse()?;
    info!("somma-vehicles API listening at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
