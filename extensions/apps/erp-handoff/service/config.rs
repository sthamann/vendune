//! Operator-owned tenant destinations and callback keys; request bodies cannot choose URLs or credentials.
use serde::Deserialize;
use std::{collections::HashMap, env};
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Tenant {
    #[serde(default)]
    pub webhook_secret: Option<String>,
    pub callback_token: String,
    pub erp_url: String,
    pub erp_token: String,
}
pub(super) struct Config {
    pub gateway_token: String,
    pub app_id: String,
    pub core_url: String,
    pub tenants: HashMap<String, Tenant>,
}
impl Config {
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let gateway_token = env::var("APP_TOKEN")?;
        let app_id = env::var("APP_ID").unwrap_or("erp_handoff".into());
        let core_url = env::var("APP_CORE_URL")?;
        let tenants: HashMap<String, Tenant> = serde_json::from_str(&env::var("APP_TENANTS")?)?;
        if gateway_token.len() < 24
            || tenants.is_empty()
            || tenants.len() > 1000
            || app_id.is_empty()
            || app_id.len() > 32
            || !app_id
                .bytes()
                .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
        {
            return Err("Invalid operator credentials or app ID".into());
        }
        let fixtures = env::var("ALLOW_LOOPBACK_FIXTURES").as_deref() == Ok("true");
        destination(&core_url, fixtures)?;
        for (t, c) in &tenants {
            if c.webhook_secret.as_ref().is_some_and(|s| s.len() < 32)
                || t.is_empty()
                || t.len() > 100
                || c.callback_token.len() < 24
                || c.erp_token.len() < 24
            {
                return Err("Invalid tenant callback credentials".into());
            }
            destination(&c.erp_url, fixtures)?;
        }
        Ok(Self {
            gateway_token,
            app_id,
            core_url,
            tenants,
        })
    }
}
fn destination(value: &str, fixtures: bool) -> Result<(), Box<dyn std::error::Error>> {
    let u = reqwest::Url::parse(value)?;
    if !u.username().is_empty()
        || u.password().is_some()
        || u.query().is_some()
        || u.fragment().is_some()
        || !(u.scheme() == "https"
            || (fixtures
                && u.scheme() == "http"
                && matches!(u.host_str(), Some("127.0.0.1" | "localhost" | "[::1]"))))
    {
        return Err(
            "Destination requires operator-owned HTTPS; loopback HTTP is fixture-only".into(),
        );
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn destinations_are_not_redirectable_caller_urls() {
        assert!(destination("http://evil.test", true).is_err());
        assert!(destination("https://user:pass@example.test", false).is_err());
        assert!(destination("http://127.0.0.1:1234", true).is_ok());
        assert!(destination("http://127.0.0.1:1234", false).is_err());
    }
}
