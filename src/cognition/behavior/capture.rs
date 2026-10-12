//! Cart-locked writes serialize with withdrawal; customer association is derived from authenticated native identity.
use super::{input::Event, *};
pub(super) async fn capture(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Event>,
) -> Result<Json<Value>> {
    v.validate()?;
    let c = load_cart(&a, &h).await?;
    if header(&h, "x-rac-channel-preview").is_some()
        || staging::parent(&a, &c.tenant).await?.is_some()
    {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Sandbox and preview contexts do not record behavioral analytics".into(),
        ));
    }
    let customer = if header(&h, "x-customer-token").is_some() {
        let (_, email) = accounts::identity(&a, &h).await?;
        sqlx::query_scalar::<_, String>("SELECT id FROM customers WHERE tenant=$1 AND email=$2")
            .bind(&c.tenant)
            .bind(email)
            .fetch_optional(&a.db)
            .await?
    } else {
        None
    };
    let locale = language_context(&a, &h).await?.0;
    if let Some(product) = &v.product_id {
        marketing::admit_product(&a, &h, product).await?;
    }
    let mut tx = a.db.begin().await?;
    // Same lock order as consent withdrawal: cart -> settings -> receipt.
    let row = sqlx::query("SELECT data,status FROM carts WHERE tenant=$1 AND id=$2 FOR UPDATE")
        .bind(&c.tenant)
        .bind(&c.id)
        .fetch_one(&mut *tx)
        .await?;
    if row.get::<String, _>("status") != "open" {
        return Err(conflict("Behavioral events require an open cart context"));
    }
    let current: cart_model::Cart =
        serde_json::from_value(row.get("data")).map_err(|e| bad(e.to_string()))?;
    legal::require_locked(&mut tx, &c, "analytics").await?;
    let (settings, _) = commerce::scoped_locked(&mut tx, &c.tenant, &c.data.sales_channel).await?;
    let policy = &settings.legal.behavior_analytics;
    if !policy.enabled {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Native behavioral analytics is disabled for this sales channel".into(),
        ));
    }
    if let Some(product) = &v.product_id
        && v.kind == "cart_add"
        && !current.items.iter().any(|i| i.id == *product)
    {
        return Err(bad("Cart-add observation requires an actual cart item"));
    }
    let dimensions = json!({"browser":input::browser(header(&h,"user-agent").unwrap_or("")),"viewport":v.viewport,"surface":v.surface,"referrerHost":v.referrer_host,"locale":locale,"country":current.checkout.as_ref().map(|s|s.country.clone()).unwrap_or("unknown".into()),"geoCountry":geography::country(&h),"countrySource":"cart-destination"});
    let session = hash(&c.id);
    if let Some(old)=sqlx::query("SELECT session,purpose,kind,product_id,dimensions FROM session_signal_events WHERE tenant=$1 AND id=$2").bind(&c.tenant).bind(&v.event_id).fetch_optional(&mut *tx).await? {
  if old.get::<String,_>("session")!=session || old.get::<String,_>("purpose")!="analytics" || old.get::<String,_>("kind")!=v.kind || old.get::<Option<String>,_>("product_id")!=v.product_id || old.get::<Value,_>("dimensions")!=dimensions {return Err(conflict("Behavioral event ID already belongs to a different observation"));}
  return Ok(Json(json!({"stored":false,"duplicate":true})));
 }
    let count:i64=sqlx::query_scalar("SELECT count(*) FROM session_signal_events WHERE tenant=$1 AND session=$2 AND purpose='analytics' AND created_at>now()-interval '1 hour'").bind(&c.tenant).bind(&session).fetch_one(&mut *tx).await?;
    if count >= i64::from(policy.events_per_hour) {
        return Err(Error(
            StatusCode::TOO_MANY_REQUESTS,
            "Behavioral limit reached; retry after the hourly window".into(),
        ));
    }
    sqlx::query("INSERT INTO session_signal_events(tenant,id,session,purpose,kind,cart_id,channel_id,product_id,customer_id,dimensions,expires_at) VALUES($1,$2,$3,'analytics',$4,$5,$6,$7,$8,$9,now()+make_interval(days=>$10))")
 .bind(&c.tenant).bind(v.event_id).bind(session).bind(v.kind).bind(&c.id).bind(&c.data.sales_channel).bind(v.product_id).bind(customer).bind(dimensions).bind(policy.retention_days as i32).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(
        json!({"stored":true,"retentionDays":policy.retention_days,"purpose":"analytics"}),
    ))
}
pub(super) async fn forget(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    let c = load_cart(&a, &h).await?;
    let mut tx = a.db.begin().await?;
    sqlx::query("SELECT id FROM carts WHERE tenant=$1 AND id=$2 FOR UPDATE")
        .bind(&c.tenant)
        .bind(&c.id)
        .fetch_one(&mut *tx)
        .await?;
    let n = sqlx::query(
        "DELETE FROM session_signal_events WHERE tenant=$1 AND session=$2 AND purpose='analytics'",
    )
    .bind(&c.tenant)
    .bind(hash(&c.id))
    .execute(&mut *tx)
    .await?
    .rows_affected();
    tx.commit().await?;
    Ok(Json(json!({"deleted":n})))
}
pub(super) async fn export(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    let c = load_cart(&a, &h).await?;
    let rows=sqlx::query("SELECT id,kind,product_id,dimensions,created_at::text AS time FROM session_signal_events WHERE tenant=$1 AND session=$2 AND purpose='analytics' AND expires_at>now() ORDER BY created_at DESC,id LIMIT 101").bind(&c.tenant).bind(hash(&c.id)).fetch_all(&a.db).await?;
    Ok(Json(
        json!({"events":rows.iter().take(100).map(|r|json!({"id":r.get::<String,_>("id"),"kind":r.get::<String,_>("kind"),"productId":r.get::<Option<String>,_>("product_id"),"dimensions":r.get::<Value,_>("dimensions"),"time":r.get::<String,_>("time")})).collect::<Vec<_>>(),"truncated":rows.len()>100}),
    ))
}
