//! POS presentation/location configuration lives on the existing channel, not in a second settings store.
use crate::*;
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Config {
    pub country: String,
    #[serde(default = "columns")]
    pub columns: u8,
    #[serde(default)]
    pub compact: bool,
    #[serde(default)]
    pub receipt_message: HashMap<String, String>,
}
fn columns() -> u8 {
    4
}
pub(crate) fn validate_channel(c: &marketing::Channel, s: &commerce::Settings) -> Result<()> {
    if c.kind != "pos" {
        if c.pos.is_some() {
            return Err(bad("POS configuration requires a POS channel"));
        }
        return Ok(());
    }
    let cfg = c.pos.as_ref().ok_or(bad("POS location country required"))?;
    if !s.countries.contains(&cfg.country) || !(2..=6).contains(&cfg.columns) {
        return Err(bad("Invalid POS country or grid columns"));
    }
    if !cfg.receipt_message.is_empty() {
        commerce::validate_names(&json!(cfg.receipt_message), s, 500)?;
    }
    Ok(())
}
/// Called inside channel save, with settings locked before the channel. Installation is transactional.
pub(crate) async fn configure(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    t: &str,
    id: &str,
    data: &Value,
    new: bool,
) -> Result<()> {
    if data["kind"] != "pos" || !new {
        return Ok(());
    }
    let base = commerce::decode_config(
        sqlx::query_scalar("SELECT data FROM commerce_settings WHERE tenant=$1")
            .bind(t)
            .fetch_one(&mut **tx)
            .await?,
    )?;
    validate_channel(
        &serde_json::from_value(data.clone()).map_err(|_| bad("Invalid POS channel"))?,
        &base,
    )?;
    let mut next = base.clone();
    if next.payments.iter().any(|p| p.id == "pos-cash") {
        return Err(bad("Reserved POS cash method already exists"));
    }
    next.payments.push(serde_json::from_value(json!({"id":"pos-cash","name":"Cash","translations":{"en":{"name":"Cash"},"de":{"name":"Barzahlung"},"fr":{"name":"Espèces"},"es":{"name":"Efectivo"}},"active":true,"businessOnly":false,"mode":"cash"})).unwrap());
    // Immediate handover shares the ordinary delivery owner. Never reinterpret a paid shipping method.
    next.shipping.retain(|s| s.id != "pickup");
    next.shipping.push(serde_json::from_value(json!({"id":"pickup","name":"Collection","translations":{"en":{"name":"Collection"},"de":{"name":"Mitnahme"},"fr":{"name":"Retrait"},"es":{"name":"Recogida"}},"active":true,"price":0,"freeAbove":null,"minDays":0,"maxDays":0,"countries":base.countries,"taxType":"highest"})).unwrap());
    commerce::validate_config(&next)?;
    sqlx::query("INSERT INTO commerce_overrides(tenant,channel_id,data) VALUES($1,$2,$3)")
        .bind(t)
        .bind(id)
        .bind(commerce::settings_difference(&base, &next))
        .execute(&mut **tx)
        .await?;
    Ok(())
}
