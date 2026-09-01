use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub name: Option<String>,
    pub phone: Option<String>,
    pub cpf: Option<String>,
    pub cnpj: Option<String>,
    pub avatar_url: Option<String>,
    pub privacy_mode_enabled: Option<bool>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub r#type: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub parent_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryWithChildren {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub r#type: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub parent_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub children: Vec<Category>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    pub id: Uuid,
    pub user_id: Uuid,
    pub category_id: Option<Uuid>,
    pub budget_id: Option<Uuid>,
    pub r#type: String,
    pub kind: String,
    pub status: String,
    pub amount_cents: i64,
    pub date: DateTime<Utc>,
    pub description: String,
    pub notes: Option<String>,
    pub currency_code: String,
    pub is_active: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_recurring: bool,
    pub recurrence_freq: Option<String>,
    pub recurrence_end_date: Option<NaiveDate>,
    pub recurring_origin_id: Option<Uuid>,
    pub goal_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionCategoryInfo {
    pub name: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub category_id: Option<Uuid>,
    pub budget_id: Option<Uuid>,
    pub r#type: String,
    pub kind: String,
    pub status: String,
    pub amount: f64,
    pub date: DateTime<Utc>,
    pub description: String,
    pub notes: Option<String>,
    pub currency_code: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_recurring: bool,
    pub recurrence_freq: Option<String>,
    pub recurrence_end_date: Option<String>,
    pub recurring_origin_id: Option<Uuid>,
    pub goal_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<TransactionCategoryInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Budget {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub allocated_amount_cents: i64,
    pub notes: Option<String>,
    pub is_active: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub target_amount_cents: i64,
    pub color: String,
    pub target_date: Option<NaiveDate>,
    pub is_achieved: bool,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
