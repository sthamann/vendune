//! Shared operational order writes: one replay ledger, immutable quote, audit, cart projection and outbox.
use super::*;
type Tx<'a> = sqlx::Transaction<'a, sqlx::Postgres>;

pub(crate) async fn replay(
    tx: &mut Tx<'_>,
    t: &str,
    key: &str,
    fingerprint: &str,
) -> Result<Option<Value>> {
    if !(8..=128).contains(&key.len()) {
        return Err(bad("Invalid order request key"));
    }
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,28))")
        .bind(format!("{t}:{key}"))
        .execute(&mut **tx)
        .await?;
    let r = sqlx::query("SELECT fingerprint,response FROM order_transition_requests WHERE tenant=$1 AND request_key=$2")
        .bind(t).bind(key).fetch_optional(&mut **tx).await?;
    if let Some(r) = r {
        if r.get::<String, _>("fingerprint") != fingerprint {
            return Err(conflict("Order request key reused with different input"));
        }
        return Ok(Some(r.get("response")));
    }
    Ok(None)
}

pub(crate) struct Audit<'a> {
    pub kind: &'a str,
    pub data: Value,
    pub event_kind: &'a str,
    pub event: Value,
}

pub(crate) async fn persist(
    tx: &mut Tx<'_>,
    t: &str,
    h: &RequestContext,
    o: &mut Value,
    audit: Audit<'_>,
) -> Result<()> {
    order_fields(o);
    let id = o["id"].as_str().ok_or(bad("Order identity unavailable"))?;
    sqlx::query(
        "INSERT INTO order_activity(tenant,order_id,actor,kind,data) VALUES($1,$2,$3,$4,$5)",
    )
    .bind(t)
    .bind(id)
    .bind(h.principal.user.as_deref().unwrap_or("unknown"))
    .bind(audit.kind)
    .bind(&audit.data)
    .execute(&mut **tx)
    .await?;
    sqlx::query("UPDATE orders SET data=$1 WHERE tenant=$2 AND id=$3")
        .bind(&*o)
        .bind(t)
        .bind(id)
        .execute(&mut **tx)
        .await?;
    sqlx::query("UPDATE carts SET data=jsonb_set(carts.data,'{order}',$1) FROM orders o WHERE carts.tenant=$2 AND carts.id=o.cart_id AND o.tenant=$2 AND o.id=$3")
        .bind(&*o).bind(t).bind(id).execute(&mut **tx).await?;
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,'order.updated',$2)")
        .bind(t).bind(json!({"orderId":id,"kind":audit.data["kind"],"state":audit.data["state"],"revision":o["revision"]}))
        .execute(&mut **tx).await?;
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,$2,$3)")
        .bind(t)
        .bind(audit.event_kind)
        .bind(audit.event)
        .execute(&mut **tx)
        .await?;
    Ok(())
}

pub(crate) async fn remember(
    tx: &mut Tx<'_>,
    t: &str,
    id: &str,
    key: &str,
    fingerprint: &str,
    response: &Value,
) -> Result<()> {
    sqlx::query("INSERT INTO order_transition_requests(tenant,request_key,order_id,fingerprint,response) VALUES($1,$2,$3,$4,$5)")
        .bind(t).bind(key).bind(id).bind(fingerprint).bind(response).execute(&mut **tx).await?;
    Ok(())
}
