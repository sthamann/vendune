//! UCP transport adapters reuse native cart, B2B, pricing, approval and checkout owners.
use crate::*;
mod document;
mod messages;
mod negotiation;
mod profile;
use document::ucp_document;
pub(crate) use negotiation::command as ucp_b2b;
pub(crate) use profile::{schema as ucp_b2b_schema, ucp_meta, ucp_profile};
pub(crate) const UCP_VERSION: &str = "2026-08-25";
pub(crate) fn ucp_items(v: &Value) -> Result<Vec<Item>> {
    let rows = v["line_items"]
        .as_array()
        .ok_or(bad("line_items required"))?;
    let mut items = vec![];
    for i in rows {
        let q = i["quantity"]
            .as_u64()
            .filter(|q| *q <= 10000)
            .ok_or(bad("quantity required"))?;
        items.push(Item {
            id: i["item"]["id"]
                .as_str()
                .ok_or(bad("item.id required"))?
                .into(),
            quantity: q as u32,
        });
    }
    validate_items(&items)?;
    Ok(items)
}
pub(crate) async fn ucp_create(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let selected = profile::selected(&h).await?;
    let items = ucp_items(&v)?;
    let mut h = h;
    if let Some(code) = v["currency"].as_str() {
        h.insert(
            "x-commerce-currency",
            code.parse().map_err(|_| bad("Invalid currency"))?,
        );
    }
    let c = new_cart_context(&a, &h, v["session"].as_str().unwrap_or(""), "ucp").await?;
    let mut ch = h.clone();
    ch.insert("sw-context-token", c.token.parse().unwrap());
    let c = set_cart(&a, &ch, items, Some(1), Some(v.get("buyer").cloned())).await?;
    let mut doc = negotiation::response(&a, &ch, &c, selected).await?;
    doc["context_token"] = json!(c.token);
    Ok(Json(doc))
}
pub(crate) async fn ucp_load(a: &App, h: &RequestContext, id: &str) -> Result<StoredCart> {
    let c = load_cart(a, h).await?;
    if c.id != id {
        return Err(Error(StatusCode::NOT_FOUND, "Checkout not found".into()));
    }
    Ok(c)
}
pub(crate) async fn ucp_get(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    let selected = profile::selected(&h).await?;
    let c = ucp_load(&a, &h, &id).await?;
    Ok(Json(negotiation::response(&a, &h, &c, selected).await?))
}
pub(crate) async fn ucp_update(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let selected = profile::selected(&h).await?;
    let mut c = ucp_load(&a, &h, &id).await?;
    if let Some(code) = v["currency"].as_str()
        && code != c.data.currency
    {
        currencies::invoke(
            &a,
            &h,
            "currency.select",
            &json!({"currency":code,"revision":c.revision}),
        )
        .await?;
        c = ucp_load(&a, &h, &id).await?;
    }
    let c = set_cart(
        &a,
        &h,
        ucp_items(&v)?,
        Some(c.revision),
        Some(v.get("buyer").cloned()),
    )
    .await?;
    Ok(Json(negotiation::response(&a, &h, &c, selected).await?))
}
pub(crate) async fn ucp_complete(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    let selected = profile::selected(&h).await?;
    let current = ucp_load(&a, &h, &id).await?;
    if current.status == "open"
        && current
            .data
            .buyer
            .as_ref()
            .and_then(|b| b["email"].as_str())
            .is_none_or(|s| !s.contains('@'))
    {
        return Err(conflict("Buyer email is required before demo completion"));
    }
    checkout(
        &a,
        &h,
        header(&h, "idempotency-key").ok_or(bad("Idempotency-Key required"))?,
    )
    .await?;
    let c = load_cart(&a, &h).await?;
    Ok(Json(negotiation::response(&a, &h, &c, selected).await?))
}
pub(crate) async fn ucp_cancel(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    let selected = profile::selected(&h).await?;
    let c = ucp_load(&a, &h, &id).await?;
    let n = sqlx::query(
        "UPDATE carts SET status='cancelled',revision=revision+1 WHERE id=$1 AND status='open'",
    )
    .bind(&c.id)
    .execute(&a.db)
    .await?
    .rows_affected();
    if n != 1 && c.status != "cancelled" {
        return Err(conflict("Completed checkout cannot be cancelled"));
    }
    let c = load_cart(&a, &h).await?;
    Ok(Json(negotiation::response(&a, &h, &c, selected).await?))
}

/// Routes remain under the shared tenant, channel, admission and authentication middleware.
pub(crate) fn ucp_router() -> Router<App> {
    Router::new()
        .route("/.well-known/ucp", get(ucp_profile))
        .route("/ucp/2026-10-13/b2b-negotiation.json", get(ucp_b2b_schema))
        .route(
            "/ucp/v1/checkout-sessions/{id}/b2b/{operation}",
            post(ucp_b2b),
        )
        .route("/ucp/v1/checkout-sessions", post(ucp_create))
        .route(
            "/ucp/v1/checkout-sessions/{id}",
            get(ucp_get).put(ucp_update),
        )
        .route(
            "/ucp/v1/checkout-sessions/{id}/complete",
            post(ucp_complete),
        )
        .route("/ucp/v1/checkout-sessions/{id}/cancel", post(ucp_cancel))
}
