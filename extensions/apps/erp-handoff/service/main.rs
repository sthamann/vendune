//! Independent ERP adapter process: bounded gateway requests, app-owned receipts and explicit external outcomes.
mod config;
mod delivery;
mod events;
#[path = "../../../sdk/rust-events.rs"]
mod sdk_events;
mod store;
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, State},
    http::{HeaderMap, StatusCode},
    routing::post,
};
use serde_json::{Value, json};
use std::sync::Arc;
type Error = (StatusCode, Json<Value>);
type Result<T> = std::result::Result<T, Error>;
fn error(code: StatusCode, detail: &str) -> Error {
    (code, Json(json!({"error":detail})))
}
#[derive(Clone)]
struct App {
    config: Arc<config::Config>,
    db: sqlx::PgPool,
    http: reqwest::Client,
    capacity: Arc<tokio::sync::Semaphore>,
}
impl App {
    fn tenant(&self, headers: &HeaderMap) -> Result<String> {
        let expected = format!("Bearer {}", self.config.gateway_token);
        if headers.get("authorization").and_then(|v| v.to_str().ok()) != Some(&expected) {
            return Err(error(
                StatusCode::UNAUTHORIZED,
                "Gateway authentication required",
            ));
        }
        let tenant = headers
            .get("x-tenant")
            .and_then(|v| v.to_str().ok())
            .filter(|t| self.config.tenants.contains_key(*t))
            .ok_or(error(
                StatusCode::FORBIDDEN,
                "Tenant is not configured for this ERP adapter",
            ))?;
        Ok(tenant.into())
    }
}
async fn synchronize(
    State(a): State<App>,
    h: HeaderMap,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let t = a.tenant(&h)?;
    let id = v["payload"]["orderId"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() <= 100)
        .ok_or(error(
            StatusCode::BAD_REQUEST,
            "payload.orderId is required",
        ))?;
    Ok(Json(delivery::send(&a, &t, id).await?))
}
async fn receipts(State(a): State<App>, h: HeaderMap) -> Result<Json<Value>> {
    let t = a.tenant(&h)?;
    Ok(Json(json!({"elements":store::list(&a, &t).await?})))
}
async fn reconcile(
    State(a): State<App>,
    h: HeaderMap,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let t = a.tenant(&h)?;
    let id = v["payload"]["orderId"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() <= 100)
        .ok_or(error(
            StatusCode::BAD_REQUEST,
            "payload.orderId is required",
        ))?;
    Ok(Json(delivery::reconcile(&a, &t, id).await?))
}
async fn intake(State(a): State<App>, h: HeaderMap, Json(v): Json<Value>) -> Result<Json<Value>> {
    let t = a.tenant(&h)?;
    let orders = events::orders(&v, &t, &a.config.app_id)?;
    let mut results = vec![];
    for order in orders {
        results.push(delivery::send(&a, &t, &order).await?);
    }
    Ok(Json(json!({"accepted":results.len(),"results":results})))
}
#[tokio::main]
async fn main() -> std::result::Result<(), Box<dyn std::error::Error>> {
    let config = config::Config::load()?;
    let db = sqlx::postgres::PgPoolOptions::new()
        .max_connections(8)
        .acquire_timeout(std::time::Duration::from_secs(2))
        .connect(&std::env::var("APP_DATABASE_URL")?)
        .await?;
    store::verify_role(&db)
        .await
        .map_err(|e| e.1.0.to_string())?;
    let bind = std::env::var("APP_BIND_ADDR").unwrap_or("0.0.0.0:8797".into());
    let a = App {
        config: Arc::new(config),
        db,
        http: reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(std::time::Duration::from_secs(3))
            .build()?,
        capacity: Arc::new(tokio::sync::Semaphore::new(8)),
    };
    let router = Router::new()
        .route("/signed-events", post(events::signed))
        .route(
            "/health",
            axum::routing::get(|| async { Json(json!({"ok":true})) }),
        )
        .route("/actions/reconcile", post(reconcile))
        .route("/actions/synchronize", post(synchronize))
        .route("/actions/receipts", post(receipts))
        .route("/events", post(intake))
        .layer(DefaultBodyLimit::max(65536))
        .with_state(a);
    axum::serve(tokio::net::TcpListener::bind(bind).await?, router).await?;
    Ok(())
}
