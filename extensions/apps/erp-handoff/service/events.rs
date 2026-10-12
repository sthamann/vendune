//! Full event batches are validated before the first ERP effect; tenant/app/idempotency identity is exact.
use super::*;
/// Public delivery uses the same HMAC SDK contract as Core; secrets and expected app identity are operator-owned.
pub(super) async fn signed(
    State(a): State<App>,
    h: HeaderMap,
    raw: axum::body::Bytes,
) -> Result<Json<Value>> {
    let t = h
        .get("x-tenant")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let secret = a
        .config
        .tenants
        .get(t)
        .and_then(|c| c.webhook_secret.as_deref())
        .ok_or(error(
            StatusCode::UNAUTHORIZED,
            "Signed event configuration required",
        ))?;
    if !sdk_events::verify(
        &h,
        &raw,
        secret,
        t,
        &a.config.app_id,
        chrono::Utc::now().timestamp(),
    ) {
        return Err(error(
            StatusCode::UNAUTHORIZED,
            "Invalid or expired event signature",
        ));
    }
    let v: Value = serde_json::from_slice(&raw)
        .map_err(|_| error(StatusCode::BAD_REQUEST, "Invalid event JSON"))?;
    let ids = orders(&v, t, &a.config.app_id)?;
    let mut results = vec![];
    for id in ids {
        results.push(delivery::send(&a, t, &id).await?);
    }
    Ok(Json(json!({"accepted":results.len(),"results":results})))
}
pub(super) fn orders(v: &Value, t: &str, app: &str) -> Result<Vec<String>> {
    let batch = if let Some(es) = v.get("events") {
        if v["apiVersion"] != "1" || v["tenant"] != t || v["app"] != app {
            return Err(error(
                StatusCode::BAD_REQUEST,
                "Event batch context mismatch",
            ));
        }
        es.as_array()
            .filter(|es| !es.is_empty() && es.len() <= 25)
            .ok_or(error(
                StatusCode::BAD_REQUEST,
                "Batch requires 1..25 events",
            ))?
            .iter()
            .collect::<Vec<_>>()
    } else {
        vec![v]
    };
    batch
        .iter()
        .map(|e| {
            let id = e["eventId"]
                .as_u64()
                .filter(|n| *n > 0)
                .ok_or(error(StatusCode::BAD_REQUEST, "Event identity missing"))?;
            let order = e["data"]["orderId"]
                .as_str()
                .filter(|s| !s.is_empty() && s.len() <= 100)
                .ok_or(error(
                    StatusCode::BAD_REQUEST,
                    "Order event identity missing",
                ))?;
            if e["tenant"] != t
                || e["idempotencyKey"] != format!("{t}:{app}:{id}")
                || e["kind"] != "order.placed"
            {
                return Err(error(StatusCode::BAD_REQUEST, "Event identity mismatch"));
            }
            Ok(order.into())
        })
        .collect()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn invalid_tail_rejects_the_entire_batch() {
        let event = json!({"tenant":"own","eventId":1,"idempotencyKey":"own:erp:1","kind":"order.placed","data":{"orderId":"order"}});
        assert_eq!(orders(&event, "own", "erp").unwrap(), vec!["order"]);
        assert!(orders(&json!({"apiVersion":"1","tenant":"own","app":"erp","events":[event,{"tenant":"foreign"}]}),"own","erp").is_err());
    }
}
