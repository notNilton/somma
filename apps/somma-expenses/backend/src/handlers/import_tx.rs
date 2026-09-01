use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    response::Response,
    Json,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use somma_common::{error_response, ok_json, to_cents, AuthClaims};
use sqlx::Row;
use std::collections::HashSet;
use uuid::Uuid;

use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportRowDto {
    pub date: String,
    pub description: String,
    pub amount: f64,
    pub r#type: String,
    #[serde(default)]
    pub potential_duplicate: bool,
}

fn parse_date(s: &str) -> Option<String> {
    let s = s.trim();
    for layout in &["%Y-%m-%d", "%d/%m/%Y", "%d/%m/%y", "%m/%d/%Y"] {
        if let Ok(d) = NaiveDate::parse_from_str(s, layout) {
            return Some(d.format("%Y-%m-%d").to_string());
        }
    }
    if s.len() >= 8 {
        if let Ok(d) = NaiveDate::parse_from_str(&s[..8], "%Y%m%d") {
            return Some(d.format("%Y-%m-%d").to_string());
        }
    }
    None
}

fn parse_csv_data(data: &[u8]) -> (Vec<ImportRowDto>, Vec<String>) {
    let raw = String::from_utf8_lossy(data);
    let delimiter = if raw.matches(';').count() > raw.matches(',').count() {
        b';'
    } else {
        b','
    };

    let mut rdr = csv::ReaderBuilder::new()
        .delimiter(delimiter)
        .flexible(true)
        .trim(csv::Trim::All)
        .from_reader(raw.as_bytes());

    let mut headers_map = std::collections::HashMap::new();
    if let Ok(headers) = rdr.headers() {
        for (i, h) in headers.iter().enumerate() {
            let clean = h.trim().to_lowercase();
            headers_map.insert(clean, i);
        }
    } else {
        return (Vec::new(), vec!["file must have a header row".to_string()]);
    }

    let date_idx = headers_map.get("date").copied();
    let amount_idx = headers_map.get("amount").copied();
    let desc_idx = headers_map.get("description").copied().or_else(|| headers_map.get("memo").copied());
    let type_idx = headers_map.get("type").copied();

    if date_idx.is_none() || amount_idx.is_none() {
        return (Vec::new(), vec!["CSV must have at least 'date' and 'amount' columns".to_string()]);
    }

    let date_col = date_idx.unwrap();
    let amount_col = amount_idx.unwrap();

    let mut rows = Vec::new();
    let mut errs = Vec::new();

    for (line_idx, record) in rdr.records().enumerate() {
        let line_num = line_idx + 2;
        let rec = match record {
            Ok(r) => r,
            Err(e) => {
                errs.push(format!("line {}: invalid csv row ({})", line_num, e));
                continue;
            }
        };

        let raw_date = rec.get(date_col).unwrap_or("").trim();
        let date_str = match parse_date(raw_date) {
            Some(d) => d,
            None => {
                errs.push(format!("line {}: invalid date '{}'", line_num, raw_date));
                continue;
            }
        };

        let raw_amt = rec.get(amount_col).unwrap_or("").trim().replace(',', ".");
        let mut amt = match raw_amt.parse::<f64>() {
            Ok(a) if a != 0.0 => a,
            _ => {
                errs.push(format!("line {}: invalid amount '{}'", line_num, raw_amt));
                continue;
            }
        };

        let raw_type = type_idx.and_then(|i| rec.get(i)).unwrap_or("").trim().to_uppercase();
        let mut tx_type = raw_type;
        if tx_type != "INCOME" && tx_type != "EXPENSE" {
            if amt < 0.0 {
                tx_type = "EXPENSE".to_string();
            } else {
                tx_type = "INCOME".to_string();
            }
        }
        if amt < 0.0 {
            amt = -amt;
        }

        let desc_val = desc_idx.and_then(|i| rec.get(i)).unwrap_or("").trim();
        let desc = if !desc_val.is_empty() {
            desc_val.to_string()
        } else if tx_type == "INCOME" {
            "Receita".to_string()
        } else {
            "Lançamento".to_string()
        };

        rows.push(ImportRowDto {
            date: date_str,
            description: desc,
            amount: amt,
            r#type: tx_type,
            potential_duplicate: false,
        });
    }

    (rows, errs)
}

pub async fn preview_import(
    State(state): State<AppState>,
    claims: AuthClaims,
    mut multipart: Multipart,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    let mut file_bytes = Vec::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() == Some("file") {
            if let Ok(bytes) = field.bytes().await {
                file_bytes = bytes.to_vec();
                break;
            }
        }
    }

    if file_bytes.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "missing 'file' field");
    }

    let (mut rows, errors) = parse_csv_data(&file_bytes);

    if !rows.is_empty() {
        let mut min_date = rows[0].date.clone();
        let mut max_date = rows[0].date.clone();

        for r in &rows[1..] {
            if r.date < min_date {
                min_date = r.date.clone();
            }
            if r.date > max_date {
                max_date = r.date.clone();
            }
        }

        let min_d = NaiveDate::parse_from_str(&min_date, "%Y-%m-%d").unwrap_or_default();
        let max_d = NaiveDate::parse_from_str(&max_date, "%Y-%m-%d").unwrap_or_default();

        if let Ok(existing_rows) = sqlx::query(
            r#"
            SELECT DATE(date)::text as d, amount_cents as c, type::text as t
            FROM transactions
            WHERE user_id = $1
              AND is_active = true
              AND date >= ($2::date - INTERVAL '2 days')
              AND date <= ($3::date + INTERVAL '2 days')
            "#,
        )
        .bind(user_uuid)
        .bind(min_d)
        .bind(max_d)
        .fetch_all(&state.db)
        .await
        {
            let mut existing_set = HashSet::new();
            for er in existing_rows {
                let d: String = er.try_get("d").unwrap_or_default();
                let c: i64 = er.try_get("c").unwrap_or(0);
                let t: String = er.try_get("t").unwrap_or_default();
                existing_set.insert((d, c, t));
            }

            for row in &mut rows {
                let cents = to_cents(row.amount);
                if existing_set.contains(&(row.date.clone(), cents, row.r#type.clone())) {
                    row.potential_duplicate = true;
                }
            }
        }
    }

    ok_json(json!({
        "rows": rows,
        "errors": errors
    }))
}

pub async fn confirm_import(
    State(state): State<AppState>,
    claims: AuthClaims,
    Json(rows): Json<Vec<ImportRowDto>>,
) -> Response {
    let user_uuid = match Uuid::parse_str(&claims.user_id) {
        Ok(u) => u,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "invalid user id"),
    };

    if rows.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "no rows to import");
    }
    if rows.len() > 2000 {
        return error_response(StatusCode::BAD_REQUEST, "too many rows (max 2000)");
    }

    let mut imported = 0;

    for r in rows {
        let tx_date = match NaiveDate::parse_from_str(&r.date, "%Y-%m-%d") {
            Ok(d) => DateTime::<Utc>::from_naive_utc_and_offset(d.and_hms_opt(12, 0, 0).unwrap(), Utc),
            Err(_) => continue,
        };

        let kind = if r.r#type == "INCOME" {
            "INCOME"
        } else {
            "EXPENSE"
        };

        let amount_cents = to_cents(r.amount);

        let res = sqlx::query(
            r#"
            INSERT INTO transactions (
                user_id, type, kind, status, amount_cents, date, description, currency_code
            ) VALUES ($1, $2::text::transaction_direction, $3::text::transaction_kind, 'COMPLETED', $4, $5, $6, 'BRL')
            "#,
        )
        .bind(user_uuid)
        .bind(r.r#type)
        .bind(kind)
        .bind(amount_cents)
        .bind(tx_date)
        .bind(r.description)
        .execute(&state.db)
        .await;

        if res.is_ok() {
            imported += 1;
        }
    }

    ok_json(json!({ "imported": imported }))
}
