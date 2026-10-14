//! Identity, recovery and personal-security routes share canonical authentication admission.
use crate::*;
pub(crate) fn entry_router() -> Router<App> {
    Router::new()
        .merge(auth::roles::router())
        .merge(auth::mfa::router())
        .secure_route(
            "/api/identity/session",
            &[("POST", "public")],
            post(auth::broker_session::session),
        )
        .secure_route(
            "/api/auth/recovery",
            &[("GET", "public")],
            get(auth::recovery_entry::entry),
        )
        .secure_route(
            "/api/identity/recovery",
            &[("POST", "public")],
            post(auth::broker_recovery::lookup),
        )
        .secure_route(
            "/api/identity/exchange",
            &[("POST", "public")],
            post(auth::broker::exchange),
        )
        .secure_route(
            "/api/identity/credentials",
            &[("POST", "public")],
            post(auth::broker_credentials::credentials),
        )
        .secure_route(
            "/api/identity/inference",
            &[("POST", "public")],
            post(auth::broker_inference::generate)
                .layer(axum::extract::DefaultBodyLimit::max(8_200_000)),
        )
        .secure_route(
            "/api/auth/handoff",
            &[("POST", "read")],
            post(auth::handoff::create),
        )
        .secure_route(
            "/api/auth/redeem",
            &[("POST", "public")],
            post(auth::handoff::redeem),
        )
}
