use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use serde::Deserialize;
use serde_json::json;
use somma_common::{error_response, ok_json, to_cents, to_reais, AuthClaims};
use sqlx::Row;
use uuid::Uuid;

use crate::handlers::users::{UpdateUserDto, UserDto};
use crate::models::User;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct ChangePasswordDto {
    #[serde(rename = "currentPassword")]
    pub current_password: String,
    #[serde(rename = "newPassword")]
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct DeleteAccountDto {
    #[serde(rename = "currentPassword")]
    pub current_password: String,
}

#[derive(Debug, Deserialize)]
pub struct InitialBalanceDto {
    #[serde(rename = "initialBalance")]
    pub initial_balance: f64,
}

pub async fn get_profile(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let user_row = match sqlx::query(
        r#"
        SELECT id, email, name, phone, cpf, cnpj, avatar_url, privacy_mode_enabled, created_at, updated_at
        FROM users WHERE id = $1
        "#,
    )
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(u)) => u,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "user not found"),
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let user = User {
        id: user_row.get("id"),
        email: user_row.get("email"),
        name: user_row.get("name"),
        phone: user_row.get("phone"),
        cpf: user_row.get("cpf"),
        cnpj: user_row.get("cnpj"),
        avatar_url: user_row.get("avatar_url"),
        privacy_mode_enabled: user_row.get("privacy_mode_enabled"),
        created_at: user_row.get("created_at"),
        updated_at: user_row.get("updated_at"),
    };

    ok_json(UserDto::from(user))
}

pub async fn update_profile(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(dto): Json<UpdateUserDto>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    if let Some(ref email) = dto.email {
        if !email.contains('@') {
            return error_response(StatusCode::BAD_REQUEST, "invalid email");
        }
    }

    let user_row = match sqlx::query(
        r#"
        UPDATE users SET
            email                = COALESCE($1, email),
            name                 = COALESCE($2, name),
            avatar_url           = COALESCE($3, avatar_url),
            privacy_mode_enabled = COALESCE($4, privacy_mode_enabled),
            updated_at           = NOW()
        WHERE id = $5
        RETURNING id, email, name, phone, cpf, cnpj, avatar_url, privacy_mode_enabled, created_at, updated_at
        "#,
    )
    .bind(dto.email)
    .bind(dto.name)
    .bind(dto.avatar_url)
    .bind(dto.privacy_mode_enabled)
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(u)) => u,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "user not found"),
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let user = User {
        id: user_row.get("id"),
        email: user_row.get("email"),
        name: user_row.get("name"),
        phone: user_row.get("phone"),
        cpf: user_row.get("cpf"),
        cnpj: user_row.get("cnpj"),
        avatar_url: user_row.get("avatar_url"),
        privacy_mode_enabled: user_row.get("privacy_mode_enabled"),
        created_at: user_row.get("created_at"),
        updated_at: user_row.get("updated_at"),
    };

    ok_json(UserDto::from(user))
}

pub async fn change_password(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(dto): Json<ChangePasswordDto>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    if dto.current_password.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "currentPassword is required");
    }
    if dto.new_password.len() < 12 {
        return error_response(StatusCode::BAD_REQUEST, "newPassword min 12 chars");
    }

    let user_row = match sqlx::query("SELECT password_hash FROM users WHERE id = $1")
        .bind(user_uuid)
        .fetch_optional(&state.db)
        .await
    {
        Ok(Some(h)) => h,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "user not found"),
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let password_hash: String = user_row.get("password_hash");

    if verify(&dto.current_password, &password_hash).unwrap_or(false) == false {
        return error_response(StatusCode::BAD_REQUEST, "incorrect current password");
    }

    let new_hash = match hash(&dto.new_password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let _ = sqlx::query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
        .bind(new_hash)
        .bind(user_uuid)
        .execute(&state.db)
        .await;

    StatusCode::NO_CONTENT.into_response()
}

pub async fn get_initial_balance(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let row = match sqlx::query("SELECT initial_balance_cents FROM users WHERE id = $1")
        .bind(user_uuid)
        .fetch_optional(&state.db)
        .await
    {
        Ok(Some(c)) => c,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "user not found"),
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let cents: i64 = row.try_get("initial_balance_cents").unwrap_or(0);
    ok_json(json!({ "initialBalance": to_reais(cents) }))
}

pub async fn update_initial_balance(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(dto): Json<InitialBalanceDto>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let cents = to_cents(dto.initial_balance);

    let _ = sqlx::query("UPDATE users SET initial_balance_cents = $1, updated_at = NOW() WHERE id = $2")
        .bind(cents)
        .bind(user_uuid)
        .execute(&state.db)
        .await;

    ok_json(json!({ "initialBalance": to_reais(cents) }))
}

pub async fn delete_my_account(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(dto): Json<DeleteAccountDto>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    if dto.current_password.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "currentPassword required");
    }

    let user_row = match sqlx::query("SELECT password_hash FROM users WHERE id = $1")
        .bind(user_uuid)
        .fetch_optional(&state.db)
        .await
    {
        Ok(Some(h)) => h,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "user not found"),
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let password_hash: String = user_row.get("password_hash");

    if verify(&dto.current_password, &password_hash).unwrap_or(false) == false {
        return error_response(StatusCode::FORBIDDEN, "incorrect password");
    }

    let _ = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_uuid)
        .execute(&state.db)
        .await;

    StatusCode::NO_CONTENT.into_response()
}
