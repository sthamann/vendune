//! Provider-neutral partial-package allocation; quantities and fiscal order snapshots remain conserved.
use super::*;

pub(crate) async fn split_delivery(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    auth::permit(&h, "orders.write")?;
    auth::permit(&h, "customers.pii")?;
    if staging::parent(&a, &t).await?.is_some() {
        return Err(bad("Operational shipments cannot be staged"));
    }
    let key = header(&h, "idempotency-key")
        .or_else(|| v["requestKey"].as_str())
        .ok_or(bad("Shipment request key required"))?;
    let fingerprint =
        hash(&json!({"operation":"delivery.split","orderId":id,"body":v}).to_string());
    let (m, mr) = machine(&a.db, &t).await?;
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, &h, "merchant").await?;
    if let Some(response) = order_mutation::replay(&mut tx, &t, key, &fingerprint).await? {
        return Ok(Json(response));
    }
    let mut o: Value =
        sqlx::query_scalar("SELECT data FROM orders WHERE tenant=$1 AND id=$2 FOR UPDATE")
            .bind(&t)
            .bind(&id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or(Error(StatusCode::NOT_FOUND, "Order not found".into()))?;
    let revision = o["revision"].as_u64().unwrap_or(1);
    if !verified_kernel::revision_admissible(revision, v["revision"].as_u64().unwrap_or(0)) {
        return Err(conflict("Order revision changed"));
    }
    let terminal = guard(&o, &m, "delivery", "shipped").is_some();
    let index = v["deliveryIndex"]
        .as_u64()
        .and_then(|n| usize::try_from(n).ok())
        .ok_or(bad("Shipment index required"))?;
    let split_id = uid();
    let (original, parcel) = allocate(
        &o["deliveries"][index],
        &v["positions"],
        terminal,
        &split_id,
    )?;
    let ds = o["deliveries"]
        .as_array_mut()
        .ok_or(bad("Order has no shipments"))?;
    if ds.len() >= 30 {
        return Err(bad("Order shipment limit reached"));
    }
    ds[index] = original;
    ds.push(parcel);
    o["revision"] = json!(revision + 1);
    order_fields(&mut o);
    let mut event_order = o.clone();
    if let Some(cart) = event_order["cart"].as_object_mut() {
        cart.remove("token");
    }
    let activity = json!({"kind":"delivery","state":"split","sourceIndex":index,"deliveryId":split_id,"positions":v["positions"],"requestKey":key,"revision":revision+1});
    let event = json!({"orderId":id,"deliveryId":split_id,"sourceIndex":index,"positions":v["positions"],"kind":"delivery","state":"split","revision":revision+1,"requestKey":key,"order":event_order});
    order_mutation::persist(
        &mut tx,
        &t,
        &h,
        &mut o,
        order_mutation::Audit {
            kind: "delivery.split",
            data: activity,
            event_kind: "delivery.split",
            event,
        },
    )
    .await?;
    let mut response = o;
    if let Some(c) = response["cart"].as_object_mut() {
        c.remove("token");
    }
    response["workflow"] = workflow(&response, &m, mr);
    order_mutation::remember(&mut tx, &t, &id, key, &fingerprint, &response).await?;
    tx.commit().await?;
    Ok(Json(response))
}

fn allocate(source: &Value, requested: &Value, terminal: bool, id: &str) -> Result<(Value, Value)> {
    let positions = source["positions"]
        .as_array()
        .ok_or(bad("Shipment has no positions"))?;
    let requested = requested
        .as_array()
        .filter(|v| !v.is_empty() && v.len() <= 100)
        .ok_or(bad("Select shipment positions and quantities"))?;
    let mut amounts = std::collections::BTreeMap::new();
    let mut total = 0_u64;
    for p in positions {
        let sku = p["id"].as_str().ok_or(bad("Invalid shipment position"))?;
        let q = p["quantity"]
            .as_u64()
            .filter(|q| *q > 0 && *q <= u32::MAX as u64)
            .ok_or(bad("Invalid shipment quantity"))?;
        if amounts.insert(sku, q).is_some() {
            return Err(bad("Duplicate shipment position"));
        }
        total = total
            .checked_add(q)
            .ok_or(bad("Shipment quantity overflow"))?;
    }
    let mut moved = 0_u64;
    let mut chosen = std::collections::BTreeMap::new();
    for p in requested {
        let sku = p["id"].as_str().ok_or(bad("Product identity required"))?;
        let q = p["quantity"]
            .as_u64()
            .filter(|q| *q > 0)
            .ok_or(bad("Shipment quantities must be positive integers"))?;
        if !amounts.get(sku).is_some_and(|available| q <= *available)
            || chosen.insert(sku, q).is_some()
        {
            return Err(bad(
                "Shipment quantities exceed an available position or repeat it",
            ));
        }
        moved = moved
            .checked_add(q)
            .ok_or(bad("Shipment quantity overflow"))?;
    }
    if !verified_kernel::delivery_split_admissible(
        source["state"] == "open",
        terminal,
        total,
        moved,
    ) {
        return Err(conflict(
            "Only open shipments can be split; keep at least one item in the original package",
        ));
    }
    if !source["label"].is_null() || !source["booking"].is_null() {
        return Err(conflict(
            "Reconcile the existing carrier label or booking before changing its package",
        ));
    }
    let mut original = source.clone();
    let mut parcel = source.clone();
    original["positions"] = json!(
        positions
            .iter()
            .filter_map(|p| {
                let left = p["quantity"].as_u64().unwrap()
                    - chosen.get(p["id"].as_str().unwrap()).copied().unwrap_or(0);
                (left > 0).then(|| {
                    let mut p = p.clone();
                    p["quantity"] = json!(left);
                    p
                })
            })
            .collect::<Vec<_>>()
    );
    parcel["id"] = json!(id);
    parcel["positions"] = json!(
        positions
            .iter()
            .filter_map(|p| chosen.get(p["id"].as_str().unwrap()).map(|q| {
                let mut p = p.clone();
                p["quantity"] = json!(q);
                p
            }))
            .collect::<Vec<_>>()
    );
    // Splitting fulfillment does not duplicate the original shipping charge or recalculate the tax snapshot.
    parcel["shippingCosts"] =
        json!({"unitPrice":0,"totalPrice":0,"netPrice":0,"tax":0,"calculatedTaxes":[]});
    for field in ["trackingCode", "trackingUrl", "label"] {
        parcel.as_object_mut().unwrap().remove(field);
    }
    Ok((original, parcel))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn conservation_and_label_fence() {
        let source = json!({"state":"open","positions":[{"id":"a","quantity":3},{"id":"b","quantity":2}],"shippingCosts":{"totalPrice":4.9}});
        let (left, next) = allocate(
            &source,
            &json!([{"id":"a","quantity":2}]),
            false,
            "package-2",
        )
        .unwrap();
        assert_eq!(left["positions"][0]["quantity"], 1);
        assert_eq!(next["positions"][0]["quantity"], 2);
        assert_eq!(next["shippingCosts"]["totalPrice"], 0);
        assert_eq!(left["shippingCosts"]["totalPrice"], 4.9);
        for p in [
            json!([]),
            json!([{"id":"c","quantity":1}]),
            json!([{"id":"a","quantity":4}]),
            json!([{"id":"a","quantity":1},{"id":"a","quantity":1}]),
            json!([{"id":"a","quantity":3},{"id":"b","quantity":2}]),
        ] {
            assert!(allocate(&source, &p, false, "next").is_err());
        }
        let mut labelled = source.clone();
        labelled["label"] = json!({"id":"label"});
        assert!(allocate(&labelled, &json!([{"id":"a","quantity":1}]), false, "next").is_err());
        assert!(allocate(&source, &json!([{"id":"a","quantity":1}]), true, "next").is_err());
    }
}
