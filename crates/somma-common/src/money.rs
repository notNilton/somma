pub fn to_cents(reais: f64) -> i64 {
    (reais * 100.0).round() as i64
}

pub fn to_reais(cents: i64) -> f64 {
    cents as f64 / 100.0
}
