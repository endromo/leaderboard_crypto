// src/main.rs
mod schema;
mod repository;
mod cache;
mod websocket;
mod models;

use actix_cors::Cors;
use actix_web::{web, App, HttpServer, middleware::Logger};
use async_graphql::{EmptyMutation, EmptySubscription, Schema};
use async_graphql_actix_web::{GraphQL, GraphQLSubscription};
use sqlx::postgres::PgPoolOptions;
use dotenv::dotenv;
use std::env;
use std::sync::Arc;
use tokio::sync::broadcast;
use crate::schema::{LeaderboardQuery, LeaderboardMutation};
use crate::repository::LeaderboardRepository;
use crate::cache::LeaderboardCache;

// State yang akan dibagikan ke seluruh aplikasi
pub struct AppState {
    pool: sqlx::PgPool,
    leaderboard_repo: Arc<LeaderboardRepository>,
    cache: Arc<LeaderboardCache>,
    ws_tx: broadcast::Sender<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment variables
    dotenv().ok();
    
    // Setup logging
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    
    // Database connection pool
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    log::info!("Connecting to database...");
    
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await
        .expect("Failed to create pool");
    
    log::info!("Database connected successfully");
    
    // Run migrations
    log::info!("Running database migrations...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
    
    // Initialize Redis cache
    let redis_url = env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://localhost:6379".to_string());
    
    log::info!("Connecting to Redis at {}", redis_url);
    let redis_client = redis::Client::open(redis_url)
        .expect("Failed to connect to Redis");
    
    let cache = Arc::new(LeaderboardCache::new(redis_client));
    
    // Initialize repository
    let leaderboard_repo = Arc::new(LeaderboardRepository::new(pool.clone()));
    
    // Create WebSocket broadcast channel
    let (ws_tx, _) = broadcast::channel(100);
    
    // Create shared state
    let app_state = web::Data::new(AppState {
        pool: pool.clone(),
        leaderboard_repo: leaderboard_repo.clone(),
        cache: cache.clone(),
        ws_tx: ws_tx.clone(),
    });
    
    // Start background task untuk refresh materialized view
    let repo_clone = leaderboard_repo.clone();
    let cache_clone = cache.clone();
    let ws_tx_clone = ws_tx.clone();
    
    tokio::spawn(async move {
        refresh_leaderboard_task(repo_clone, cache_clone, ws_tx_clone).await;
    });
    
    // Start background task untuk update data trader
    let pool_clone = pool.clone();
    tokio::spawn(async move {
        update_trader_data_task(pool_clone).await;
    });
    
    // Build GraphQL schema
    let schema = Schema::build(
        LeaderboardQuery::default(),
        LeaderboardMutation::default(),
        EmptySubscription,
    )
    .data(pool.clone())
    .data(leaderboard_repo.clone())
    .data(cache.clone())
    .finish();
    
    // Start HTTP server
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    
    log::info!("Starting server at {}:{}", host, port);
    
    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .supports_credentials()
            .max_age(3600);
        
        App::new()
            .app_data(app_state.clone())
            .app_data(web::Data::new(schema.clone()))
            .wrap(cors)
            .wrap(Logger::default())
            .service(
                web::resource("/graphql")
                    .route(web::post().to(GraphQL::new(schema.clone())))
            )
            .service(
                web::resource("/graphql/ws")
                    .route(web::get().to(GraphQLSubscription::new(schema.clone())))
            )
            .service(
                web::scope("/api")
                    .route("/health", web::get().to(health_check))
                    .route("/leaderboard", web::get().to(get_leaderboard_rest))
                    .route("/leaderboard/refresh", web::post().to(refresh_leaderboard))
                    .route("/ws", web::get().to(websocket_endpoint))
            )
            .service(
                web::scope("/metrics")
                    .route("", web::get().to(metrics_endpoint))
            )
    })
    .bind(format!("{}:{}", host, port))?
    .workers(4) // Jumlah worker threads
    .run()
    .await?;
    
    Ok(())
}

// Handler untuk health check
async fn health_check() -> actix_web::HttpResponse {
    actix_web::HttpResponse::Ok()
        .content_type("application/json")
        .json(serde_json::json!({
            "status": "healthy",
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "service": "leaderboard-api"
        }))
}

// REST API endpoint untuk leaderboard
async fn get_leaderboard_rest(
    state: web::Data<AppState>,
    web::Query(params): web::Query<LeaderboardParams>,
) -> actix_web::HttpResponse {
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    let sort_by = params.sort_by.as_deref().unwrap_or("roi");
    let sort_order = params.sort_order.as_deref().unwrap_or("desc");
    
    // Coba ambil dari cache dulu
    let cache_key = format!("leaderboard:{}:{}:{}:{}", limit, offset, sort_by, sort_order);
    
    if let Some(cached_data) = state.cache.get_cached_leaderboard(&cache_key).await {
        return actix_web::HttpResponse::Ok()
            .content_type("application/json")
            .json(cached_data);
    }
    
    // Jika tidak ada di cache, query dari database
    match state.leaderboard_repo.get_leaderboard(limit, offset, sort_by, sort_order).await {
        Ok(entries) => {
            // Cache hasilnya
            let cache_ttl = if offset == 0 { 10 } else { 30 }; // Cache lebih lama untuk halaman pertama
            state.cache.cache_leaderboard(&cache_key, &entries, cache_ttl).await;
            
            actix_web::HttpResponse::Ok()
                .content_type("application/json")
                .json(entries)
        }
        Err(err) => {
            log::error!("Failed to fetch leaderboard: {:?}", err);
            actix_web::HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Failed to fetch leaderboard"}))
        }
    }
}

// Endpoint untuk refresh leaderboard manual
async fn refresh_leaderboard(state: web::Data<AppState>) -> actix_web::HttpResponse {
    match state.leaderboard_repo.refresh_materialized_view().await {
        Ok(_) => {
            // Clear cache setelah refresh
            state.cache.clear_pattern("leaderboard:*").await;
            
            // Broadcast update via WebSocket
            let _ = state.ws_tx.send("leaderboard_updated".to_string());
            
            actix_web::HttpResponse::Ok()
                .json(serde_json::json!({"status": "refreshed"}))
        }
        Err(err) => {
            log::error!("Failed to refresh leaderboard: {:?}", err);
            actix_web::HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "Failed to refresh leaderboard"}))
        }
    }
}

// WebSocket endpoint
async fn websocket_endpoint(
    req: actix_web::HttpRequest,
    stream: actix_web::web::Payload,
    state: web::Data<AppState>,
) -> actix_web::Result<actix_web::HttpResponse> {
    use actix_ws::{Message, ProtocolError};
    use futures_util::{SinkExt, StreamExt};
    
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, stream)?;
    
    // Subscribe ke broadcast channel
    let mut rx = state.ws_tx.subscribe();
    
    // Kirim data leaderboard awal
    if let Ok(entries) = state.leaderboard_repo.get_leaderboard(100, 0, "roi", "desc").await {
        let initial_data = serde_json::json!({
            "type": "initial",
            "data": entries
        });
        
        if let Err(e) = session.send(Message::Text(initial_data.to_string())).await {
            log::error!("Failed to send initial data: {:?}", e);
        }
    }
    
    // Spawn task untuk handle WebSocket
    actix_rt::spawn(async move {
        let mut interval = actix_rt::time::interval(std::time::Duration::from_secs(30));
        
        loop {
            tokio::select! {
                // Broadcast messages
                Ok(msg) = rx.recv() => {
                    if let Err(e) = session.send(Message::Text(msg)).await {
                        log::error!("Failed to send broadcast message: {:?}", e);
                        break;
                    }
                }
                
                // Periodic updates
                _ = interval.tick() => {
                    if let Ok(entries) = state.leaderboard_repo.get_leaderboard(100, 0, "roi", "desc").await {
                        let update_data = serde_json::json!({
                            "type": "periodic_update",
                            "data": entries
                        });
                        
                        if let Err(e) = session.send(Message::Text(update_data.to_string())).await {
                            log::error!("Failed to send periodic update: {:?}", e);
                            break;
                        }
                    }
                }
                
                // Client messages
                Some(msg) = msg_stream.next() => {
                    match msg {
                        Ok(Message::Ping(bytes)) => {
                            if let Err(e) = session.pong(&bytes).await {
                                log::error!("Failed to send pong: {:?}", e);
                                break;
                            }
                        }
                        Ok(Message::Close(_)) => {
                            log::info!("WebSocket connection closed by client");
                            break;
                        }
                        Err(ProtocolError::Overflow) => {
                            log::warn!("WebSocket buffer overflow");
                            break;
                        }
                        Err(e) => {
                            log::error!("WebSocket error: {:?}", e);
                            break;
                        }
                        _ => {} // Ignore other messages
                    }
                }
            }
        }
        
        log::info!("WebSocket connection ended");
    });
    
    Ok(response)
}

// Metrics endpoint untuk monitoring
async fn metrics_endpoint(state: web::Data<AppState>) -> actix_web::HttpResponse {
    use prometheus::{Encoder, TextEncoder};
    
    // Custom metrics
    let leaderboard_requests = prometheus::IntCounter::new(
        "leaderboard_requests_total",
        "Total number of leaderboard requests"
    ).unwrap();
    
    let db_connection_gauge = prometheus::Gauge::new(
        "db_connections",
        "Current database connections"
    ).unwrap();
    
    // Update metrics
    leaderboard_requests.inc();
    
    if let Ok(stats) = state.pool.acquire().await {
        db_connection_gauge.set(stats.size() as f64);
    }
    
    // Encode metrics
    let encoder = TextEncoder::new();
    let mut buffer = Vec::new();
    
    let metric_families = prometheus::gather();
    encoder.encode(&metric_families, &mut buffer).unwrap();
    
    actix_web::HttpResponse::Ok()
        .content_type(prometheus::TEXT_FORMAT)
        .body(buffer)
}

// Background task untuk refresh materialized view
async fn refresh_leaderboard_task(
    repo: Arc<LeaderboardRepository>,
    cache: Arc<LeaderboardCache>,
    ws_tx: broadcast::Sender<String>,
) {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(60)); // Refresh setiap 1 menit
    
    loop {
        interval.tick().await;
        
        log::info!("Refreshing materialized view...");
        
        match repo.refresh_materialized_view().await {
            Ok(_) => {
                log::info!("Materialized view refreshed successfully");
                
                // Clear cache
                if let Err(e) = cache.clear_pattern("leaderboard:*").await {
                    log::error!("Failed to clear cache: {:?}", e);
                }
                
                // Broadcast update
                let _ = ws_tx.send("leaderboard_updated".to_string());
            }
            Err(e) => {
                log::error!("Failed to refresh materialized view: {:?}", e);
            }
        }
    }
}

// Background task untuk update data trader dari sumber eksternal
async fn update_trader_data_task(pool: sqlx::PgPool) {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(300)); // Update setiap 5 menit
    
    loop {
        interval.tick().await;
        
        log::info!("Updating trader data from external sources...");
        
        // Di sini Anda akan mengintegrasikan dengan:
        // 1. Smart contract events (Ethereum/other chains)
        // 2. Exchange APIs (Binance, FTX, etc.)
        // 3. Trading platform APIs
        
        // Contoh: Update dari mock data
        match update_trader_performance(&pool).await {
            Ok(updated_count) => {
                log::info!("Updated {} trader records", updated_count);
            }
            Err(e) => {
                log::error!("Failed to update trader data: {:?}", e);
            }
        }
    }
}

// Fungsi helper untuk update trader performance
async fn update_trader_performance(pool: &sqlx::PgPool) -> Result<i64, sqlx::Error> {
    // Ini adalah contoh implementasi
    // Di production, Anda akan mengambil data dari:
    // 1. Blockchain RPC
    // 2. Trading APIs
    // 3. DeFi protocols
    
    let result = sqlx::query!(
        r#"
        WITH updated_traders AS (
            SELECT 
                t.id,
                t.wallet_address,
                -- Simulasi update data
                (RANDOM() * 100000)::DECIMAL as new_account_value,
                (RANDOM() * 50000 - 25000)::DECIMAL as new_pnl,
                (RANDOM() * 200 - 100)::DECIMAL as new_roi,
                (RANDOM() * 1000000)::DECIMAL as new_volume
            FROM traders t
            WHERE t.last_active > NOW() - INTERVAL '7 days'
            LIMIT 1000
        )
        INSERT INTO trader_performance 
            (trader_id, account_value, pnl, roi, volume, timeframe, calculated_at)
        SELECT 
            id, 
            new_account_value,
            new_pnl,
            new_roi,
            new_volume,
            'daily',
            NOW()
        FROM updated_traders
        ON CONFLICT DO NOTHING
        RETURNING id
        "#,
    )
    .fetch_all(pool)
    .await?;
    
    Ok(result.len() as i64)
}

// Struct untuk query parameters REST API
#[derive(serde::Deserialize)]
struct LeaderboardParams {
    limit: Option<i32>,
    offset: Option<i32>,
    sort_by: Option<String>,
    sort_order: Option<String>,
}

// Implementasi untuk cache module
mod cache {
    use redis::{Client, AsyncCommands};
    use serde::{Serialize, de::DeserializeOwned};
    use std::time::Duration;
    
    pub struct LeaderboardCache {
        client: Client,
    }
    
    impl LeaderboardCache {
        pub fn new(client: Client) -> Self {
            Self { client }
        }
        
        pub async fn get_cached_leaderboard<T: DeserializeOwned>(
            &self, 
            key: &str
        ) -> Option<T> {
            let mut conn = match self.client.get_async_connection().await {
                Ok(conn) => conn,
                Err(e) => {
                    log::error!("Failed to connect to Redis: {:?}", e);
                    return None;
                }
            };
            
            let data: String = match conn.get(key).await {
                Ok(data) => data,
                Err(e) => {
                    log::debug!("Cache miss for key {}: {:?}", key, e);
                    return None;
                }
            };
            
            serde_json::from_str(&data).ok()
        }
        
        pub async fn cache_leaderboard<T: Serialize>(
            &self, 
            key: &str, 
            data: &T,
            ttl_seconds: usize
        ) {
            let mut conn = match self.client.get_async_connection().await {
                Ok(conn) => conn,
                Err(e) => {
                    log::error!("Failed to connect to Redis: {:?}", e);
                    return;
                }
            };
            
            let json = match serde_json::to_string(data) {
                Ok(json) => json,
                Err(e) => {
                    log::error!("Failed to serialize data: {:?}", e);
                    return;
                }
            };
            
            if let Err(e) = conn.set_ex(key, json, ttl_seconds).await {
                log::error!("Failed to cache data: {:?}", e);
            }
        }
        
        pub async fn clear_pattern(&self, pattern: &str) {
            let mut conn = match self.client.get_async_connection().await {
                Ok(conn) => conn,
                Err(e) => {
                    log::error!("Failed to connect to Redis: {:?}", e);
                    return;
                }
            };
            
            let keys: Vec<String> = match conn.keys(pattern).await {
                Ok(keys) => keys,
                Err(e) => {
                    log::error!("Failed to get keys: {:?}", e);
                    return;
                }
            };
            
            if !keys.is_empty() {
                if let Err(e) = conn.del(keys).await {
                    log::error!("Failed to delete keys: {:?}", e);
                }
            }
        }
        
        pub async fn increment_counter(&self, key: &str) -> Option<i64> {
            let mut conn = match self.client.get_async_connection().await {
                Ok(conn) => conn,
                Err(e) => {
                    log::error!("Failed to connect to Redis: {:?}", e);
                    return None;
                }
            };
            
            match conn.incr(key, 1).await {
                Ok(val) => Some(val),
                Err(e) => {
                    log::error!("Failed to increment counter: {:?}", e);
                    None
                }
            }
        }
    }
}