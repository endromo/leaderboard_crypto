// src/schema.rs
use async_graphql::*;
use chrono::{DateTime, Utc};
use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};
use crate::repository::LeaderboardRepository;
use crate::models::LeaderboardEntry;

#[derive(SimpleObject, Serialize, Deserialize, Clone)]
pub struct LeaderboardEntry {
    #[graphql(name = "rank")]
    pub rank: i32,
    
    #[graphql(name = "traderWallet")]
    pub trader_wallet: String,
    
    #[graphql(name = "accountValue")]
    pub account_value: BigDecimal,
    
    #[graphql(name = "pnl")]
    pub pnl: BigDecimal,
    
    #[graphql(name = "roi")]
    pub roi: BigDecimal,
    
    #[graphql(name = "volume")]
    pub volume: BigDecimal,
    
    #[graphql(name = "lastUpdated")]
    pub last_updated: DateTime<Utc>,
}

#[derive(InputObject)]
pub struct LeaderboardFilter {
    pub limit: Option<i32>,
    pub offset: Option<i32>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Default)]
pub struct LeaderboardQuery;

#[Object]
impl LeaderboardQuery {
    async fn leaderboard(
        &self,
        ctx: &Context<'_>,
        filter: Option<LeaderboardFilter>,
    ) -> Result<Vec<LeaderboardEntry>> {
        let repo = ctx.data::<LeaderboardRepository>()?;
        let filter = filter.unwrap_or_default();
        
        let limit = filter.limit.unwrap_or(100);
        let offset = filter.offset.unwrap_or(0);
        let sort_by = filter.sort_by.as_deref().unwrap_or("roi");
        let sort_order = filter.sort_order.as_deref().unwrap_or("desc");
        
        let entries = repo.get_leaderboard(limit, offset, sort_by, sort_order)
            .await
            .map_err(|e| Error::new(e.to_string()))?;
        
        Ok(entries)
    }
    
    async fn trader_stats(
        &self,
        ctx: &Context<'_>,
        wallet_address: String,
    ) -> Result<LeaderboardEntry> {
        let repo = ctx.data::<LeaderboardRepository>()?;
        
        // Query untuk trader spesifik
        let entry = repo.get_trader_by_wallet(&wallet_address)
            .await
            .map_err(|e| Error::new(e.to_string()))?;
        
        Ok(entry)
    }
    
    async fn leaderboard_count(&self, ctx: &Context<'_>) -> Result<i32> {
        let repo = ctx.data::<LeaderboardRepository>()?;
        let count = repo.get_total_traders()
            .await
            .map_err(|e| Error::new(e.to_string()))?;
        
        Ok(count)
    }
}

#[derive(Default)]
pub struct LeaderboardMutation;

#[Object]
impl LeaderboardMutation {
    async fn refresh_leaderboard(&self, ctx: &Context<'_>) -> Result<bool> {
        let repo = ctx.data::<LeaderboardRepository>()?;
        repo.refresh_materialized_view()
            .await
            .map_err(|e| Error::new(e.to_string()))?;
        
        Ok(true)
    }
    
    async fn add_trader(
        &self,
        ctx: &Context<'_>,
        wallet_address: String,
    ) -> Result<bool> {
        let pool = ctx.data::<sqlx::PgPool>()?;
        
        sqlx::query!(
            r#"
            INSERT INTO traders (wallet_address)
            VALUES ($1)
            ON CONFLICT (wallet_address) DO UPDATE
            SET last_active = NOW()
            "#,
            wallet_address
        )
        .execute(pool)
        .await
        .map_err(|e| Error::new(e.to_string()))?;
        
        Ok(true)
    }
}

impl Default for LeaderboardFilter {
    fn default() -> Self {
        Self {
            limit: Some(100),
            offset: Some(0),
            sort_by: Some("roi".to_string()),
            sort_order: Some("desc".to_string()),
        }
    }
}