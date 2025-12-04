// src/repository/leaderboard_repo.rs
use sqlx::{PgPool, Row};
use bigdecimal::BigDecimal;
use crate::models::LeaderboardEntry;

pub struct LeaderboardRepository {
    pool: PgPool,
}

impl LeaderboardRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
    
    pub async fn get_leaderboard(
        &self,
        limit: i32,
        offset: i32,
        sort_by: &str,
        sort_order: &str,
    ) -> Result<Vec<LeaderboardEntry>, sqlx::Error> {
        let order_clause = match sort_by {
            "pnl" => "pnl",
            "roi" => "roi",
            "volume" => "volume",
            _ => "roi",
        };
        
        let order_dir = if sort_order.to_lowercase() == "asc" { "ASC" } else { "DESC" };
        
        let query = format!(
            r#"
            SELECT 
                ROW_NUMBER() OVER (ORDER BY {} {}) as rank,
                trader_wallet,
                account_value,
                pnl,
                roi,
                volume,
                last_updated
            FROM realtime_leaderboard
            ORDER BY {} {}
            LIMIT $1 OFFSET $2
            "#,
            order_clause, order_dir, order_clause, order_dir
        );
        
        sqlx::query_as(&query)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
    }
    
    pub async fn refresh_materialized_view(&self) -> Result<(), sqlx::Error> {
        sqlx::query("REFRESH MATERIALIZED VIEW CONCURRENTLY realtime_leaderboard")
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}