//! Common browser defenses on successful responses and errors, including reverse-proxy HTTPS deployments.
use axum::{extract::Request, middleware::Next, response::Response};
pub(crate) async fn apply(request: Request, next: Next) -> Response {
    let studio = crate::auth::browser::origin(&request);
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert("x-content-type-options", "nosniff".parse().unwrap());
    // Preview/access handoffs intentionally suppress all referrers; retain their stricter policy.
    headers
        .entry("referrer-policy")
        .or_insert("strict-origin-when-cross-origin".parse().unwrap());
    headers.insert(
        "permissions-policy",
        "camera=(), microphone=(), geolocation=()".parse().unwrap(),
    );
    // Native Studio/storefront use external module scripts. No inline scripts, eval or event attributes.
    // A hosted frontend retains its owner's policy; silently replacing it could weaken or break that app.
    if !headers.contains_key("content-security-policy") {
        headers.insert(
            "content-security-policy",
            native_policy(&crate::runtime_config::get().frame_ancestors)
                .parse()
                .unwrap(),
        );
    }
    if let Some((origin, _)) = studio {
        // Cover every response on the credential origin, including checkout and errors.
        // An extra policy intersects the renderer's policy; it cannot widen framing.
        headers.append(
            "content-security-policy",
            studio_policy(&origin).parse().unwrap(),
        );
    }
    if crate::runtime_config::get().strict {
        headers.insert(
            "strict-transport-security",
            "max-age=31536000".parse().unwrap(),
        );
    }
    response
}

pub(crate) fn studio_policy(origin: &str) -> String {
    // Only build-owned modules are executable. Merchant uploads and third-party tags
    // must never execute with ambient merchant authority on this origin.
    format!(
        "script-src {origin}/assets/; script-src-attr 'none'; object-src 'none'; base-uri 'none'"
    )
}

pub(crate) fn native_policy(frames: &str) -> String {
    format!(
        "default-src 'self'; script-src 'self' https://www.googletagmanager.com https://maps.googleapis.com https://maps.gstatic.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: http://127.0.0.1:* http://localhost:*; media-src 'self' blob: https:; frame-src 'self' https: http://127.0.0.1:* http://localhost:*; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self' {frames}; form-action 'self' https:"
    )
}
#[cfg(test)]
mod tests {
    #[test]
    fn studio_policy_allows_only_build_owned_scripts() {
        let policy = super::studio_policy("https://studio.example.test");
        assert!(policy.contains("script-src https://studio.example.test/assets/;"));
        for denied in ["'self'", "unsafe-inline", "unsafe-eval", "google", "blob:"] {
            assert!(!policy.contains(denied));
        }
    }
    #[test]
    fn native_scripts_cannot_use_inline_handlers_or_eval() {
        let policy = super::native_policy("https://studio.example.test");
        let scripts = policy
            .split(';')
            .find(|s| s.trim().starts_with("script-src "))
            .unwrap();
        assert!(!scripts.contains("unsafe-inline") && !scripts.contains("unsafe-eval"));
        assert!(policy.contains("script-src-attr 'none'"));
    }
}
