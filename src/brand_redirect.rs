//! Move browser pages to the configured domain while retaining integration and checkout endpoints.
use crate::*;
use axum::{extract::Request, http::Method, middleware::Next};

pub(crate) fn domain(value: &str) -> bool {
    value.len() <= 253
        && value.contains('.')
        && value.split('.').all(|part| {
            !part.is_empty()
                && part.len() <= 63
                && !part.starts_with('-')
                && !part.ends_with('-')
                && part
                    .bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        })
}
fn destination(host: &str, path: &str, canonical: &str, legacy: &str) -> Option<String> {
    if !domain(canonical) || host.contains('@') || host.contains('/') {
        return None;
    }
    let authority: axum::http::uri::Authority = host.parse().ok()?;
    let host = authority.host().trim_end_matches('.').to_ascii_lowercase();
    for old in legacy
        .split(',')
        .map(str::trim)
        .filter(|old| domain(old) && *old != canonical)
    {
        if host == old {
            return Some(format!("https://{canonical}{path}"));
        }
        if let Some(prefix) = host.strip_suffix(&format!(".{old}"))
            && domain(&format!("{prefix}.test"))
        {
            return Some(format!("https://{prefix}.{canonical}{path}"));
        }
    }
    None
}
fn browser_page(method: &Method, path: &str) -> bool {
    matches!(*method, Method::GET | Method::HEAD)
        && ![
            "/api",
            "/experience-api",
            "/store-api",
            "/mcp",
            "/ucp",
            "/.well-known",
            "/checkout",
            "/assets",
            "/brand",
            "/media",
        ]
        .iter()
        .any(|prefix| path == *prefix || path.starts_with(&format!("{prefix}/")))
}
pub(crate) async fn apply(request: Request, next: Next) -> Response {
    let accept = header(request.headers(), "accept").unwrap_or_default();
    if !browser_page(request.method(), request.uri().path())
        || request.headers().contains_key("authorization")
        || (accept.contains("application/json") && !accept.contains("text/html"))
    {
        return next.run(request).await;
    }
    let canonical = env::var("CANONICAL_DOMAIN").unwrap_or_default();
    let legacy = env::var("LEGACY_DOMAINS").unwrap_or_default();
    let path = request
        .uri()
        .path_and_query()
        .map_or("/", |value| value.as_str());
    if let Some(target) = destination(
        header(request.headers(), "host").unwrap_or(""),
        path,
        &canonical,
        &legacy,
    ) {
        return axum::response::Redirect::permanent(&target).into_response();
    }
    next.run(request).await
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn integrations_and_existing_checkout_are_not_redirected() {
        for path in [
            "/api/orders",
            "/store-api/cart",
            "/mcp",
            "/ucp/checkout-sessions",
            "/.well-known/ucp",
            "/checkout",
        ] {
            assert!(!browser_page(&Method::GET, path), "{path}");
        }
        assert!(!browser_page(&Method::POST, "/callback"));
        assert!(browser_page(&Method::GET, "/products/coat"));
        assert!(browser_page(&Method::HEAD, "/"));
        assert!(browser_page(&Method::GET, "/apiary"));
    }
    #[test]
    fn redirects_only_admitted_domains_without_losing_routing_or_query() {
        for (host, expected) in [
            ("previous.test", "https://veyndo.ai/path?q=a%2Fb&x=1"),
            (
                "Shop.previous.test:443",
                "https://shop.veyndo.ai/path?q=a%2Fb&x=1",
            ),
            (
                "start.previous.test.",
                "https://start.veyndo.ai/path?q=a%2Fb&x=1",
            ),
        ] {
            assert_eq!(
                destination(host, "/path?q=a%2Fb&x=1", "veyndo.ai", "previous.test").as_deref(),
                Some(expected)
            );
        }
        for host in [
            "veyndo.ai",
            "unrelated.test",
            "evilprevious.test",
            "previous.test.evil.test",
            "user@previous.test",
            "previous.test/path",
        ] {
            assert!(
                destination(host, "/", "veyndo.ai", "previous.test").is_none(),
                "unexpected redirect for {host}"
            );
        }
        assert!(destination("previous.test", "/", "https://evil.test", "previous.test").is_none());
        assert!(destination("previous.test", "/", "previous.test", "previous.test").is_none());
    }
}
