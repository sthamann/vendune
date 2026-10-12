//! Cashier-only customer lookup/card resolution and revision-checked account attachment; never issues customer credentials.
use super::*;
pub(super) async fn find(
    a: &App,
    h: &RequestContext,
    query: &str,
    card: Option<&str>,
) -> Result<Value> {
    auth::permit(h, "customers.read")?;
    auth::permit(h, "customers.pii")?;
    if query.len() > 200 || card.is_some_and(|s| s.is_empty() || s.len() > 100) {
        return Err(bad("Invalid customer search or card"));
    }
    let t = tenant(h)?;
    let rows=sqlx::query("SELECT id,customer_number,email,profile->>'name' AS name,group_name FROM customers WHERE tenant=$1 AND active AND (($3::text IS NOT NULL AND customer_number=$3) OR ($3 IS NULL AND ($2='' OR strpos(lower(email||' '||customer_number||' '||coalesce(profile->>'name','')),lower($2))>0))) ORDER BY email LIMIT 20")
        .bind(t).bind(query).bind(card).fetch_all(&a.db).await?;
    Ok(
        json!({"elements":rows.iter().map(|r|json!({"id":r.get::<String,_>("id"),"customerNumber":r.get::<String,_>("customer_number"),"email":r.get::<String,_>("email"),"name":r.get::<Option<String>,_>("name"),"customerGroup":r.get::<String,_>("group_name")})).collect::<Vec<_>>() }),
    )
}
pub(super) async fn select(
    a: &App,
    h: &RequestContext,
    id: Option<&str>,
    revision: i64,
) -> Result<Value> {
    auth::permit(h, "customers.read")?;
    auth::permit(h, "customers.pii")?;
    auth::permit(h, "orders.write")?;
    let mut tx = a.db.begin().await?;
    let row = sqlx::query("SELECT * FROM carts WHERE tenant=$1 AND token=$2 FOR UPDATE")
        .bind(tenant(h)?)
        .bind(token(h)?)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(bad("Cart unavailable"))?;
    let mut c = stored(&row)?;
    pos::guard_cart(h, &c)?;
    if c.data.pos_actor.is_none() || c.status != "open" || c.revision != revision {
        return Err(conflict(
            "POS sale changed; reload before selecting customer",
        ));
    }
    let mut selection = commerce::selection(&c.data);
    selection.billing_address_id = None;
    selection.shipping_address_id = None;
    selection.billing_address = None;
    selection.address = None;
    c.data.customer_id = None;
    c.data.email = None;
    c.data.company = None;
    c.data.group = "consumer".into();
    selection.customer_email = None;
    if let Some(id) = id {
        let row=sqlx::query("SELECT id,email,group_name,company,default_billing_address_id FROM customers WHERE tenant=$1 AND id=$2 AND active FOR SHARE").bind(&c.tenant).bind(id).fetch_optional(&mut *tx).await?.ok_or(Error(StatusCode::NOT_FOUND,"Customer unavailable".into()))?;
        let email: String = row.get("email");
        if let Some(address) = row.get::<Option<String>, _>("default_billing_address_id") {
            selection.billing_address =
                Some(accounts::address_get(&mut tx, &c.tenant, &email, &address).await?);
        }
        c.data.customer_id = Some(id.into());
        c.data.email = Some(email.clone());
        c.data.company = row.get("company");
        c.data.group = row.get("group_name");
        selection.customer_email = Some(email);
    }
    c.data.checkout = Some(selection);
    c.revision += 1;
    let quote = cart_json(a, &c).await?;
    if quote["selectionNeedsConfirmation"] == true {
        return Err(bad(
            "Customer pricing requires a different available payment; change payment first",
        ));
    }
    sqlx::query("UPDATE carts SET data=$1,revision=$2 WHERE tenant=$3 AND id=$4")
        .bind(json!(c.data))
        .bind(c.revision)
        .bind(&c.tenant)
        .bind(&c.id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,'pos.customer_selected',$2)").bind(&c.tenant).bind(json!({"cartId":c.id,"customerId":id,"cashierId":h.pos.as_ref().map(|p|&p.actor),"salesChannelId":c.data.sales_channel})).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(quote)
}
/// Revalidate the selected account under a shared lock inside checkout; profile edits cannot race settlement.
pub(crate) async fn check(conn: &mut sqlx::PgConnection, c: &StoredCart) -> Result<()> {
    if let Some(id) = &c.data.customer_id {
        let row=sqlx::query("SELECT email,group_name,company FROM customers WHERE tenant=$1 AND id=$2 AND active FOR SHARE").bind(&c.tenant).bind(id).fetch_optional(conn).await?.ok_or(conflict("Selected customer is no longer active; select again"))?;
        if Some(row.get::<String, _>("email")) != c.data.email
            || row.get::<String, _>("group_name") != c.data.group
            || row.get::<Option<String>, _>("company") != c.data.company
        {
            return Err(conflict(
                "Customer changed; select again before completing sale",
            ));
        }
    }
    Ok(())
}
