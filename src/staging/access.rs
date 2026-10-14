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
