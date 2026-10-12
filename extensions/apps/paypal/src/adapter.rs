//! Legacy PayPal admission/account wiring belongs to the PayPal package, not a second pricing owner.
use super::{Attempt, PaymentProvider};
use crate::payments::paypal;
use crate::{App, Error, Result, StatusCode, StoredCart, Value, bad, conflict, json, uid};
#[derive(Clone)]
pub(crate) struct Account {
    pub client: String,
    pub secret: String,
    pub webhook: String,
    pub merchant: Option<String>,
    pub bn_code: String,
}
pub(crate) fn account(t: &str) -> Result<Account> {
    let all = &crate::runtime_config::get().paypal_accounts;
    let v = &all[t];
    Ok(Account {
        client: v["clientId"]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or(Error(
                StatusCode::SERVICE_UNAVAILABLE,
                "Connect this shop's PayPal Sandbox account on the server first".into(),
            ))?
            .into(),
        secret: v["clientSecret"]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or(bad("Payment secret missing"))?
            .into(),
        webhook: v["webhookId"].as_str().unwrap_or("").into(),
        merchant: v["merchantId"].as_str().map(str::to_string),
        bn_code: v["bnCode"]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or(bad("Provider attribution configuration missing"))?
            .to_string(),
    })
}
pub(crate) fn base() -> Result<String> {
    Ok(crate::runtime_config::get().paypal_base.clone())
}
pub(crate) fn environment() -> &'static str {
    crate::runtime_config::get().paypal_environment
}
pub(crate) async fn prepare(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    c: &StoredCart,
    order: &mut Value,
    minor: i64,
    return_origin: Option<&str>,
) -> Result<()> {
    if order["cart"]["paymentMethod"]["provider"].is_string() {
        return crate::payments::prepare_remote(tx, c, order, minor, return_origin).await;
    }
    let version: Option<String> = sqlx::query_scalar(
        "SELECT version FROM app_packages WHERE tenant=$1 AND id='paypal' AND active FOR SHARE",
    )
    .bind(&c.tenant)
    .fetch_optional(&mut **tx)
    .await?;
    let version = version.ok_or(conflict("Payment app is not active"))?;
    let id = uid();
    let bn = account(&c.tenant)?.bn_code;
    order["payment"] = json!({"method":order["cart"]["paymentMethod"],"provider":"paypal","state":"pending","attemptId":id,"environment":environment(),"realMoneyCharged":false,"bnCode":bn});
    sqlx::query("INSERT INTO payment_attempts(id,tenant,order_id,provider,adapter_version,amount_minor,currency,environment,bn_code,provider_context,currency_scale) VALUES($1,$2,$3,'paypal',$4,$5,$8,$6,$7,$9,$10)").bind(&id).bind(&c.tenant).bind(order["id"].as_str().unwrap()).bind(version).bind(minor).bind(environment()).bind(&bn).bind(order["cart"]["price"]["currency"].as_str().unwrap_or("EUR")).bind(json!({"currencyScale":order["cart"]["price"]["currencyScale"]})).bind(order["cart"]["price"]["currencyScale"].as_i64().unwrap_or(2) as i16).execute(&mut **tx).await?;
    for item in &c.data.items {
        sqlx::query("INSERT INTO inventory_reservations(tenant,attempt_id,product_id,quantity) VALUES($1,$2,$3,$4)").bind(&c.tenant).bind(&id).bind(&item.id).bind(item.quantity as i32).execute(&mut **tx).await?;
    }
    crate::payments::enqueue_tx(
        tx,
        &c.tenant,
        &id,
        "create",
        &format!("{id}:create"),
        &json!({}),
    )
    .await?;
    Ok(())
}
struct PaypalSandbox;
impl PaymentProvider for PaypalSandbox {
    async fn execute(
        &self,
        a: &App,
        p: &Attempt,
        op: &str,
        key: &str,
        input: &Value,
    ) -> Result<Value> {
        if p.adapter_version != "1.0.0"
            || p.environment != environment()
            || p.bn_code != account(&p.tenant)?.bn_code
        {
            return Err(Error(StatusCode::SERVICE_UNAVAILABLE,"Payment adapter version/environment mismatch; use the original adapter to reconcile".into()));
        }
        paypal::execute(a, p, op, key, input).await
    }
}
pub(crate) async fn execute(
    a: &App,
    p: &Attempt,
    op: &str,
    key: &str,
    input: &Value,
) -> Result<Value> {
    PaypalSandbox.execute(a, p, op, key, input).await
}
