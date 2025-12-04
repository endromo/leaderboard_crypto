// src/cache.rs
use redis::{Client, AsyncCommands};
use serde_json;
use crate::models::LeaderboardEntry;

pub struct LeaderboardCache {
    client: Client,
}

impl LeaderboardCache {
    pub async fn get_cached_leaderboard(&self, key: &str) -> Option<Vec<LeaderboardEntry>> {
        let mut conn = self.client.get_async_connection().await.ok()?;
        let data: String = conn.get(key).await.ok()?;
        serde_json::from_str(&data).ok()
    }
    
    pub async fn cache_leaderboard(&self, key: &str, data: &[LeaderboardEntry], ttl: usize) {
        if let Ok(mut conn) = self.client.get_async_connection().await {
            let json = serde_json::to_string(data).unwrap();
            let _ = conn.set_ex(key, json, ttl).await;
        }
    }
}