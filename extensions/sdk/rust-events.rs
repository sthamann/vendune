//! Language-neutral public event-signature contract for independent Rust app services; no commerce implementation.
use axum::http::HeaderMap;
use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
pub fn verify(
    headers: &HeaderMap,
    raw: &[u8],
    secret: &str,
    tenant: &str,
    app: &str,
    now: i64,
) -> bool {
    let header = |name: &str| {
        headers
            .get(name)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
    };
    let stamp = header("x-app-timestamp");
    let Ok(time) = stamp.parse::<i64>() else {
        return false;
    };
    let key = header("x-app-event-id");
    if now.abs_diff(time) > 300
        || raw.len() > 65536
        || header("x-tenant") != tenant
        || header("x-app-id") != app
        || key.len() != 64
    {
        return false;
    }
    let raw_hex = raw.iter().map(|b| format!("{b:02x}")).collect::<String>();
    if key != format!("{:x}", Sha256::digest(format!("{tenant}:{app}:{raw_hex}"))) {
        return false;
    }
    let signature = header("x-app-signature");
    if signature.len() != 64 {
        return false;
    }
    let Ok(bytes) = signature
        .as_bytes()
        .as_chunks::<2>()
        .0
        .iter()
        .map(|pair| {
            std::str::from_utf8(pair)
                .ok()
                .and_then(|p| u8::from_str_radix(p, 16).ok())
                .ok_or(())
        })
        .collect::<Result<Vec<_>, _>>()
    else {
        return false;
    };
    let canonical = format!("{tenant}\n{app}\n{stamp}\n{key}\n{:x}", Sha256::digest(raw));
    let Ok(mut mac) = Hmac::<Sha256>::new_from_slice(secret.as_bytes()) else {
        return false;
    };
    mac.update(canonical.as_bytes());
    mac.verify_slice(&bytes).is_ok()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn malformed_expired_or_foreign_headers_are_denied() {
        assert!(!verify(&HeaderMap::new(), b"{}", "secret", "own", "app", 1));
        let mut h = HeaderMap::new();
        h.insert("x-app-timestamp", "-9223372036854775808".parse().unwrap());
        assert!(!verify(&h, b"{}", "secret", "own", "app", i64::MAX));
    }
}
