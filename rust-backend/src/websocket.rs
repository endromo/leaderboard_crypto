// src/websocket.rs
use actix_ws::Session;
use futures_util::StreamExt;
use tokio::sync::broadcast;
use serde_json::json;

pub struct LeaderboardWebSocket {
    tx: broadcast::Sender<String>,
}

impl LeaderboardWebSocket {
    pub async fn handle_connection(&self, mut session: Session) {
        let mut rx = self.tx.subscribe();
        
        // Kirim update setiap 10 detik
        let update_interval = tokio::time::interval(std::time::Duration::from_secs(10));
        
        tokio::pin!(update_interval);
        
        loop {
            tokio::select! {
                _ = update_interval.tick() => {
                    let leaderboard_data = self.get_updated_leaderboard().await;
                    let _ = session.text(json!(leaderboard_data).to_string()).await;
                }
                msg = rx.recv() => {
                    if let Ok(msg) = msg {
                        let _ = session.text(msg).await;
                    }
                }
            }
        }
    }
}