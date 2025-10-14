use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
    #[error("Invalid input: {message}")]
    InvalidInput { message: String },
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::DatabaseError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"),
            AppError::InvalidInput { message } => (StatusCode::BAD_REQUEST, message.as_str()),
        };

        let body = Json(json!({
            "error": message,
        }));

        (status, body).into_response()
    }
}