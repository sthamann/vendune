//! Private admin-cart admission and locked final checkout guards; shared pricing and order effects stay native.
use super::*;
pub(crate) fn guard_admin_cart(h: &RequestContext, c: &StoredCart) -> Result<()> {
    if let Some(actor) = &c.data.admin_actor {
        if h.admin_order.as_ref() != Some(actor) || header(h, "x-rac-user") != Some(actor.as_str())
        {
            return Err(Error(
                StatusCode::FORBIDDEN,
                "Manual order requires its creating merchant".into(),
            ));
        }
        for right in [
            "orders.write",
            "customers.read",
            "customers.pii",
            "catalog.read",
        ] {
            auth::permit(h, right)?;
        }
    }
    Ok(())
}
pub(crate) async fn check_admin_customer(
    conn: &mut sqlx::PgConnection,
    c: &StoredCart,
) -> Result<()> {
    pos::check_customer(conn, c).await
}
/// The final locked checkout quote must never enter an external provider for admin orders.
pub(crate) fn admit_admin_payment(c: &StoredCart, quote: &Value) -> Result<()> {
    if !verified_kernel::admin_payment_admissible(
        c.data.admin_actor.is_some(),
        quote["paymentMethod"]["mode"] == "manual",
        quote["paymentMethod"]["mode"] == "simulated",
    ) {
        return Err(bad(
            "Buyer payment required for this provider; review the configured manual payment again",
        ));
    }
    Ok(())
}
pub(crate) fn admin_purchase(c: &StoredCart, purchase: &mut Value) {
    if let Some(actor) = &c.data.admin_actor {
        purchase["adminActor"] = json!(actor);
        purchase["adminCustomer"] = json!(c.data.customer_id);
    }
}
pub(crate) fn admin_order(c: &StoredCart, order: &mut Value) {
    if let Some(actor) = &c.data.admin_actor {
        order["createdBy"] = json!({"source":"merchant","actor":actor});
    }
}

/// Freeze channel policy in the existing checkout transaction before acquiring customer/cart locks.
pub(crate) async fn lock_admin_checkout(
    conn: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    c: &StoredCart,
) -> Result<()> {
    if c.data.admin_actor.is_none() || c.status != "open" {
        return Ok(());
    }
    commerce::scoped_locked(conn, &c.tenant, &c.data.sales_channel).await?;
    let data: Value =
        sqlx::query_scalar("SELECT data FROM sales_channels WHERE tenant=$1 AND id=$2 FOR SHARE")
            .bind(&c.tenant)
            .bind(&c.data.sales_channel)
            .fetch_optional(&mut **conn)
            .await?
            .ok_or(bad("Sales channel unavailable"))?;
    if data["active"] != true
        || data["visibility"] == "private"
        || !matches!(data["kind"].as_str(), Some("storefront" | "headless"))
    {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Sales channel is paused or private; open an authorized merchant preview".into(),
        ));
    }
    let customer = c
        .data
        .customer_id
        .as_deref()
        .ok_or(bad("Manual order customer required"))?;
    sqlx::query("SELECT id FROM customers WHERE tenant=$1 AND id=$2 FOR UPDATE")
        .bind(&c.tenant)
        .bind(customer)
        .fetch_optional(&mut **conn)
        .await?
        .ok_or(bad("Customer unavailable"))?;
    check_admin_customer(conn, c).await?;
    Ok(())
}

/// Recheck the frozen channel product selection against the locked native product snapshot.
pub(crate) async fn admit_admin_products(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    c: &StoredCart,
) -> Result<()> {
    if c.data.admin_actor.is_none() {
        return Ok(());
    }
    let selected: Value = sqlx::query_scalar(
        "SELECT data->'productIds' FROM sales_channels WHERE tenant=$1 AND id=$2",
    )
    .bind(&c.tenant)
    .bind(&c.data.sales_channel)
    .fetch_one(&mut **tx)
    .await?;
    let selected: Vec<String> =
        serde_json::from_value(selected).map_err(|_| bad("Invalid channel catalog selection"))?;
    if selected.is_empty() {
        return Ok(());
    }
    let ids = c
        .data
        .items
        .iter()
        .map(|i| i.id.clone())
        .collect::<Vec<_>>();
    let denied: bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM products WHERE tenant=$1 AND id=ANY($2) AND NOT (id=ANY($3) OR coalesce(parent_id=ANY($3),false)))").bind(&c.tenant).bind(ids).bind(selected).fetch_one(&mut **tx).await?;
    if denied {
        return Err(bad(
            "Product unavailable in sales channel; review the order again",
        ));
    }
    Ok(())
}
