use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Deserialize;
use somma_common::{created_json, error_response, ok_json, AuthClaims};
use sqlx::Row;
use std::collections::HashMap;
use uuid::Uuid;

use crate::models::{Category, CategoryWithChildren};
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateCategoryDto {
    pub name: String,
    pub r#type: String,
    pub description: Option<String>,
    pub color: Option<String>,
    #[serde(rename = "parentId")]
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryDto {
    pub name: Option<String>,
    pub r#type: Option<String>,
    pub description: Option<String>,
    pub color: Option<String>,
}

pub async fn list_categories(
    State(state): State<AppState>,
    claims: AuthClaims,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let rows = match sqlx::query(
        r#"
        SELECT id, user_id, name, type::text as "type", description, color, parent_id, created_at, updated_at
        FROM categories
        WHERE user_id = $1
        ORDER BY name ASC
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&state.db)
    .await
    {
        Ok(r) => r,
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let mut all_cats: HashMap<Uuid, CategoryWithChildren> = HashMap::new();
    let mut root_ids = Vec::new();

    for r in rows {
        let cat_id: Uuid = r.get("id");
        let parent_id: Option<Uuid> = r.try_get("parent_id").ok().flatten();

        let cat = Category {
            id: cat_id,
            user_id: r.get("user_id"),
            name: r.get("name"),
            r#type: r.get("type"),
            description: r.try_get("description").ok().flatten(),
            color: r.try_get("color").ok().flatten(),
            parent_id,
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        };

        if parent_id.is_none() {
            root_ids.push(cat_id);
        }

        all_cats.insert(
            cat_id,
            CategoryWithChildren {
                id: cat.id,
                user_id: cat.user_id,
                name: cat.name,
                r#type: cat.r#type,
                description: cat.description,
                color: cat.color,
                parent_id: cat.parent_id,
                created_at: cat.created_at,
                updated_at: cat.updated_at,
                children: Vec::new(),
            },
        );
    }

    let mut children_map: HashMap<Uuid, Vec<Category>> = HashMap::new();
    for (_id, cwc) in &all_cats {
        if let Some(pid) = cwc.parent_id {
            children_map.entry(pid).or_default().push(Category {
                id: cwc.id,
                user_id: cwc.user_id,
                name: cwc.name.clone(),
                r#type: cwc.r#type.clone(),
                description: cwc.description.clone(),
                color: cwc.color.clone(),
                parent_id: cwc.parent_id,
                created_at: cwc.created_at,
                updated_at: cwc.updated_at,
            });
        }
    }

    let mut roots = Vec::new();
    for rid in root_ids {
        if let Some(mut root) = all_cats.remove(&rid) {
            if let Some(mut ch) = children_map.remove(&rid) {
                ch.sort_by(|a, b| a.name.cmp(&b.name));
                root.children = ch;
            }
            roots.push(root);
        }
    }

    roots.sort_by(|a, b| a.name.cmp(&b.name));
    ok_json(roots)
}

pub async fn get_category(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let row = match sqlx::query(
        r#"
        SELECT id, user_id, name, type::text as "type", description, color, parent_id, created_at, updated_at
        FROM categories WHERE id = $1 AND user_id = $2
        "#,
    )
    .bind(id)
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "category not found"),
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let cat = Category {
        id: row.get("id"),
        user_id: row.get("user_id"),
        name: row.get("name"),
        r#type: row.get("type"),
        description: row.try_get("description").ok().flatten(),
        color: row.try_get("color").ok().flatten(),
        parent_id: row.try_get("parent_id").ok().flatten(),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    ok_json(cat)
}

pub async fn create_category(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(dto): Json<CreateCategoryDto>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let name = dto.name.trim();
    if name.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "name is required");
    }
    if name.len() > 50 {
        return error_response(StatusCode::BAD_REQUEST, "name max 50 chars");
    }
    if dto.r#type != "INCOME" && dto.r#type != "EXPENSE" {
        return error_response(StatusCode::BAD_REQUEST, "invalid category type");
    }

    let row = match sqlx::query(
        r#"
        INSERT INTO categories (user_id, name, type, description, color, parent_id)
        VALUES ($1, $2, $3::text::transaction_direction, $4, $5, $6)
        ON CONFLICT (user_id, name, type) DO UPDATE SET
            description = EXCLUDED.description,
            color = EXCLUDED.color,
            updated_at = NOW()
        RETURNING id, user_id, name, type::text as "type", description, color, parent_id, created_at, updated_at
        "#,
    )
    .bind(user_uuid)
    .bind(name)
    .bind(dto.r#type)
    .bind(dto.description)
    .bind(dto.color)
    .bind(dto.parent_id)
    .fetch_one(&state.db)
    .await
    {
        Ok(r) => r,
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, format!("internal error: {}", e)),
    };

    let cat = Category {
        id: row.get("id"),
        user_id: row.get("user_id"),
        name: row.get("name"),
        r#type: row.get("type"),
        description: row.try_get("description").ok().flatten(),
        color: row.try_get("color").ok().flatten(),
        parent_id: row.try_get("parent_id").ok().flatten(),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    created_json(cat)
}

pub async fn update_category(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
    Json(dto): Json<UpdateCategoryDto>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let row = match sqlx::query(
        r#"
        UPDATE categories SET
            name        = COALESCE(NULLIF($1,''), name),
            type        = COALESCE(NULLIF($2,'')::transaction_direction, type),
            description = COALESCE($3, description),
            color       = COALESCE($4, color),
            updated_at  = NOW()
        WHERE id = $5 AND user_id = $6
        RETURNING id, user_id, name, type::text as "type", description, color, parent_id, created_at, updated_at
        "#,
    )
    .bind(dto.name)
    .bind(dto.r#type)
    .bind(dto.description)
    .bind(dto.color)
    .bind(id)
    .bind(user_uuid)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return error_response(StatusCode::NOT_FOUND, "category not found"),
        Err(_) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };

    let cat = Category {
        id: row.get("id"),
        user_id: row.get("user_id"),
        name: row.get("name"),
        r#type: row.get("type"),
        description: row.try_get("description").ok().flatten(),
        color: row.try_get("color").ok().flatten(),
        parent_id: row.try_get("parent_id").ok().flatten(),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    };

    ok_json(cat)
}

pub async fn delete_category(
    State(state): State<AppState>,
    claims: AuthClaims,
    Path(id): Path<Uuid>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let res = sqlx::query("DELETE FROM categories WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_uuid)
        .execute(&state.db)
        .await;

    match res {
        Ok(tag) if tag.rows_affected() > 0 => StatusCode::NO_CONTENT.into_response(),
        Ok(_) => error_response(StatusCode::NOT_FOUND, "category not found"),
        Err(_) => error_response(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}
