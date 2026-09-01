pub mod analytics;
pub mod refuelings;
pub mod vehicles;

use axum::{http::StatusCode, response::IntoResponse, Json};
use serde_json::json;

pub async fn health() -> impl IntoResponse {
    (StatusCode::OK, Json(json!({ "status": "ok" })))
}
