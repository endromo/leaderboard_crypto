use serde::Deserialize;
use serde::Serialize;

#[derive(sqlx::FromRow, Serialize)]
pub struct UserPnl {
    pub rank: i32,              // tambahkan field ini
    pub wallet_address: String,
    pub pnl: f64,
}

#[derive(Deserialize)]
pub struct LeaderboardQuery {
    pub limit: Option<i32>,
    pub page: Option<i32>,
}