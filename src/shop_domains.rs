//! Resolve configured shop subdomains before authentication; reject unknown hosts and conflicting scopes.
use crate::*;
use axum::{extract::Request, middleware::Next};
mod frontend_bindings;
pub(crate) mod frontend_editor;
mod frontend_transport;
pub(crate) mod frontends;
#[derive(Clone)]
pub(crate) struct HostShop {
    pub alias: String,
    pub access: Arc<crate::performance::access_snapshot::AccessSnapshot>,
}
/// Configured former suffixes resolve through the same tenant/channel owner during cutover.
pub(crate) fn configured_alias<'a>(
    host: &'a str,
    canonical: &str,
    legacy: &str,
) -> Option<&'a str> {
    std::iter::once(canonical)
        .chain(legacy.split(','))
        .map(str::trim)
        .filter(|suffix| crate::brand_redirect::domain(suffix))
        .find_map(|suffix| host.strip_suffix(&format!(".{suffix}")))
}
/// Keep only the configured public origin's exact prefix on explicitly admitted former domains.
pub(crate) fn same_origin_family(
    actual: &reqwest::Url,
    expected: &reqwest::Url,
    canonical: &str,
    legacy: &str,
) -> bool {
    if actual.origin() == expected.origin() {
        return true;
    }
    if actual.scheme() != "https"
        || expected.scheme() != "https"
        || actual.port().is_some()
        || expected.port().is_some()
        || !crate::brand_redirect::domain(canonical)
    {
        return false;
    }
    let expected_host = expected.host_str().unwrap_or_default();
    let actual_host = actual.host_str().unwrap_or_default();
    if expected_host == canonical {
        return legacy
            .split(',')
            .map(str::trim)
            .any(|old| crate::brand_redirect::domain(old) && actual_host == old);
    }
    configured_alias(expected_host, canonical, "")
        .is_some_and(|prefix| configured_alias(actual_host, "", legacy) == Some(prefix))
}
pub(crate) async fn resolve(State(a): State<App>, mut request: Request, next: Next) -> Response {
    let domain = env::var("SHOP_DOMAIN_SUFFIX").unwrap_or_default();
    let legacy = env::var("LEGACY_DOMAINS").unwrap_or_default();
    let host = header(request.headers(), "host")
        .unwrap_or_default()
        .to_ascii_lowercase();
    let host = host.split(':').next().unwrap_or_default();
    if let Some(shop) = configured_alias(host, &domain, &legacy)
        && !["app", "www", "admin", "experience"].contains(&shop)
    {
        if validate_tenant(shop).is_err()
            || shop.contains('.')
            || ["api", "admin", "mail", "platform", "experience"].contains(&shop)
        {
            return Error(StatusCode::NOT_FOUND, "Unknown shop".into()).into_response();
        }
        let channel = header(request.headers(), "sw-sales-channel-id").unwrap_or("default");
        let access = veyndo::tenant_scope::scoped(
            veyndo::tenant_scope::Scope::System,
            crate::performance::access_snapshot::AccessSnapshot::load(
                &a,
                Some(shop),
                shop,
                channel,
            ),
        )
        .await;
        let access = match access {
            Ok(access) => access,
            Err(_) => {
                return Error(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "Domain resolution unavailable".into(),
                )
                .into_response();
            }
        };
        let scope = &access.tenant;
        if header(request.headers(), "x-tenant").is_some_and(|t| t != scope) {
            return bad("Shop hostname and request scope disagree").into_response();
        }
        if !access.exists {
            return Error(StatusCode::NOT_FOUND, "Unknown shop".into()).into_response();
        }
        if access.mount.is_some() {
            let channel = &access.channel_id;
            if header(request.headers(), "sw-sales-channel-id").is_some_and(|id| id != channel) {
                return bad("Shop hostname and channel disagree").into_response();
            }
            request
                .headers_mut()
                .insert("sw-sales-channel-id", channel.parse().unwrap());
        }
        request
            .headers_mut()
            .insert("x-tenant", scope.parse().unwrap());
        request.extensions_mut().insert(HostShop {
            alias: shop.into(),
            access,
        });
    }
    next.run(request).await
}

/// Canonical links are server-owned; independent admin login always uses the configured Studio origin.
pub(crate) fn links(shop: &str) -> Value {
    let origin =
        env::var("COMMERCE_PUBLIC_ORIGIN").unwrap_or_else(|_| "http://127.0.0.1:8787".into());
    let storefront = env::var("SHOP_DOMAIN_SUFFIX")
        .ok()
        .filter(|s| !s.is_empty())
        .map(|suffix| format!("https://{shop}.{suffix}/"))
        .unwrap_or_else(|| format!("{}/?shop={shop}", origin.trim_end_matches('/')));
    json!({"storefrontUrl":storefront,"studioUrl":format!("{}/?shop={shop}#merchant",origin.trim_end_matches('/'))})
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn aliases_keep_exact_suffix_boundaries_and_existing_prefix_validation() {
        for host in ["shop.veyndo.ai", "shop.previous.test"] {
            assert_eq!(
                configured_alias(host, "veyndo.ai", "previous.test"),
                Some("shop")
            );
        }
        for host in [
            "shop.previous.test.evil.test",
            "shop.evilprevious.test",
            "previous.test",
        ] {
            assert_eq!(configured_alias(host, "veyndo.ai", "previous.test"), None);
        }
        // The existing resolver rejects a multi-label or invalid tenant instead of falling back.
        assert_eq!(
            configured_alias("nested.shop.previous.test", "veyndo.ai", "previous.test"),
            Some("nested.shop")
        );
        assert_eq!(
            configured_alias("shop.previous.test", "veyndo.ai", "https://previous.test"),
            None
        );
    }
    #[test]
    fn legacy_public_origins_keep_prefix_https_and_port_constraints() {
        let expected = reqwest::Url::parse("https://app.veyndo.ai").unwrap();
        for (value, allowed) in [
            ("https://app.previous.test", true),
            ("https://other.previous.test", false),
            ("https://app.previous.test.evil.test", false),
            ("http://app.previous.test", false),
            ("https://app.previous.test:444", false),
        ] {
            assert_eq!(
                same_origin_family(
                    &reqwest::Url::parse(value).unwrap(),
                    &expected,
                    "veyndo.ai",
                    "previous.test"
                ),
                allowed,
                "{value}"
            );
        }
    }
}
