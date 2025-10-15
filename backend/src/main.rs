use axum::routing::{get, post};
use axum::Router;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod handlers;

use handlers::{get_leaderboard, graphql_handler, QueryRoot};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = get_database_url();
    let pg_pool: Pool<Postgres> = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create Postgres pool.");

    let schema = async_graphql::Schema::build(
        QueryRoot,
        async_graphql::EmptyMutation,
        async_graphql::EmptySubscription,
    )
    .finish();

    // The fix: Initialize the Router with the full state tuple.
    let app = Router::new()
        .with_state((pg_pool, schema)) // <--- Move .with_state() here
        .route("/api/leaderboard", get(get_leaderboard))
        .route("/graphql", post(graphql_handler));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    tracing::info!("Server running on http://localhost:3001");
    axum::serve(listener, app).await.unwrap(); // <-- Ini sudah benar
}

fn get_database_url() -> String {
    let db_user: String = std::env::var("DB_USER").expect("DB_USER must be set");
    let db_pass: String = std::env::var("DB_PASS").expect("DB_PASS must be set");
    let db_host: String = std::env::var("DB_HOST").expect("DB_HOST must be set");
    let db_port: String = std::env::var("DB_PORT").expect("DB_PORT must be set");
    let db_name: String = std::env::var("DB_NAME").expect("DB_NAME must be set");

    format!(
        "postgres://{}:{}@{}:{}/{}",
        db_user, db_pass, db_host, db_port, db_name
    )
}