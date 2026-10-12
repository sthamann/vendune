//! Exact cash admission and order annotation execute in the existing checkout transaction.
use crate::*;
pub(crate) fn validate_settlement(
    h: &RequestContext,
    c: &StoredCart,
    q: &Value,
    cfg: &commerce::Settings,
    minor: i64,
) -> Result<()> {
    pos::guard_cart(h, c)?;
    let cash = q["paymentMethod"]["mode"] == "cash";
    if cash && h.pos.is_none() {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Cash requires authenticated POS checkout".into(),
        ));
    }
    if let Some(p) = &h.pos {
        auth::permit(h, "pos.use")?;
        auth::permit(h, "orders.write")?;
        if cash {
            auth::permit(h, "payments.manage")?;
            let total = u64::try_from(minor).map_err(|_| bad("Invalid POS total"))?;
            if !verified_kernel::pos_cash_admissible(
                true,
                p.tender_minor.unwrap_or(0),
                total,
                q["selectionNeedsConfirmation"] != true,
            ) {
                return Err(bad(
                    "Cash tender is below the reviewed total or outside the supported range",
                ));
            }
        } else if p.tender_minor.is_some() {
            return Err(bad("Cash tender supplied for a non-cash payment"));
        }
        if commerce::selection(&c.data).shipping_method_id != "pickup"
            || !cfg
                .shipping
                .iter()
                .any(|s| s.id == "pickup" && s.active && s.price == 0.)
        {
            return Err(bad("POS checkout requires free collection"));
        }
    }
    Ok(())
}
pub(crate) async fn settle(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    h: &RequestContext,
    c: &StoredCart,
    order: &mut Value,
) -> Result<()> {
    let Some(p) = &h.pos else {
        return Ok(());
    };
    order["pos"] = json!({"cashierId":p.actor,"salesChannelId":c.data.sales_channel});
    order["pos"]["mainLocale"] = sqlx::query_scalar::<_, Value>(
        "SELECT data->'mainLocale' FROM commerce_settings WHERE tenant=$1",
    )
    .bind(&c.tenant)
    .fetch_one(&mut **tx)
    .await?;
    order["pos"]["receiptMessage"] = sqlx::query_scalar::<_, Value>("SELECT coalesce(data->'pos'->'receiptMessage','{}'::jsonb) FROM sales_channels WHERE tenant=$1 AND id=$2").bind(&c.tenant).bind(&c.data.sales_channel).fetch_one(&mut **tx).await?;
    if order["payment"]["method"]["mode"] == "cash" {
        let total = order["money"]["minor"]
            .as_i64()
            .and_then(|v| u64::try_from(v).ok())
            .ok_or(bad("Invalid POS total"))?;
        let tender = p.tender_minor.ok_or(bad("Cash tender required"))?;
        order["payment"]["provider"] = json!("cash");
        order["payment"]["state"] = json!("paid");
        order["payment"]["cashReceived"] = json!(true);
        order["pos"]["completionEvent"] = json!(true);
        // No electronic provider charge was performed. Cash is explicit and audited separately.
        order["pos"]["cash"] = json!({"tenderMinor":tender.to_string(),"changeMinor":(tender-total).to_string(),"receivedMinor":total.to_string(),"currency":c.data.currency});
        sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,'payment.state_changed',$2)")
            .bind(&c.tenant).bind(json!({"orderId":order["id"],"state":"paid","kind":"payment","cashierId":p.actor,"salesChannelId":c.data.sales_channel})).execute(&mut **tx).await?;
    }
    let event = if order["payment"]["state"] == "paid" {
        "pos.sale_completed"
    } else {
        "pos.sale_created"
    };
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,$2,$3)").bind(&c.tenant).bind(event)
        .bind(json!({"orderId":order["id"],"salesChannelId":c.data.sales_channel,"cashierId":p.actor,"paymentState":order["payment"]["state"],"totalMinor":order["money"]["minor"],"currency":c.data.currency})).execute(&mut **tx).await?;
    Ok(())
}
/// The shared configuration lock precedes this channel lock in both saves and checkout.
pub(crate) async fn check_locked(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    h: &RequestContext,
    c: &StoredCart,
) -> Result<()> {
    if staging::parent_conn(tx, &c.tenant).await?.is_some() {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "POS settlement is unavailable in staging".into(),
        ));
    }
    let data: Value =
        sqlx::query_scalar("SELECT data FROM sales_channels WHERE tenant=$1 AND id=$2 FOR SHARE")
            .bind(&c.tenant)
            .bind(&c.data.sales_channel)
            .fetch_one(&mut **tx)
            .await?;
    if data["kind"] != "pos"
        || data["active"] != true
        || data["pos"]["country"] != commerce::selection(&c.data).country
        || h.pos.is_none()
    {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "POS channel is paused or its location changed".into(),
        ));
    }
    Ok(())
}

/// Provider confirmation rejoins the same POS lifecycle, once, inside its receipt transaction.
pub(crate) async fn payment_captured(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tenant: &str,
    order: &mut Value,
    state: &str,
) -> Result<()> {
    if state != "captured" || !order["pos"].is_object() || order["pos"]["completionEvent"] == true {
        return Ok(());
    }
    order["pos"]["completionEvent"] = json!(true);
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,'pos.sale_completed',$2)")
        .bind(tenant).bind(json!({"orderId":order["id"],"salesChannelId":order["salesChannelId"],"paymentState":state,"totalMinor":order["money"]["minor"],"currency":order["cart"]["price"]["currency"]})).execute(&mut **tx).await?;
    Ok(())
}
