use axum::{
    extract::State,
    http::StatusCode,
    response::Response,
    Json,
};
use serde::{Deserialize, Serialize};
use somma_common::{error_response, ok_json, AuthClaims};
use sqlx::Row;
use uuid::Uuid;

use crate::models::User;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct UpdateUserDto {
    pub email: Option<String>,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub privacy_mode_enabled: Option<bool>,
}

fn mask_string(s: &Option<String>, keep: usize) -> Option<String> {
    s.as_ref().map(|v| {
        if v.len() <= keep {
            v.clone()
        } else {
            format!("{}***", &v[..keep])
        }
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserDto {
    pub id: Uuid,
    pub email: String,
    pub name: Option<String>,
    pub phone: Option<String>,
    pub cpf: Option<String>,
    pub cnpj: Option<String>,
    pub avatar_url: Option<String>,
    pub privacy_mode_enabled: Option<bool>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<User> for UserDto {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            email: u.email,
            name: u.name,
            phone: mask_string(&u.phone, 4),
            cpf: mask_string(&u.cpf, 3),
            cnpj: mask_string(&u.cnpj, 4),
            avatar_url: u.avatar_url,
            privacy_mode_enabled: u.privacy_mode_enabled,
            created_at: u.created_at,
            updated_at: u.updated_at,
        }
    }
}

pub async fn get_me(
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

pub async fn update_me(
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
            email               = COALESCE($1, email),
            name                = COALESCE($2, name),
            avatar_url          = COALESCE($3, avatar_url),
            privacy_mode_enabled = COALESCE($4, privacy_mode_enabled),
            updated_at          = NOW()
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
