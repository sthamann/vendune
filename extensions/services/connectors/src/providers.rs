//! Provider-specific read imports and notification mapping stay outside the commerce kernel.
use super::*;
#[path = "../../../apps/google-analytics/src/provider.rs"]
mod analytics;
#[path = "../../../apps/gmail/src/provider.rs"]
mod gmail;
pub use analytics::analytics;
pub use gmail::gmail;
#[path = "../../../apps/slack/src/provider.rs"]
mod slack;
pub use slack::slack;

pub struct OAuth {
    pub prefix: &'static str,
    pub scope: &'static str,
    pub slack: bool,
    pub authorize: &'static str,
    pub token: &'static str,
}
#[path = "../../../apps/google-analytics/src/actions.rs"]
mod analytics_actions;
#[path = "../../../apps/gmail/src/actions.rs"]
mod gmail_actions;
#[path = "../../../apps/slack/src/actions.rs"]
mod slack_actions;
pub fn oauth(a: &str) -> Result<&'static OAuth> {
    match a {
        "google_analytics" => Ok(&analytics_actions::OAUTH),
        "gmail" => Ok(&gmail_actions::OAUTH),
        "slack" => Ok(&slack_actions::OAUTH),
        _ => Err(Error::Invalid("Unknown OAuth app")),
    }
}
pub fn settings(a: &str) -> Result<&'static Settings> {
    match a {
        "google_analytics" => Ok(&analytics_actions::SETTINGS),
        "gmail" => Ok(&gmail_actions::SETTINGS),
        "slack" => Ok(&slack_actions::SETTINGS),
        _ => Err(Error::Invalid("Unknown settings app")),
    }
}
pub async fn action(store: &Store, t: &str, a: &str, name: &str, v: &Value) -> Result<Value> {
    match a {
        "google_analytics" => analytics_actions::action(store, t, name, v).await,
        "gmail" => gmail_actions::action(store, t, name, v).await,
        "slack" => slack_actions::action(store, t, name, v).await,
        _ => Err(Error::Invalid("Unknown connector app")),
    }
}
pub async fn event(store: &Store, t: &str, a: &str, event: &Value) -> Result<Value> {
    match a {
        "email" => email::event(store, t, event).await,
        "slack" => slack_actions::event(store, t, event).await,
        _ => Ok(json!({"ignored":true})),
    }
}

pub struct Settings {
    pub keys: &'static [&'static str],
    pub booleans: &'static [&'static str],
    pub identifiers: &'static [(&'static str, &'static str)],
    pub cursor_field: Option<&'static str>,
}
