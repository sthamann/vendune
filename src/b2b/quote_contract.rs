//! Accepted offer prices feed the existing currency/tax calculator; checkout consumes the offer atomically.
use super::*;
pub(super) async fn select(a: &App, h: &RequestContext, v: &Value, accept: bool) -> Result<Value> {
    let mut c = load_cart(a, h).await?;
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "b2b.procurement").await?;
    let row = sqlx::query("SELECT * FROM carts WHERE tenant=$1 AND id=$2 FOR UPDATE")
        .bind(&c.tenant)
        .bind(&c.id)
        .fetch_one(&mut *tx)
        .await?;
    c = stored(&row)?;
    if c.status != "open" || v["cartRevision"].as_i64() != Some(c.revision) {
        return Err(conflict("Cart changed; review before selecting the offer"));
    }
    purchase::lock_unit(&mut tx, &c).await?;
    let policy = guard_conn(&mut tx, h, &c)
        .await?
        .ok_or(bad("Select a company unit first"))?;
    require(&policy, "quotes")?;
    let context = c.data.b2b.as_mut().unwrap();
    if accept {
        let id = v["id"].as_str().ok_or(bad("Quote required"))?;
        let row=sqlx::query("SELECT buyer_id,unit_id,cart_id,state,revision,data,(data->>'validUntil')::timestamptz>now() AS valid FROM b2b_quotes WHERE tenant=$1 AND id=$2 FOR UPDATE").bind(&c.tenant).bind(id).fetch_optional(&mut *tx).await?.ok_or(Error(StatusCode::NOT_FOUND,"Quote not found".into()))?;
        if row.get::<String, _>("buyer_id") != context.customer_id
            || row.get::<String, _>("unit_id") != context.unit_id
            || row.get::<String, _>("cart_id") != c.id
        {
            return Err(Error(
                StatusCode::NOT_FOUND,
                "Quote not found in this cart".into(),
            ));
        }
        let data: Value = row.get("data");
        if row.get::<String, _>("state") != "offered"
            || v["revision"].as_i64() != Some(row.get::<i64, _>("revision"))
            || !row.get::<Option<bool>, _>("valid").unwrap_or(false)
            || data["currency"] != c.data.currency
            || data["items"] != json!(c.data.items)
        {
            return Err(conflict(
                "Offer changed, expired or no longer matches this cart",
            ));
        }
        context.quote_id = Some(id.into());
        sqlx::query(
            "UPDATE b2b_quotes SET state='accepted',revision=revision+1 WHERE tenant=$1 AND id=$2",
        )
        .bind(&c.tenant)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    } else {
        if let Some(id) = &context.quote_id {
            sqlx::query("UPDATE b2b_quotes SET state='offered',revision=revision+1 WHERE tenant=$1 AND id=$2 AND state='accepted' AND cart_id=$3 AND buyer_id=$4 AND unit_id=$5")
                .bind(&c.tenant).bind(id).bind(&c.id).bind(&context.customer_id).bind(&context.unit_id).execute(&mut *tx).await?;
        }
        context.quote_id = None;
    }
    c.revision += 1;
    sqlx::query("UPDATE carts SET data=$3,revision=$4 WHERE tenant=$1 AND id=$2")
        .bind(&c.tenant)
        .bind(&c.id)
        .bind(json!(c.data))
        .bind(c.revision)
        .execute(&mut *tx)
        .await?;
    organization::event(&mut tx,&c.tenant,"b2b.quote_selected",json!({"cartId":c.id,"quoteId":c.data.b2b.as_ref().and_then(|b|b.quote_id.as_ref()),"revision":c.revision})).await?;
    tx.commit().await?;
    cart_json(a, &c).await
}
pub(crate) async fn prices(
    conn: &mut sqlx::PgConnection,
    c: &StoredCart,
    ps: &mut [Product],
) -> Result<()> {
    let Some(context) = &c.data.b2b else {
        return Ok(());
    };
    let Some(id) = &context.quote_id else {
        return Ok(());
    };
    let r=sqlx::query("SELECT buyer_id,unit_id,cart_id,state,data,(data->>'validUntil')::timestamptz>now() AS valid FROM b2b_quotes WHERE tenant=$1 AND id=$2 FOR SHARE").bind(&c.tenant).bind(id).fetch_optional(conn).await?.ok_or(conflict("Accepted quote is missing"))?;
    let data: Value = r.get("data");
    if r.get::<String, _>("state") != "accepted"
        || r.get::<String, _>("buyer_id") != context.customer_id
        || r.get::<String, _>("unit_id") != context.unit_id
        || r.get::<String, _>("cart_id") != c.id
        || !r.get::<Option<bool>, _>("valid").unwrap_or(false)
        || data["currency"] != c.data.currency
        || data["items"] != json!(c.data.items)
    {
        return Err(conflict(
            "Accepted offer expired or changed; release it before editing the cart",
        ));
    }
    let lines: Vec<quotes::OfferLine> =
        serde_json::from_value(data["lines"].clone()).map_err(|_| bad("Invalid accepted offer"))?;
    let scale = currencies::scale(&c.data.currency).ok_or(bad("Unknown offer currency"))?;
    for p in ps {
        if let Some(line) = lines.iter().find(|l| l.id == p.id) {
            let price = line.gross_minor as f64 / 10_f64.powi(scale as i32);
            p.price = price;
            p.advanced_prices.clear();
            p.extra["priceCurrency"] = json!(c.data.currency);
            // Both fixed-currency and automatic-FX strategies resolve through their existing owner.
            p.extra["currencyPrices"] = json!({&c.data.currency:{"price":format!("{price:.precision$}",precision=scale as usize)}});
        }
    }
    Ok(())
}
pub(crate) async fn consume(
    conn: &mut sqlx::PgConnection,
    c: &StoredCart,
    order: &str,
) -> Result<()> {
    if let Some(id) = c.data.b2b.as_ref().and_then(|b| b.quote_id.as_ref()) {
        let changed=sqlx::query("UPDATE b2b_quotes SET state='ordered',revision=revision+1,data=data||jsonb_build_object('orderId',$3::text) WHERE tenant=$1 AND id=$2 AND state='accepted'").bind(&c.tenant).bind(id).bind(order).execute(conn).await?;
        if changed.rows_affected() != 1 {
            return Err(conflict("Offer has already been purchased"));
        }
    }
    Ok(())
}
