//! Placed app elements resolve only active, public surfaces of this tenant; app code stays in its own package.
use super::*;
pub(super) async fn validate_owned(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tenant: &str,
    element: &ElementRef,
) -> Result<()> {
    let manifest = sqlx::query_scalar::<_, Value>(
        "SELECT manifest FROM app_packages WHERE tenant=$1 AND id=$2 AND active",
    )
    .bind(tenant)
    .bind(&element.app)
    .fetch_optional(&mut **tx)
    .await?
    .ok_or(bad("Page element app is not active in this shop"))?;
    let manifest: apps::Manifest =
        serde_json::from_value(manifest).map_err(|_| bad("Invalid element app"))?;
    let surface = manifest
        .surfaces
        .iter()
        .find(|s| s.id == element.surface && s.location == "storefront.block")
        .ok_or(bad("App does not expose this public page element"))?;
    if surface
        .actions
        .iter()
        .any(|name| !manifest.actions.iter().any(|a| a.name == *name && a.public))
    {
        return Err(bad("Page element exposes a private action"));
    }
    apps::surfaces::validate_contract(&manifest)?;
    Ok(())
}
