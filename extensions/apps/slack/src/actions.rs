//! App-owned connector capabilities and provider settings; shared host supplies tenant-bound storage.
use super::super::*;
use super::{OAuth, Settings};
pub const OAUTH: OAuth = OAuth {
    prefix: "SLACK",
    scope: "chat:write,channels:read,groups:read",
    slack: true,
    authorize: "slack_authorize",
    token: "slack_token",
};
pub const SETTINGS: Settings = Settings {
    keys: &["channelId", "notifyOrders", "template"],
    booleans: &["notifyOrders"],
    identifiers: &[("channelId", r"^[CG][A-Z0-9]{6,30}$")],
    cursor_field: None,
};
pub async fn action(store: &Store, t: &str, name: &str, v: &Value) -> Result<Value> {
    let a = "slack";
    match name {
"channels" => {let data=network::request(&format!("{}/conversations.list?exclude_archived=true&limit=200&types=public_channel,private_channel",network::endpoint("slack")?),None,Some(&oauth::token(store,t,a).await?),false).await?;checked(data["ok"]==true,"Slack channel listing rejected")?;Ok(json!({"channels":data["channels"].as_array().into_iter().flatten().map(|c|json!({"id":c["id"],"name":c["name"],"member":c["is_member"]==true})).collect::<Vec<_>>()}))},
"post_order" => store.enqueue(t,a,&text(v,"requestKey"),&json!({"operation":"post","channel":v["channel"],"template":v["template"],"event":v.get("event").cloned().unwrap_or(json!({})),"kind":v["kind"].as_str().unwrap_or("order.placed"),"deliveryKey":v["requestKey"]})).await,
 _ => Err(Error::Invalid("Unknown connector action")),
    }
}
pub async fn event(store: &Store, t: &str, event: &Value) -> Result<Value> {
    if store.get(t, "slack").await?["settings"]["notifyOrders"] == true
        && event["kind"] == "order.placed"
    {
        action(store,t,"post_order",&json!({"requestKey":event["idempotencyKey"],"event":event["data"],"kind":event["kind"]})).await
    } else {
        Ok(json!({"ignored":true}))
    }
}
