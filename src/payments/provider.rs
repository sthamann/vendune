//! Payment provider identity, tenant account configuration and immutable wire context.
use super::remote;
#[path = "../../extensions/apps/paypal/src/adapter.rs"]
mod legacy;
use crate::{App, Result, Row, Value, bad, currencies};
pub(crate) use legacy::{account, base, environment, prepare};

#[derive(Clone)]
pub(crate) struct Attempt {
    pub id: String,
    pub provider: String,
    pub context: Value,
    pub tenant: String,
    pub order: String,
    pub amount: i64,
    pub currency: String,
    pub currency_scale: i16,
    pub state: String,
    pub provider_order: Option<String>,
    pub capture: Option<String>,
    pub refunded: i64,
    pub adapter_version: String,
    pub environment: String,
    pub bn_code: String,
}
pub(crate) fn attempt(r: &sqlx::postgres::PgRow) -> Attempt {
    Attempt {
        id: r.get("id"),
        provider: r.get("provider"),
        context: r.get("provider_context"),
        tenant: r.get("tenant"),
        order: r.get("order_id"),
        amount: r.get("amount_minor"),
        currency: r.get("currency"),
        currency_scale: r.get("currency_scale"),
        state: r.get("state"),
        provider_order: r.get("provider_order"),
        capture: r.get("capture_id"),
        refunded: r.get("refunded_minor"),
        adapter_version: r.get("adapter_version"),
        environment: r.get("environment"),
        bn_code: r.get("bn_code"),
    }
}
pub(crate) fn wire_currency(code: &str) -> Result<sellama::money::Currency> {
    sellama::money::Currency::new(
        code,
        currencies::scale(code).ok_or(bad("Unsupported provider currency"))?,
    )
    .map_err(bad)
}
pub(crate) fn format_amount(minor: i64, code: &str) -> Result<String> {
    Ok(sellama::money::Money::new(minor, wire_currency(code)?).decimal())
}
pub(crate) fn parse_amount(value: &str, code: &str) -> Result<i64> {
    let money = sellama::money::Money::parse(value, wire_currency(code)?).map_err(bad)?;
    if money.minor() < 0 || value.starts_with('-') {
        return Err(bad("Invalid provider money amount"));
    }
    Ok(money.minor())
}
#[cfg(test)]
pub(crate) fn amount_string(minor: i64) -> String {
    sellama::money::Money::new(minor, sellama::money::Currency::eur()).decimal()
}
#[cfg(test)]
pub(crate) fn parse_minor(value: &str) -> Result<i64> {
    let amount =
        sellama::money::Money::parse(value, sellama::money::Currency::eur()).map_err(bad)?;
    if amount.minor() < 0 || value.starts_with('-') {
        return Err(bad("Invalid provider money amount"));
    }
    Ok(amount.minor())
}
/// Each adapter implements this command boundary; the core owns ledger transitions.
pub(crate) trait PaymentProvider {
    async fn execute(
        &self,
        a: &App,
        p: &Attempt,
        op: &str,
        key: &str,
        input: &Value,
    ) -> Result<Value>;
}
pub(crate) async fn dispatch(
    a: &App,
    p: &Attempt,
    op: &str,
    key: &str,
    input: &Value,
) -> Result<Value> {
    if p.provider == "paypal" {
        legacy::execute(a, p, op, key, input).await
    } else {
        remote::execute(a, p, op, key, input).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn currency_wire_amounts_use_iso_precision() {
        assert_eq!(format_amount(123, "JPY").unwrap(), "123");
        assert_eq!(format_amount(7123, "KWD").unwrap(), "7.123");
        assert_eq!(parse_amount("7.123", "KWD").unwrap(), 7123);
        assert!(parse_amount("1.001", "USD").is_err());
        assert!(parse_amount("1.00", "XXX").is_err());
    }
    #[test]
    fn integer_money_roundtrips() {
        for n in [1, 99, 100, 7490, 1000000] {
            assert_eq!(parse_minor(&amount_string(n)).unwrap(), n);
        }
        for s in ["1.2", "-1.00", "NaN", "1e2.00", "999999999999999999999.00"] {
            assert!(parse_minor(s).is_err());
        }
    }
}
