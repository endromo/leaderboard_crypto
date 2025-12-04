// src/models.rs
use serde::{Deserialize, Serialize};
use async_graphql::SimpleObject;
use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct LeaderboardEntry {
    pub rank: i32,
    pub trader_wallet: String,
    pub account_value: BigDecimal,
    pub pnl: BigDecimal,
    pub roi: BigDecimal,
    pub volume: BigDecimal,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Trader {
    pub id: uuid::Uuid,
    pub wallet_address: String,
    pub created_at: DateTime<Utc>,
    pub last_active: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TraderPerformance {
    pub id: uuid::Uuid,
    pub trader_id: uuid::Uuid,
    pub account_value: BigDecimal,
    pub pnl: BigDecimal,
    pub roi: BigDecimal,
    pub volume: BigDecimal,
    pub calculated_at: DateTime<Utc>,
    pub timeframe: String,
}