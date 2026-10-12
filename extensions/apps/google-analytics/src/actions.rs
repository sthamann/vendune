//! App-owned connector capabilities and provider settings; shared host supplies tenant-bound storage.
use super::super::*;
use super::{OAuth, Settings};
pub const OAUTH: OAuth = OAuth {
    prefix: "GOOGLE",
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    slack: false,
    authorize: "google_authorize",
    token: "google_token",
};
pub const SETTINGS: Settings = Settings {
    keys: &["measurementId", "propertyId", "salesChannel"],
    booleans: &[],
    identifiers: &[
        ("measurementId", r"^G-[A-Z0-9]{4,20}$"),
        ("propertyId", r"^[0-9]+$"),
    ],
    cursor_field: None,
};
pub async fn action(store: &Store, t: &str, name: &str, v: &Value) -> Result<Value> {
    let a = "google_analytics";
    match name {
        "tracking" => {
            let config = store.get(t, a).await?;
            let s = &config["settings"];
            let measurement = &s["measurementId"];
            let channel = text(s, "salesChannel");
            let enabled = measurement.as_str().is_some_and(|s| !s.is_empty())
                && (channel.is_empty() || v["salesChannel"] == channel);
            Ok(
                json!({"measurementId":if enabled{measurement.clone()}else{Value::Null},"enabled":enabled}),
            )
        }
        "sync" => {
            store
                .enqueue(t, a, &text(v, "requestKey"), &json!({"operation":"sync"}))
                .await
        }
        _ => Err(Error::Invalid("Unknown connector action")),
    }
}
