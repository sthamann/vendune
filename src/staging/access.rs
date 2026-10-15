//! Selective publication checks every selected domain's current rights before writing any live row.
use super::*;
pub(super) fn permit(h: &RequestContext, keys: &[String]) -> Result<()> {
    for key in keys {
        let scope = match key.split(':').next().unwrap_or("") {
            "product" | "category" | "asset" => "catalog.write",
            "document" => "knowledge.write",
            "app" | "appdata" => "apps.manage",
            "b2b-company" | "b2b-unit" => "b2b.manage",
            "channel" => "channels.manage",
            "rule" | "promotion" | "flow" => "automation.manage",
            "company" | "company-channel" | "settings" | "settings-channel" | "experience"
            | "order-workflow" => "settings.write",
            _ => return Err(bad("Unsupported release unit")),
        };
        auth::permit(h, scope)?;
        if key.starts_with("b2b-") {
            auth::permit(h, "b2b.read")?;
            auth::permit(h, "customers.pii")?;
        }
        if key.starts_with("b2b-unit:") {
            auth::permit(h, "catalog.read")?;
        }
    }
    Ok(())
}

/// Staging diffs contain actual records, so each domain read right is mandatory.
pub(super) fn can_read(h: &RequestContext, key: &str) -> bool {
    let scope = match key.split(':').next().unwrap_or("") {
        "product" | "category" | "asset" => "catalog.read",
        "document" => "knowledge.read",
        "app" => "apps.read",
        "appdata" => "apps.manage",
        "b2b-company" | "b2b-unit" => "b2b.read",
        "channel" => "channels.read",
        "rule" | "promotion" | "flow" => "automation.read",
        _ => "settings.read",
    };
    auth::allowed(h, scope)
        && (!(key.starts_with("b2b-") || key.starts_with("appdata:"))
            || auth::allowed(h, "customers.pii"))
}

/// App diffs expose actual records, so the current model's list action rights apply.
pub(super) async fn can_read_unit(a: &App, h: &RequestContext, t: &str, key: &str) -> Result<bool> {
    if !key.starts_with("appdata:") {
        return Ok(can_read(h, key));
    }
    if !auth::allowed(h, "apps.read") {
        return Ok(false);
    }
    let parts = key.split(':').collect::<Vec<_>>();
    if parts.len() != 4 {
        return Ok(false);
    }
    let m = apps::package(a, t, parts[1], false).await?;
    let Some(e) = m.entities.iter().find(|e| e.name == parts[2]) else {
        return Ok(false);
    };
    if !e.public_read && !auth::allowed(h, "customers.pii") {
        return Ok(false);
    }
    Ok(apps::record_access(&m, e, h, "list").is_ok())
}

/// Baseline values retain their original read boundary after schema/permission changes.
pub(super) fn before(
    h: &RequestContext,
    key: &str,
    baseline: &Value,
    current: &Value,
) -> Option<Value> {
    let value = baseline.get(key)?;
    if !key.starts_with("appdata:") {
        return Some(value.clone());
    }
    let parts = key.split(':').collect::<Vec<_>>();
    if parts.len() != 4 {
        return None;
    }
    let old: apps::Manifest = serde_json::from_value(
        baseline
            .get(format!("app:{}", parts[1]))?
            .get("manifest")?
            .clone(),
    )
    .ok()?;
    let prior = old.entities.iter().find(|e| e.name == parts[2])?;
    if apps::record_access(&old, prior, h, "list").is_err()
        || (!prior.public_read && !auth::allowed(h, "customers.pii"))
    {
        return None;
    }
    let new: apps::Manifest = serde_json::from_value(
        current
            .get(format!("app:{}", parts[1]))?
            .get("manifest")?
            .clone(),
    )
    .ok()?;
    let entity = new.entities.iter().find(|e| e.name == parts[2])?;
    let mut projection = serde_json::Map::new();
    projection.insert("id".into(), value["id"].clone());
    for field in &entity.fields {
        if let Some(v) = value.get(&field.name) {
            projection.insert(field.name.clone(), v.clone());
        }
    }
    Some(Value::Object(projection))
}
