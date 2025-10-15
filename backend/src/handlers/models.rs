use serde::Deserialize;
use serde::Serialize;
use async_graphql::{InputObject, SimpleObject};

#[derive(sqlx::FromRow, Serialize, SimpleObject)]
pub struct UserPnl {
    pub rank: i64,
    pub wallet_address: String,
    pub pnl: f64,
}

#[derive(Deserialize)]
pub struct LeaderboardQuery {
    pub limit: Option<i64>,
    pub page: Option<i64>,
}

#[derive(Deserialize, InputObject)]
pub struct LeaderboardInput {
    pub limit: Option<i64>,
    pub page: Option<i64>,
}