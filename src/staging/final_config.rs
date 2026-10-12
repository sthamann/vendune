//! Validate the final published channel/automation aggregate and initialize native POS defaults.
use super::*;
pub(super) async fn validate(
    tx: &mut Tx<'_>,
    t: &str,
    h: &RequestContext,
    keys: &[String],
    current: &Value,
    actual: &Value,
    base: &mut Value,
) -> Result<()> {
    // Validate references against the final aggregate, including jointly selected new rules.
    for key in keys {
        if let Some((kind, unit)) = key.split_once(':') {
            if ["rule", "promotion", "flow", "channel"].contains(&kind) {
                marketing::validate_references(
                    tx,
                    t,
                    if kind == "rule" { "rules" } else { kind },
                    unit,
                    &current[key],
                )
                .await?;
            }
            if kind == "flow" {
                marketing::validate_flow_config(tx, t, h, &current[key]).await?;
            }
            if kind == "channel"
                && !matches!(
                    current[key]["visibility"].as_str(),
                    None | Some("public" | "private")
                )
            {
                return Err(bad("Invalid channel visibility"));
            }
            if kind == "channel" && unit == "default" && current[key]["kind"] != "storefront" {
                return Err(bad("Main channel must remain storefront"));
            }
            if kind == "channel" {
                let settings = commerce::decode_config(
                    sqlx::query_scalar("SELECT data FROM commerce_settings WHERE tenant=$1")
                        .bind(t)
                        .fetch_one(&mut **tx)
                        .await?,
                )?;
                marketing::validate_channel_config(tx, t, unit, &current[key], &settings).await?;
                let configured: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM commerce_overrides WHERE tenant=$1 AND channel_id=$2)").bind(t).bind(unit).fetch_one(&mut **tx).await?;
                crate::pos::configure(
                    tx,
                    t,
                    unit,
                    &current[key],
                    !actual.as_object().unwrap().contains_key(key) && !configured,
                )
                .await?;
                if current[key]["kind"] == "pos" && !configured {
                    let patch: Value = sqlx::query_scalar(
                        "SELECT data FROM commerce_overrides WHERE tenant=$1 AND channel_id=$2",
                    )
                    .bind(t)
                    .bind(unit)
                    .fetch_one(&mut **tx)
                    .await?;
                    base["live"][format!("settings-channel:{unit}")] = patch;
                }
            }
        }
    }
    Ok(())
}
