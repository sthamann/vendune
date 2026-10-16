//! Server-generated request correlation and safe structured events, without tokens, query strings or bodies.
use crate::*;
use axum::{extract::Request, middleware::Next};
use tracing::Instrument;
pub(crate) async fn request(req: Request, next: Next) -> Response {
    let id = veyndo::trace::fresh();
    let method = req.method().as_str().to_string();
    // Only route templates, never resource IDs, query strings or OAuth callback secrets.
    let span = tracing::info_span!("http",trace_id=%id,method=%method);
    let started = std::time::Instant::now();
    veyndo::trace::scoped(
        id.clone(),
        async {
            let mut response = next.run(req).await;
            tracing::info!(
                status = response.status().as_u16(),
                elapsed_ms = started.elapsed().as_millis() as u64,
                "http_completed"
            );
            response
                .headers_mut()
                .insert("x-request-id", id.parse().unwrap());
            response
        }
        .instrument(span),
    )
    .await
}
