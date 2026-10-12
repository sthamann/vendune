//! Independent EDI gateway: app-owned codecs and mappings use the existing permission-aware commerce callback contract.
mod callbacks;
mod config;
mod document;
mod edifact;
mod export;
mod import;
mod xml;
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::sync::Arc;
type Error = (StatusCode, Json<Value>);
type Result<T> = std::result::Result<T, Error>;
fn error(code: StatusCode, s: &str) -> Error {
    (code, Json(json!({"error":s})))
}
fn hash(s: &str) -> String {
    format!("{:x}", Sha256::digest(s.as_bytes()))
}
#[derive(Clone)]
struct App {
    config: Arc<config::Config>,
    http: reqwest::Client,
    capacity: Arc<tokio::sync::Semaphore>,
}
impl App {
    fn tenant<'a>(&self, h: &'a HeaderMap) -> Result<&'a str> {
        use ring::hmac;
        let expected = format!("Bearer {}", self.config.gateway_token);
        let got = h
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        let key = hmac::Key::new(hmac::HMAC_SHA256, self.config.gateway_token.as_bytes());
        if hmac::verify(
            &key,
            got.as_bytes(),
            hmac::sign(&key, expected.as_bytes()).as_ref(),
        )
        .is_err()
        {
            return Err(error(
                StatusCode::UNAUTHORIZED,
                "EDI gateway authentication required",
            ));
        }
        h.get("x-tenant")
            .and_then(|v| v.to_str().ok())
            .filter(|t| self.config.tenants.contains_key(*t))
            .ok_or(error(StatusCode::FORBIDDEN, "EDI tenant is not configured"))
    }
}
async fn validate(
    State(a): State<App>,
    h: HeaderMap,
    Json(v): Json<import::Input>,
) -> Result<Json<Value>> {
    a.tenant(&h)?;
    let _permit = a.capacity.clone().try_acquire_owned().map_err(|_| {
        error(
            StatusCode::TOO_MANY_REQUESTS,
            "EDI capacity exhausted; retry with backoff",
        )
    })?;
    let d = document::parse(&v.format, &v.document)
        .map_err(|e| error(StatusCode::UNPROCESSABLE_ENTITY, &e))?;
    Ok(Json(
        json!({"document":d,"supportedProfile":"whole-unit requisition","networkCertified":false}),
    ))
}
async fn import(
    State(a): State<App>,
    h: HeaderMap,
    Json(v): Json<import::Input>,
) -> Result<Json<Value>> {
    let t = a.tenant(&h)?.to_owned();
    let _permit = a.capacity.clone().try_acquire_owned().map_err(|_| {
        error(
            StatusCode::TOO_MANY_REQUESTS,
            "EDI capacity exhausted; retry with backoff",
        )
    })?;
    Ok(Json(import::execute(&a, &t, v).await?))
}
#[tokio::main]
async fn main() -> std::result::Result<(), Box<dyn std::error::Error>> {
    let a = App {
        config: Arc::new(config::Config::load()?),
        http: reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(std::time::Duration::from_secs(3))
            .build()?,
        capacity: Arc::new(tokio::sync::Semaphore::new(8)),
    };
    let r = Router::new()
        .route("/health", get(|| async { Json(json!({"ok":true})) }))
        .route("/actions/validate_document", post(validate))
        .route("/actions/import_document", post(import))
        .route("/actions/export_document", post(export::handle))
        .layer(DefaultBodyLimit::max(40000))
        .with_state(a);
    let bind = std::env::var("APP_BIND_ADDR").unwrap_or("0.0.0.0:8798".into());
    axum::serve(tokio::net::TcpListener::bind(bind).await?, r).await?;
    Ok(())
}
