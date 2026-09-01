use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{header, request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{PgPool, Row};
use uuid::Uuid;

pub const SESSION_COOKIE_NAME: &str = "somma_session";
pub const DEV_USER_ID: &str = "d290f1ee-6c54-4b01-90e6-d701748f0851";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    #[serde(default)]
    pub email: String,
    #[serde(default)]
    pub jti: String,
    pub exp: usize,
    pub iat: usize,
}

#[derive(Debug, Clone)]
pub struct AuthClaims {
    pub user_id: String,
    pub email: String,
    pub jti: String,
}

#[derive(Clone)]
pub struct AuthState {
    pub jwt_secret: String,
    pub db: PgPool,
    pub is_dev: bool,
}

pub fn generate_jti() -> String {
    Uuid::new_v4().to_string()
}

pub fn create_jwt(user_id: &str, email: &str, secret: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let now = chrono::Utc::now().timestamp() as usize;
    let exp = now + 7 * 24 * 60 * 60; // 7 days
    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        jti: generate_jti(),
        exp,
        iat: now,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

pub fn extract_token_from_parts(parts: &Parts) -> Option<String> {
    if let Some(auth_header) = parts.headers.get(header::AUTHORIZATION) {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                if !token.trim().is_empty() {
                    return Some(token.trim().to_string());
                }
            }
        }
    }

    if let Some(cookie_header) = parts.headers.get(header::COOKIE) {
        if let Ok(cookie_str) = cookie_header.to_str() {
            for cookie in cookie_str.split(';') {
                let parts: Vec<&str> = cookie.trim().splitn(2, '=').collect();
                if parts.len() == 2 && parts[0] == SESSION_COOKIE_NAME {
                    if !parts[1].trim().is_empty() {
                        return Some(parts[1].trim().to_string());
                    }
                }
            }
        }
    }

    None
}

pub async fn validate_token(
    token_str: &str,
    secret: &str,
    db: Option<&PgPool>,
) -> Result<AuthClaims, (StatusCode, &'static str)> {
    let mut validation = Validation::default();
    validation.validate_exp = true;

    let token_data = decode::<Claims>(
        token_str,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, "invalid session"))?;

    let claims = token_data.claims;
    if claims.sub.is_empty() {
        return Err((StatusCode::UNAUTHORIZED, "invalid session claims"));
    }

    if let Some(pool) = db {
        if !claims.jti.is_empty() {
            let row = sqlx::query("SELECT EXISTS(SELECT 1 FROM revoked_tokens WHERE jti = $1) as revoked")
                .bind(&claims.jti)
                .fetch_one(pool)
                .await;

            if let Ok(r) = row {
                let is_revoked: bool = r.try_get("revoked").unwrap_or(false);
                if is_revoked {
                    return Err((StatusCode::UNAUTHORIZED, "session revoked"));
                }
            }
        }
    }

    Ok(AuthClaims {
        user_id: claims.sub,
        email: claims.email,
        jti: claims.jti,
    })
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthClaims
where
    S: Send + Sync,
    AuthState: axum::extract::FromRef<S>,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        use axum::extract::FromRef;
        let auth_state = AuthState::from_ref(state);

        let token_opt = extract_token_from_parts(parts);

        match token_opt {
            Some(token) => {
                match validate_token(&token, &auth_state.jwt_secret, Some(&auth_state.db)).await {
                    Ok(claims) => Ok(claims),
                    Err((status, msg)) => {
                        if auth_state.is_dev {
                            Ok(AuthClaims {
                                user_id: DEV_USER_ID.to_string(),
                                email: "nilton.naab@gmail.com".to_string(),
                                jti: "dev-jti".to_string(),
                            })
                        } else {
                            Err((status, Json(json!({ "error": msg }))).into_response())
                        }
                    }
                }
            }
            None => {
                if auth_state.is_dev {
                    Ok(AuthClaims {
                        user_id: DEV_USER_ID.to_string(),
                        email: "nilton.naab@gmail.com".to_string(),
                        jti: "dev-jti".to_string(),
                    })
                } else {
                    Err((
                        StatusCode::UNAUTHORIZED,
                        Json(json!({ "error": "missing session" })),
                    )
                        .into_response())
                }
            }
        }
    }
}

pub fn make_cookie_header(token: &str, is_production: bool, is_secure: bool) -> String {
    let same_site = if is_production { "Strict" } else { "Lax" };
    let secure_flag = if is_production || is_secure { "; Secure" } else { "" };
    let max_age = 7 * 24 * 60 * 60;
    format!(
        "{}={}; Path=/; HttpOnly; SameSite={}{}; Max-Age={}",
        SESSION_COOKIE_NAME, token, same_site, secure_flag, max_age
    )
}

pub fn make_clear_cookie_header(is_production: bool, is_secure: bool) -> String {
    let same_site = if is_production { "Strict" } else { "Lax" };
    let secure_flag = if is_production || is_secure { "; Secure" } else { "" };
    format!(
        "{}={}; Path=/; HttpOnly; SameSite={}{}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        SESSION_COOKIE_NAME, "", same_site, secure_flag
    )
}
