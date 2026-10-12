//! Selective publication checks every selected domain's current rights before writing any live row.
use super::*;
pub(super) fn permit(h: &RequestContext, keys: &[String]) -> Result<()> {
    for key in keys {
        let scope = match key.split(':').next().unwrap_or("") {
            "product" | "category" | "asset" | "document" => "catalog.write",
            "app" | "appdata" => "apps.manage",
            "b2b-company" | "b2b-unit" => "b2b.manage",
            "company" | "company-channel" | "settings" | "settings-channel" | "experience"
            | "rule" | "promotion" | "flow" | "channel" | "order-workflow" => "settings.write",
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
