pub mod alerts;
pub mod analytics;
pub mod auth;
pub mod budgets;
pub mod categories;
pub mod dashboard;
pub mod goals;
pub mod import_tx;
pub mod settings;
pub mod transactions;
pub mod users;

use axum::{http::StatusCode, response::IntoResponse, Json};
use serde_json::json;

pub async fn health() -> impl IntoResponse {
    (StatusCode::OK, Json(json!({ "status": "ok" })))
}
