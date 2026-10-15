//! Host-only customer cookies adapt the existing tenant session ledger without granting merchant authority.
use crate::*;
use axum::{
    body::{Body, to_bytes},
    extract::Request,
    middleware::Next,
};
const MARKER: &str = "browser-customer-session";
fn names(t: &str, secure: bool) -> (String, String) {
    let prefix = if secure { "__Host-" } else { "" };
    (
        format!("{prefix}veyndo-customer-{t}"),
        format!("{prefix}veyndo-customer-csrf-{t}"),
    )
}
fn proof(s: &str, t: &str) -> String {
    hash(&format!("veyndo-customer-csrf:v1:{t}:{s}"))
}
fn credential(headers: &axum::http::HeaderMap, name: &str) -> Option<String> {
    let mut values = headers
        .get_all("cookie")
        .iter()
        .filter_map(|h| h.to_str().ok())
        .flat_map(|h| h.split(';'))
        .filter_map(|h| h.trim().split_once('='))
        .filter(|(k, _)| *k == name)
        .map(|(_, v)| v);
    let value = values.next()?;
    (values.next().is_none() && value.len() == 32 && value.bytes().all(|b| b.is_ascii_hexdigit()))
        .then(|| value.into())
}
fn cookies(r: &mut Response, t: &str, s: Option<&str>, secure: bool) {
    let (name, csrf) = names(t, secure);
    for (name, value, http_only) in [
        (name, s.unwrap_or("").to_owned(), "; HttpOnly"),
        (csrf, s.map(|s| proof(s, t)).unwrap_or_default(), ""),
    ] {
        r.headers_mut().append(
            "set-cookie",
            format!(
                "{name}={value}; Path=/; Max-Age={}; SameSite=Lax{}{http_only}",
                if s.is_some() { 43200 } else { 0 },
                if secure { "; Secure" } else { "" }
            )
            .parse()
            .unwrap(),
        );
    }
    r.headers_mut()
        .insert("cache-control", "no-store".parse().unwrap());
}
fn origin(request: &Request) -> Option<(String, bool)> {
    if let Some(o) = auth::browser::origin(request) {
        return Some(o);
    }
    request.extensions().get::<shop_domains::HostShop>()?;
    let host = request.headers().get("host")?.to_str().ok()?;
    let url = reqwest::Url::parse(&format!("https://{host}")).ok()?;
    (url.username().is_empty() && url.password().is_none() && url.path() == "/")
        .then(|| (url.origin().ascii_serialization(), true))
}
pub(crate) async fn apply(State(a): State<App>, mut request: Request, next: Next) -> Response {
    let path = request.uri().path().to_owned();
    let browser = request
        .headers()
        .get("x-veyndo-customer-session")
        .is_some_and(|h| h == "1");
    if !browser || !path.starts_with("/store-api/") {
        return next.run(request).await;
    }
    let Some((origin, secure)) = origin(&request) else {
        return Error(
            StatusCode::FORBIDDEN,
            "Customer browser origin unavailable".into(),
        )
        .into_response();
    };
    let same = request
        .headers()
        .get("origin")
        .map(|h| h == origin.as_str())
        .unwrap_or_else(|| {
            matches!(request.method().as_str(), "GET" | "HEAD")
                && request
                    .headers()
                    .get("sec-fetch-site")
                    .is_some_and(|h| h == "same-origin")
        });
    if !same {
        return Error(
            StatusCode::FORBIDDEN,
            "Customer browser requires the exact shop origin".into(),
        )
        .into_response();
    }
    let t = match tenant(request.headers()) {
        Ok(t) => t,
        Err(e) => return e.into_response(),
    };
    let entry = matches!(
        path.as_str(),
        "/store-api/account/login" | "/store-api/account/register"
    );
    let supplied = header(request.headers(), "x-customer-token").map(str::to_owned);
    let cookie = credential(request.headers(), &names(&t, secure).0);
    let using_cookie =
        !entry && cookie.is_some() && supplied.as_deref().is_none_or(|s| s == MARKER);
    if using_cookie
        && !header(request.headers(), "x-veyndo-customer-csrf")
            .is_some_and(|p| auth::browser::equal(p, &proof(cookie.as_ref().unwrap(), &t)))
    {
        if path == "/store-api/account/logout" && request.method() == axum::http::Method::POST {
            let mut r = Json(json!({"loggedOut":true})).into_response();
            cookies(&mut r, &t, None, secure);
            return r;
        }
        return Error(StatusCode::UNAUTHORIZED, "Customer session expired".into()).into_response();
    }
    if using_cookie {
        request.headers_mut().insert(
            "x-customer-token",
            cookie.as_ref().unwrap().parse().unwrap(),
        );
    } else if supplied.as_deref() == Some(MARKER) {
        request.headers_mut().remove("x-customer-token");
    }
    let mut response = next.run(request).await;
    if path == "/store-api/account/logout" {
        if response.status() == StatusCode::UNAUTHORIZED {
            response = Json(json!({"loggedOut":true})).into_response();
        }
        cookies(&mut response, &t, None, secure);
        return response;
    }
    if using_cookie {
        response
            .headers_mut()
            .insert("cache-control", "no-store".parse().unwrap());
    }
    if !response.status().is_success()
        || !(entry
            || matches!(
                path.as_str(),
                "/store-api/account/profile" | "/store-api/account/password"
            ))
    {
        return response;
    }
    let (parts, body) = response.into_parts();
    let Ok(bytes) = to_bytes(body, 1024 * 1024).await else {
        return bad("Customer authentication response exceeds its limit").into_response();
    };
    let Ok(mut value) = serde_json::from_slice::<Value>(&bytes) else {
        return Response::from_parts(parts, Body::from(bytes));
    };
    let issued = value["customerToken"].as_str().is_some();
    if !issued && !using_cookie {
        return Response::from_parts(parts, Body::from(bytes));
    }
    let candidate = value["customerToken"]
        .as_str()
        .map(str::to_owned)
        .or(if using_cookie { cookie } else { supplied });
    let Some(candidate) =
        candidate.filter(|s| s.len() == 32 && s.bytes().all(|b| b.is_ascii_hexdigit()))
    else {
        return Response::from_parts(parts, Body::from(bytes));
    };
    let valid=veyndo::tenant_scope::scoped(veyndo::tenant_scope::Scope::Tenant(t.clone()),sqlx::query_scalar::<_,bool>("SELECT EXISTS(SELECT 1 FROM customer_sessions s JOIN customers c ON c.tenant=s.tenant AND c.email=s.email WHERE s.tenant=$1 AND s.digest=$2 AND s.expires_at>now() AND c.active)").bind(&t).bind(hash(&candidate)).fetch_one(&a.db)).await;
    if !matches!(valid, Ok(true)) {
        return Error(StatusCode::UNAUTHORIZED, "Customer session expired".into()).into_response();
    }
    value["customerToken"] = json!(MARKER);
    value["customerBrowserSession"] = json!(true);
    value["customerBrowserCsrf"] = json!(proof(&candidate, &t));
    let mut response = Response::from_parts(parts, Body::from(value.to_string()));
    response.headers_mut().remove("content-length");
    if issued || !using_cookie {
        cookies(&mut response, &t, Some(&candidate), secure);
    } else {
        response
            .headers_mut()
            .insert("cache-control", "no-store".parse().unwrap());
    }
    response
}
