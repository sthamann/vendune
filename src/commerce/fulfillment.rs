//! Revision-checked payment and delivery state transitions.
use super::*;

pub(crate) async fn transition_order(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    auth::permit(&h, "orders.write")?;
    let (machine, machine_revision) = machine(&a.db, &t).await?;
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, &h, "merchant").await?;
    let request_key = header(&h, "idempotency-key").or_else(|| v["requestKey"].as_str());
    let fingerprint = hash(&json!({"orderId":id,"body":v}).to_string());
    if let Some(key) = request_key
        && let Some(response) = order_mutation::replay(&mut tx, &t, key, &fingerprint).await?
    {
        return Ok(Json(response));
    }
    let r = sqlx::query("SELECT data FROM orders WHERE tenant=$1 AND id=$2 FOR UPDATE")
        .bind(&t)
        .bind(&id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or(Error(StatusCode::NOT_FOUND, "Order not found".into()))?;
    let mut o: Value = r.get("data");
    let revision = o["revision"].as_i64().unwrap_or(1);
    if !verified_kernel::revision_admissible(
        u64::try_from(revision).unwrap_or(0),
        v["revision"].as_u64().unwrap_or(0),
    ) {
        return Err(conflict("Order revision changed"));
    }
    let target = v["state"].as_str().ok_or(bad("State required"))?;
    let kind = v["kind"].as_str().ok_or(bad("Kind required"))?;
    match kind {
        "order" => {
            let current = o["state"].as_str().unwrap_or("placed");
            if !machine.transitions.iter().any(|e| {
                e.from == current
                    && e.to == target
                    && v["action"].as_str().is_none_or(|id| id == e.id)
            }) {
                return Err(conflict("Invalid order transition"));
            }
            if let Some(reason) = guard(&o, &machine, kind, target) {
                return Err(conflict(reason));
            }
            if target == "cancelled" {
                if crate::payments::external(&o)
                    || ["paid", "captured", "partially_refunded"]
                        .contains(&o["payment"]["state"].as_str().unwrap_or(""))
                {
                    return Err(conflict("Reconcile or refund payment before cancellation"));
                }
                if o["deliveries"]
                    .as_array()
                    .is_some_and(|ds| ds.iter().any(|d| d["state"] != "open"))
                {
                    return Err(conflict("Shipped orders require a return workflow"));
                }
                crate::b2b::release_budget(&mut tx, &t, &id).await?;
                inventory::release(&mut tx, &t, &id).await?;
                o["payment"]["state"] = json!("cancelled");
            }
            o["state"] = json!(target);
        }
        "payment" => {
            if let Some(reason) = guard(&o, &machine, kind, target) {
                return Err(conflict(reason));
            }
            if crate::payments::external(&o) {
                return Err(conflict(
                    "External payments require a confirmed provider receipt",
                ));
            }
            let current = o["payment"]["state"].as_str().unwrap_or("");
            if !verified_kernel::manual_payment_admissible(
                machine
                    .states
                    .iter()
                    .any(|s| s.id == o["state"].as_str().unwrap_or("") && s.terminal),
                crate::payments::external(&o),
                ["pending", "authorized"].contains(&current),
                target == "paid",
            ) {
                return Err(conflict("Invalid payment transition"));
            }
            o["payment"]["state"] = json!(target);
        }
        "delivery" => {
            if let Some(reason) = guard(&o, &machine, kind, target) {
                return Err(conflict(reason));
            }
            let index = v["deliveryIndex"].as_u64().unwrap_or(0) as usize;
            let d = o["deliveries"]
                .as_array_mut()
                .and_then(|v| v.get_mut(index))
                .ok_or(bad("Order has no delivery"))?;
            let current = d["state"].as_str().unwrap_or("open");
            if !d["booking"].is_null() {
                return Err(conflict("Reconcile the carrier booking before dispatch"));
            }
            if !matches!(
                (current, target),
                ("open", "shipped") | ("shipped", "delivered")
            ) {
                return Err(conflict("Invalid delivery transition"));
            }
            if target == "shipped"
                && let Some(track) = v["trackingCode"].as_str()
            {
                if track.len() > 100 {
                    return Err(bad("Tracking code too long"));
                }
                d["trackingCode"] = json!(track);
            }
            if let Some(url) = v["trackingUrl"].as_str() {
                if !url.is_empty()
                    && (!url.starts_with("https://") || !crate::assets::safe_url(url))
                {
                    return Err(bad("Tracking link must be a safe HTTPS URL"));
                }
                d["trackingUrl"] = if url.is_empty() {
                    Value::Null
                } else {
                    json!(url)
                };
            }
            d["state"] = json!(target);
        }
        _ => return Err(bad("Kind must be payment or delivery")),
    }
    o["revision"] = json!(revision + 1);
    order_fields(&mut o);
    let event_kind = match kind {
        "order" => "order.state_changed",
        "payment" => "payment.state_changed",
        _ => "delivery.state_changed",
    };
    let from = r.get::<Value, _>("data");
    let mut event_order = o.clone();
    if let Some(cart) = event_order["cart"].as_object_mut() {
        cart.remove("token");
    }
    order_mutation::persist(&mut tx, &t, &h, &mut o, order_mutation::Audit {
        kind:"transition",
        data:json!({"kind":kind,"state":target,"revision":revision+1,"trackingCode":v["trackingCode"],"trackingUrl":v["trackingUrl"],"deliveryIndex":v["deliveryIndex"],"requestKey":request_key}),
        event_kind,
        event:json!({"orderId":id,"kind":kind,"from":if kind=="order" {from["state"].clone()} else if kind=="payment" {from["payment"]["state"].clone()} else {from["deliveries"][v["deliveryIndex"].as_u64().unwrap_or(0) as usize]["state"].clone()},"state":target,"revision":revision+1,"requestKey":request_key,"order":event_order}),
    }).await?;
    let mut response = o.clone();
    if let Some(cart) = response["cart"].as_object_mut() {
        cart.remove("token");
    }
    response["workflow"] = workflow(&response, &machine, machine_revision);
    if let Some(key) = request_key {
        order_mutation::remember(&mut tx, &t, &id, key, &fingerprint, &response).await?;
    }
    tx.commit().await?;
    if let Some(cart) = o["cart"].as_object_mut() {
        cart.remove("token");
    }
    Ok(Json(response))
}
