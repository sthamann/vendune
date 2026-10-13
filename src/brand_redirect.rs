//! Operator-configured domain migration preserves the host prefix, path, query and HTTP method.
use crate::*;
use axum::{extract::Request, middleware::Next};

fn domain(value: &str) -> bool {
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
pub(crate) async fn apply(request: Request, next: Next) -> Response {
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
    fn redirects_only_admitted_domains_without_losing_routing_or_query() {
        for (host, expected) in [
            ("previous.test", "https://sellama.ai/path?q=a%2Fb&x=1"),
            (
                "Shop.previous.test:443",
                "https://shop.sellama.ai/path?q=a%2Fb&x=1",
            ),
            (
                "start.previous.test.",
                "https://start.sellama.ai/path?q=a%2Fb&x=1",
            ),
        ] {
            assert_eq!(
                destination(host, "/path?q=a%2Fb&x=1", "sellama.ai", "previous.test").as_deref(),
                Some(expected)
            );
        }
        for host in [
            "sellama.ai",
            "unrelated.test",
            "evilprevious.test",
            "previous.test.evil.test",
            "user@previous.test",
            "previous.test/path",
        ] {
            assert!(
                destination(host, "/", "sellama.ai", "previous.test").is_none(),
                "unexpected redirect for {host}"
            );
        }
        assert!(destination("previous.test", "/", "https://evil.test", "previous.test").is_none());
        assert!(destination("previous.test", "/", "previous.test", "previous.test").is_none());
    }
}
