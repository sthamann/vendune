//! Only operator configuration supplies core callback destinations; documents cannot choose URLs or credentials.
use std::collections::HashMap;
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Tenant {
    pub core_url: String,
    pub callback_token: String,
}
pub struct Config {
    pub gateway_token: String,
    pub app_id: String,
    pub tenants: HashMap<String, Tenant>,
}
impl Config {
    pub fn load() -> std::result::Result<Self, Box<dyn std::error::Error>> {
        let app_id = std::env::var("APP_ID").unwrap_or("edi".into());
        if app_id.is_empty()
            || app_id.len() > 32
            || !app_id
                .bytes()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'_')
        {
            return Err("Invalid EDI app ID".into());
        }
        let gateway_token = std::env::var("APP_TOKEN")?;
        let tenants: HashMap<String, Tenant> =
            serde_json::from_str(&std::env::var("APP_EDI_TENANTS")?)?;
        if gateway_token.len() < 24 || tenants.is_empty() || tenants.len() > 1000 {
            return Err("Invalid EDI gateway configuration".into());
        }
        for (id, t) in &tenants {
            let url = reqwest::Url::parse(&t.core_url)?;
            let local = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
            if id.is_empty()
                || id.len() > 100
                || t.callback_token.len() < 24
                || (url.scheme() != "https" && !(local && url.scheme() == "http"))
                || !url.username().is_empty()
                || url.password().is_some()
                || url.query().is_some()
                || url.fragment().is_some()
                || url.path() != "/"
            {
                return Err("Invalid fixed core origin or callback credentials".into());
            }
        }
        Ok(Self {
            gateway_token,
            app_id,
            tenants,
        })
    }
}
