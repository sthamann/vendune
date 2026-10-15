//! Existing standard-app actions and event/export endpoints share validated tenant-bound dispatch.
use super::*;
pub async fn public(store: &Store, t: &str, a: &str) -> Result<Value> {
    let v = store.get(t, a).await?;
    let prefix = providers::oauth(a)?.prefix;
    Ok(
        json!({"connected":v["tokens"].is_object(),"revision":v["revision"],"settings":v["settings"],"jobs":store.jobs(t,a).await?,"oauthClientConfigured":env::var(format!("{prefix}_CLIENT_ID")).is_ok_and(|s|!s.is_empty()) && env::var(format!("{prefix}_CLIENT_SECRET")).is_ok_and(|s|!s.is_empty())}),
    )
}
pub async fn action(store: &Store, t: &str, a: &str, name: &str, v: &Value) -> Result<Value> {
    if a == "email" {
        return email::action(store, t, name, v).await;
    }
    match name {
        "status" => public(store, t, a).await,
        "connect" => oauth::start(store, t, a).await,
        "disconnect" => oauth::disconnect(store, t, a).await,
        "configure" => configure(store, t, a, v).await,
        _ => providers::action(store, t, a, name, v).await,
    }
}
async fn configure(store: &Store, t: &str, a: &str, v: &Value) -> Result<Value> {
    let s = &v["settings"];
    let obj = s
        .as_object()
        .ok_or(Error::Invalid("Settings must be an object"))?;
    let allowed = providers::settings(a)?;
    checked(
        obj.keys().all(|k| allowed.keys.contains(&k.as_str()))
            && obj.iter().all(|(k, v)| {
                if allowed.booleans.contains(&k.as_str()) {
                    v.is_boolean()
                } else {
                    v.is_string()
                }
            })
            && s.to_string().len() <= 4000,
        "Unknown or invalid connector setting",
    )?;
    for (key, pattern) in allowed.identifiers {
        if let Some(value) = s[*key].as_str().filter(|s| !s.is_empty()) {
            checked(
                regex::Regex::new(pattern).unwrap().is_match(value),
                "Invalid connector identifier",
            )?;
        }
    }
    let mut tx = store.tx(t).await?;
    store.lock(&mut tx, t, a).await?;
    let mut current = store.get_tx(&mut tx, t, a).await?;
    if current["revision"] != v["revision"] {
        return Err(Error::Conflict);
    }
    if allowed
        .cursor_field
        .is_some_and(|key| current["settings"][key] != s[key])
    {
        current.as_object_mut().unwrap().remove("historyId");
    }
    current["settings"] = s.clone();
    current["revision"] = json!(current["revision"].as_u64().unwrap_or(0) + 1);
    store.save(&mut tx, t, a, &current).await?;
    tx.commit().await?;
    public(store, t, a).await
}
pub async fn handle(store: &Store, t: &str, a: &str, path: &str, v: &Value) -> Result<Value> {
    checked(
        APPS.contains(&a)
            && regex::Regex::new(r"^[a-z0-9][a-z0-9-]{1,47}$")
                .unwrap()
                .is_match(t),
        "Invalid app or shop",
    )?;
    // The native gateway admits the live tenant before calling this private service.
    // Connector writes retain tenant foreign keys; this role cannot read Core identities.
    if let Some(name) = path.strip_prefix("actions/") {
        return action(store, t, a, name, v).await;
    }
    match path {
        "exports" => store.exports(t, a, v["cursor"].as_i64().unwrap_or(0)).await,
        "events" => super::events::receive(store, t, a, v).await,
        _ => Err(Error::Invalid("Unknown app endpoint")),
    }
}
