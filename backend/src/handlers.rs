mod models;
mod errors;

use errors::AppError;
use models::{LeaderboardQuery, UserPnl};

use async_graphql::{Context, EmptyMutation, EmptySubscription, Object, Schema};
use axum::{
    extract::{Query, State},
    response::Json,
};
use serde::Deserialize;
use sqlx::PgPool;

pub async fn get_leaderboard(
    Query(params): Query<LeaderboardQuery>,
    State(pool): State<PgPool>,
) -> Result<Json<Vec<UserPnl>>, AppError> {
    let limit = params.limit.unwrap_or(10).max(1).min(30);
    let offset = (params.page.unwrap_or(1) - 1) as i32 * limit;

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
#[derive(Deserialize)]
pub struct LeaderboardInput {
    pub limit: Option<i32>,
    pub page: Option<i32>,
}

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    async fn leaderboard(
        &self,
        ctx: &Context<'_>,
        input: LeaderboardInput,
    ) -> Result<Vec<UserPnl>, async_graphql::Error> {
        let pool = ctx
            .data::<PgPool>()
            .map_err(|_| async_graphql::Error::new("Database not available"))?;
        let limit = input.limit.unwrap_or(10).max(1).min(30);
        let offset = (input.page.unwrap_or(1) - 1) as i32 * limit;

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
    State((_, schema)): State<(PgPool, Schema<QueryRoot, EmptyMutation, EmptySubscription>)>,
    req: async_graphql_axum::GraphQLRequest,
) -> async_graphql_axum::GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}
