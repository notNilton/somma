use axum::{
    extract::State,
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use serde::Deserialize;
use somma_common::{
    create_jwt, created_flag, error_response, make_clear_cookie_header, make_cookie_header, ok_flag, AuthClaims,
};
use sqlx::Row;
use uuid::Uuid;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct RegisterDto {
    pub email: String,
    pub password: String,
    pub name: Option<String>,
    pub phone: Option<String>,
    pub cpf: Option<String>,
    pub cnpj: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginDto {
    pub email: String,
    pub password: String,
}

pub async fn register(
    State(state): State<AppState>,
    Json(dto): Json<RegisterDto>,
) -> Response {
    if dto.email.trim().is_empty() || !dto.email.contains('@') {
        return error_response(StatusCode::BAD_REQUEST, "valid email required");
    }
    if dto.password.len() < 12 {
        return error_response(StatusCode::BAD_REQUEST, "password min 12 chars");
    }

    let password_hash = match hash(&dto.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let user_row = match sqlx::query(
        r#"
        INSERT INTO users (email, password_hash, name, phone, cpf, cnpj)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        "#,
    )
    .bind(dto.email.trim())
    .bind(password_hash)
    .bind(dto.name)
    .bind(dto.phone)
    .bind(dto.cpf)
    .bind(dto.cnpj)
    .fetch_one(&state.db)
    .await
    {
        Ok(row) => row,
        Err(sqlx::Error::Database(db_err)) if db_err.code().as_deref() == Some("23505") => {
            return error_response(StatusCode::CONFLICT, "email already in use");
        }
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let user_id: Uuid = user_row.get("id");

    let token = match create_jwt(&user_id.to_string(), dto.email.trim(), &state.jwt_secret) {
        Ok(t) => t,
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let cookie_val = make_cookie_header(&token, state.is_production, false);
    let mut resp = created_flag();
    if let Ok(hv) = HeaderValue::from_str(&cookie_val) {
        resp.headers_mut().insert(header::SET_COOKIE, hv);
    }

    resp
}

pub async fn login(
    State(state): State<AppState>,
    Json(dto): Json<LoginDto>,
) -> Response {
    if dto.email.trim().is_empty() || dto.password.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "email and password required");
    }

    let user_row = match sqlx::query("SELECT id, email, password_hash FROM users WHERE email = $1")
        .bind(dto.email.trim())
        .fetch_optional(&state.db)
        .await
    {
        Ok(Some(u)) => u,
        Ok(None) => return error_response(StatusCode::UNAUTHORIZED, "invalid credentials"),
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let user_id: Uuid = user_row.get("id");
    let user_email: String = user_row.get("email");
    let password_hash: String = user_row.get("password_hash");

    if verify(&dto.password, &password_hash).unwrap_or(false) == false {
        return error_response(StatusCode::UNAUTHORIZED, "invalid credentials");
    }

    let token = match create_jwt(&user_id.to_string(), &user_email, &state.jwt_secret) {
        Ok(t) => t,
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let cookie_val = make_cookie_header(&token, state.is_production, false);
    let mut resp = ok_flag();
    if let Ok(hv) = HeaderValue::from_str(&cookie_val) {
        resp.headers_mut().insert(header::SET_COOKIE, hv);
    }

    resp
}

pub async fn logout(
    State(state): State<AppState>,
    claims: Option<AuthClaims>,
) -> Response {
    if let Some(c) = claims {
        if !c.jti.is_empty() {
            let _ = sqlx::query("INSERT INTO revoked_tokens (jti) VALUES ($1) ON CONFLICT DO NOTHING")
                .bind(c.jti)
                .execute(&state.db)
                .await;
        }
    }

    let cookie_val = make_clear_cookie_header(state.is_production, false);
    let mut resp = StatusCode::NO_CONTENT.into_response();
    if let Ok(hv) = HeaderValue::from_str(&cookie_val) {
        resp.headers_mut().insert(header::SET_COOKIE, hv);
    }

    resp
}
