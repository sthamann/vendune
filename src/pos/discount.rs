//! Audited cashier discounts use exact minor units and the existing native tax allocator in both quote and commit.
use super::*;
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Discount {
    pub kind: String,
    pub value: u64,
    pub currency: String,
    pub reason: String,
    pub actor: String,
}
impl Discount {
    fn minor(&self, goods: u64, currency: &str, actor: bool) -> Result<i64> {
        if self.currency != currency || goods > i64::MAX as u64 {
            return Err(bad("Discount currency changed; remove and apply again"));
        }
        let minor = match self.kind.as_str() {
            "percent" if self.value <= 10000 => {
                ((u128::from(goods) * u128::from(self.value) + 5000) / 10000) as u64
            }
            "fixed" => self.value,
            _ => {
                return Err(bad(
                    "Discount requires basis points from 0 to 10000 or exact minor units",
                ));
            }
        };
        if !verified_kernel::pos_discount_admissible(
            actor,
            self.currency == currency,
            !self.reason.trim().is_empty(),
            minor,
            goods,
        ) {
            return Err(bad("Discount exceeds the current goods value"));
        }
        Ok(minor as i64)
    }
}
pub(super) async fn save(a: &App, h: &RequestContext, v: &Value, revision: i64) -> Result<Value> {
    auth::permit(h, "orders.write")?;
    auth::permit(h, "payments.manage")?;
    let mut tx = a.db.begin().await?;
    let row = sqlx::query("SELECT * FROM carts WHERE tenant=$1 AND token=$2 FOR UPDATE")
        .bind(tenant(h)?)
        .bind(token(h)?)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(bad("Cart unavailable"))?;
    let mut c = stored(&row)?;
    pos::guard_cart(h, &c)?;
    if c.data.pos_actor.is_none() || c.status != "open" || revision != c.revision {
        return Err(conflict("POS sale changed; reload before discounting"));
    }
    let previous = c.data.pos_discount.clone();
    c.data.pos_discount = if v.is_null() {
        None
    } else {
        let mut value = v.clone();
        value["actor"] = json!(h.pos.as_ref().ok_or(bad("Cashier required"))?.actor);
        let d: Discount =
            serde_json::from_value(value).map_err(|_| bad("Invalid cashier discount"))?;
        if d.reason.trim().is_empty()
            || d.reason.len() > 240
            || d.reason.chars().any(char::is_control)
        {
            return Err(bad("Discount reason required (1..240 characters)"));
        }
        Some(d)
    };
    c.revision += 1;
    let quote = cart_json(a, &c).await?;
    sqlx::query("UPDATE carts SET data=$1,revision=$2 WHERE tenant=$3 AND id=$4")
        .bind(json!(c.data))
        .bind(c.revision)
        .bind(&c.tenant)
        .bind(&c.id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,'pos.discount_changed',$2)").bind(&c.tenant).bind(json!({"cartId":c.id,"salesChannelId":c.data.sales_channel,"cashierId":h.pos.as_ref().map(|p|&p.actor),"previous":previous,"discount":c.data.pos_discount,"revision":c.revision})).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(quote)
}
pub(crate) fn apply(
    c: &StoredCart,
    mut q: Value,
    ps: &[Product],
    settings: &commerce::Settings,
    revision: i64,
) -> Result<Value> {
    if let Some(d) = &c.data.pos_discount {
        if c.data.pos_actor.as_deref() != Some(&d.actor) {
            return Err(bad("Cashier discount requires its admitted POS cart"));
        }
        let currency = q["price"]["currency"]
            .as_str()
            .ok_or(bad("Currency missing"))?;
        let scale = q["price"]["currencyScale"]
            .as_u64()
            .ok_or(bad("Currency scale missing"))? as u8;
        let goods = currencies::amount(
            q["price"]["positionPrice"]
                .as_f64()
                .ok_or(bad("Goods total missing"))?,
            currency,
            scale,
        )?
        .minor();
        let minor = d.minor(
            u64::try_from(goods).map_err(|_| bad("Negative goods total"))?,
            currency,
            c.data.pos_actor.as_deref() == Some(&d.actor),
        )?;
        commerce::app_adjustment(&mut q, "discount", minor)?;
        q = commerce::enrich(q, c, ps, settings, revision)?;
        q["posDiscount"] = json!({"kind":d.kind,"value":d.value,"currency":d.currency,"reason":d.reason,"actor":d.actor,"minor":minor.to_string()});
    }
    Ok(q)
}
#[cfg(test)]
mod tests {
    use super::*;
    fn d(kind: &str, value: u64) -> Discount {
        Discount {
            kind: kind.into(),
            value,
            currency: "EUR".into(),
            reason: "Damaged packaging".into(),
            actor: "cashier".into(),
        }
    }
    #[test]
    fn exact_bounds_and_currency_fence() {
        assert_eq!(d("percent", 1000).minor(999, "EUR", true).unwrap(), 100);
        assert_eq!(d("percent", 10000).minor(999, "EUR", true).unwrap(), 999);
        assert_eq!(d("fixed", 100).minor(999, "EUR", true).unwrap(), 100);
        for (kind, value) in [("fixed", 1000), ("percent", 10001), ("other", 1)] {
            assert!(d(kind, value).minor(999, "EUR", true).is_err());
        }
        assert!(d("fixed", 1).minor(999, "JPY", true).is_err());
        assert!(d("fixed", 1).minor(999, "EUR", false).is_err());
        for goods in [0, 1, 9, 99, 999, 100_000_000] {
            for basis in [0, 1, 500, 3333, 9999, 10000] {
                let n = d("percent", basis).minor(goods, "EUR", true).unwrap();
                assert!(n >= 0 && n as u64 <= goods);
            }
        }
    }
}
