//! Optional trusted ingress geography. Ordinary country headers never establish visitor location.
use crate::*;
pub(super) fn configured() -> bool {
    runtime_config::get().behavior_geo_secret.is_some()
}
pub(super) fn country(h: &RequestContext) -> Option<String> {
    let secret = runtime_config::get().behavior_geo_secret.as_deref()?;
    let supplied = header(h, "x-veyndo-geo-token")?;
    if hash(supplied) != hash(secret) {
        return None;
    }
    let country = header(h, "x-veyndo-geo-country")?;
    // Reuse the bundled world catalogue rather than accepting invented country codes.
    static WORLD: std::sync::OnceLock<Vec<crate::commerce::Country>> = std::sync::OnceLock::new();
    WORLD
        .get_or_init(|| {
            serde_json::from_str(include_str!("../../../fixtures/geography.json"))
                .expect("bundled country catalogue")
        })
        .iter()
        .find(|c| c.iso_assigned && c.code == country)
        .map(|c| c.code.clone())
}
