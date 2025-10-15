mod models;
mod errors;

use models::{UserPnl, LeaderboardQuery, LeaderboardInput};
use errors::AppError;
use async_graphql::{Context, Object, Schema, EmptyMutation, EmptySubscription};
use axum::{
    extract::{Query, State},
    response::Json,
};
use serde::Deserialize;
use sqlx::{Pool, Postgres};

pub async fn get_leaderboard(
    Query(params): Query<LeaderboardQuery>,
    State((pool, _)): State<(Pool<Postgres>, Schema<QueryRoot, EmptyMutation, EmptySubscription>)>,
) -> Result<Json<Vec<UserPnl>>, AppError> {
    let limit:i64 = params.limit.unwrap_or(10).max(1).min(30).into();
    let offset = (params.page.unwrap_or(1) - 1) as i64 * limit;

    let query = sqlx::query_as!(
        UserPnl,
        r#"
        SELECT
            ROW_NUMBER() OVER (ORDER BY pnl DESC) AS rank,
            wallet_address,
            pnl
        FROM user_pnl
        ORDER BY pnl DESC
        LIMIT $1 OFFSET $2
        "#,
        limit,
        offset
    );

    let result = query.fetch_all(&pool).await?;
    Ok(Json(result))
}

// GraphQL Query
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    async fn leaderboard(&self, ctx: &Context<'_>, input: LeaderboardInput) -> Result<Vec<UserPnl>, async_graphql::Error> {
        let pool = ctx.data::<Pool<Postgres>>()
            .map_err(|_| async_graphql::Error::new("Database not available"))?;

        let limit:i64 = input.limit.unwrap_or(10).max(1).min(30).into();
        let offset = (input.page.unwrap_or(1) - 1) as i64 * limit;

        let query = sqlx::query_as!(
            UserPnl,
            r#"
            SELECT
                ROW_NUMBER() OVER (ORDER BY pnl DESC) AS rank,
                wallet_address,
                pnl
            FROM user_pnl
            ORDER BY pnl DESC
            LIMIT $1 OFFSET $2
            "#,
            limit,
            offset
        );

        let result = query.fetch_all(pool).await?;
        Ok(result)
    }
}

pub async fn graphql_handler(
    State((pool, schema)): State<(Pool<Postgres>, Schema<QueryRoot, EmptyMutation, EmptySubscription>)>,
    req: async_graphql_axum::GraphQLRequest,
) -> async_graphql_axum::GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}