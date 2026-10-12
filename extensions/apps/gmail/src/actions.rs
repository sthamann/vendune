//! App-owned connector capabilities and provider settings; shared host supplies tenant-bound storage.
use super::super::*;
use super::{OAuth, Settings};
pub const OAUTH: OAuth = OAuth {
    prefix: "GOOGLE",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    slack: false,
    authorize: "google_authorize",
    token: "google_token",
};
pub const SETTINGS: Settings = Settings {
    keys: &["labelId"],
    booleans: &[],
    identifiers: &[],
    cursor_field: Some("labelId"),
};
pub async fn action(store: &Store, t: &str, name: &str, v: &Value) -> Result<Value> {
    let a = "gmail";
    match name {
        "labels" => {
            network::request(
                &format!("{}/users/me/labels", network::endpoint("gmail")?),
                None,
                Some(&oauth::token(store, t, a).await?),
                false,
            )
            .await
        }
        "sync" => {
            store
                .enqueue(t, a, &text(v, "requestKey"), &json!({"operation":"sync"}))
                .await
        }
        _ => Err(Error::Invalid("Unknown connector action")),
    }
}
