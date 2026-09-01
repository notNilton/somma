use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use serde_json::json;

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

pub fn error_response(status: StatusCode, message: impl Into<String>) -> Response {
    (status, Json(ErrorResponse { error: message.into() })).into_response()
}

pub fn json_response<T: Serialize>(status: StatusCode, data: T) -> Response {
    (status, Json(data)).into_response()
}

pub fn ok_json<T: Serialize>(data: T) -> Response {
    (StatusCode::OK, Json(data)).into_response()
}

pub fn created_json<T: Serialize>(data: T) -> Response {
    (StatusCode::CREATED, Json(data)).into_response()
}

pub fn ok_flag() -> Response {
    (StatusCode::OK, Json(json!({ "ok": true }))).into_response()
}

pub fn created_flag() -> Response {
    (StatusCode::CREATED, Json(json!({ "ok": true }))).into_response()
}
