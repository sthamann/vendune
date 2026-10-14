//! Immutable private carrier documents belong to the existing order receipt store, never product assets.
use super::*;
pub(crate) fn allocation_digest(order: &Value, index: usize) -> String {
    hash(&json!({"id":order["id"],"deliveryIndex":index,"positions":order["deliveries"][index]["positions"],"method":order["deliveries"][index]["shippingMethod"]["id"],"address":order["shippingAddress"]}).to_string())
}
pub(crate) async fn import_document(
    a: &App,
    h: &RequestContext,
    m: &apps::Manifest,
    metadata: Value,
    content: Vec<u8>,
) -> Result<Value> {
    let t = merchant(a, h)?;
    auth::permit(h, "documents.create")?;
    auth::permit(h, "orders.write")?;
    auth::permit(h, "customers.pii")?;
    if h.principal.app.as_deref() != Some(m.id.as_str()) {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Carrier documents require the approved app callback identity".into(),
        ));
    }
    if staging::parent(a, &t).await?.is_some() {
        return Err(bad("Operational documents cannot be staged"));
    }
    let id = metadata["orderId"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() <= 100)
        .ok_or(bad("Order ID required"))?;
    let key = metadata["requestKey"]
        .as_str()
        .filter(|s| (8..=128).contains(&s.len()))
        .ok_or(bad("Document request key required"))?;
    let kind = metadata["kind"]
        .as_str()
        .filter(|s| ["shipping_label", "return_label"].contains(s))
        .ok_or(bad("Invalid carrier document kind"))?;
    let index = metadata["deliveryIndex"]
        .as_u64()
        .and_then(|n| usize::try_from(n).ok())
        .ok_or(bad("Shipment index required"))?;
    if !content.starts_with(b"%PDF-") || content.len() > 2 * 1024 * 1024 {
        return Err(bad("Carrier document must be a PDF within 2 MiB"));
    }
    let tracking = metadata["trackingCode"].as_str().unwrap_or("");
    let url = metadata["trackingUrl"].as_str().unwrap_or("");
    if tracking.len() > 100
        || tracking.chars().any(char::is_control)
        || url.len() > 2000
        || !url.is_empty() && (!url.starts_with("https://") || !assets::safe_url(url))
    {
        return Err(bad("Invalid carrier tracking information"));
    }
    let content_digest = {
        use sha2::Digest;
        format!("{:x}", sha2::Sha256::digest(&content))
    };
    let fingerprint =
        hash(&json!({"app":m.id,"metadata":metadata,"content":content_digest}).to_string());
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "app").await?;
    apps::lock_package_write(&mut tx, &t, m).await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(format!("receipt:{t}:{key}"))
        .execute(&mut *tx)
        .await?;
    if let Some(r)=sqlx::query("SELECT id,number,fingerprint,source_app FROM order_receipts WHERE tenant=$1 AND request_key=$2").bind(&t).bind(key).fetch_optional(&mut *tx).await? {
        if r.get::<String,_>("fingerprint")!=fingerprint || r.get::<Option<String>,_>("source_app").as_deref()!=Some(m.id.as_str()) {return Err(conflict("Document request key reused"));}
        return Ok(json!({"id":r.get::<String,_>("id"),"number":r.get::<String,_>("number")}));
    }
    let mut order: Value =
        sqlx::query_scalar("SELECT data FROM orders WHERE tenant=$1 AND id=$2 FOR UPDATE")
            .bind(&t)
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or(Error(StatusCode::NOT_FOUND, "Order not found".into()))?;
    if metadata["allocationDigest"] != allocation_digest(&order, index) {
        return Err(conflict(
            "Package allocation changed; reconcile the provider result before booking again",
        ));
    }
    let d = order["deliveries"]
        .as_array_mut()
        .and_then(|v| v.get_mut(index))
        .ok_or(bad("Shipment unavailable"))?;
    if kind == "shipping_label" && (d["state"] != "open" || !d["label"].is_null()) {
        return Err(conflict(
            "Package already labelled or dispatched; reconcile the existing booking",
        ));
    }
    if kind == "shipping_label"
        && (d["booking"]["sourceApp"] != m.id || d["booking"]["requestKey"] != key)
    {
        return Err(conflict(
            "Document does not acknowledge this package's original booking",
        ));
    }
    let document = uid();
    let number = format!("DOC-{document}");
    let snapshot = json!({"id":document,"number":number,"kind":kind,"sourceApp":m.id,"packageVersion":m.version,"deliveryIndex":index,"allocationDigest":metadata["allocationDigest"],"trackingCode":tracking,"trackingUrl":url});
    // Outbound labels contain recipient data and are merchant-only. Return labels are available solely to the owning account.
    sqlx::query("INSERT INTO order_receipts(id,tenant,order_id,kind,number,locale,snapshot,request_key,fingerprint,content,source_app,customer_visible) VALUES($1,$2,$3,$4,$5,'en',$6,$7,$8,$9,$10,$11)").bind(&document).bind(&t).bind(id).bind(kind).bind(&number).bind(&snapshot).bind(key).bind(fingerprint).bind(content).bind(&m.id).bind(kind=="return_label").execute(&mut *tx).await?;
    if kind == "shipping_label" {
        d.as_object_mut().unwrap().remove("booking");
        d["label"] = json!({"id":document,"sourceApp":m.id});
        d["trackingCode"] = json!(tracking);
        d["trackingUrl"] = if url.is_empty() {
            Value::Null
        } else {
            json!(url)
        };
    }
    order["revision"] = json!(order["revision"].as_u64().unwrap_or(1) + 1);
    commerce::order_mutation::persist(&mut tx,&t,h,&mut order,commerce::order_mutation::Audit {
        kind:"receipt", data:json!({"id":document,"number":number,"kind":kind,"state":"issued","sourceApp":m.id}),
        event_kind:"document.created",event:json!({"orderId":id,"documentId":document,"kind":kind,"sourceApp":m.id}),
    }).await?;
    tx.commit().await?;
    Ok(json!({"id":document,"number":number}))
}

pub(crate) fn document_response(snapshot: &Value, content: Option<Vec<u8>>) -> Response {
    if let Some(content) = content {
        return (
            [
                ("content-type", "application/pdf"),
                ("cache-control", "private, no-store"),
                ("x-content-type-options", "nosniff"),
                (
                    "content-disposition",
                    "attachment; filename=carrier-document.pdf",
                ),
            ],
            content,
        )
            .into_response();
    }
    receipts::receipt_response(snapshot)
}
