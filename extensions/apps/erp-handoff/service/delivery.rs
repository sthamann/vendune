//! Authoritative order callback and fixed-destination ERP export: one stable key, no automatic retry after an ambiguous result.
use super::*;
use sha2::{Digest, Sha256};
async fn response_json(response: reqwest::Response) -> Result<Value> {
    if response.content_length().is_some_and(|n| n > 65536) {
        return Err(error(StatusCode::BAD_GATEWAY, "ERP response exceeds limit"));
    }
    let mut response = response;
    let mut bytes = vec![];
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| error(StatusCode::BAD_GATEWAY, "ERP response interrupted"))?
    {
        if bytes.len() + chunk.len() > 65536 {
            return Err(error(StatusCode::BAD_GATEWAY, "ERP response exceeds limit"));
        }
        bytes.extend(chunk);
    }
    serde_json::from_slice(&bytes)
        .map_err(|_| error(StatusCode::BAD_GATEWAY, "ERP response is not valid JSON"))
}
async fn order(a: &App, t: &str, id: &str) -> Result<Value> {
    let c = &a.config.tenants[t];
    let response = a
        .http
        .post(format!(
            "{}/api/apps/{}/core/order",
            a.config.core_url.trim_end_matches('/'),
            a.config.app_id
        ))
        .header("x-tenant", t)
        .bearer_auth(&c.callback_token)
        .json(&json!({"id":id}))
        .send()
        .await
        .map_err(|_| {
            error(
                StatusCode::BAD_GATEWAY,
                "Authoritative order callback unavailable",
            )
        })?;
    if !response.status().is_success() {
        return Err(error(
            StatusCode::FORBIDDEN,
            "Order callback denied; check current tenant, package digest, expiry and orders.read consent",
        ));
    }
    let order = response_json(response).await?;
    if order["id"] != id
        || order["totalMinor"].as_i64().is_none()
        || order["currency"].as_str().is_none()
    {
        return Err(error(
            StatusCode::BAD_GATEWAY,
            "Order callback did not return a valid exact-money order",
        ));
    }
    Ok(order)
}
pub(super) async fn send(a: &App, t: &str, id: &str) -> Result<Value> {
    let _slot = a
        .capacity
        .clone()
        .try_acquire_owned()
        .map_err(|_| error(StatusCode::TOO_MANY_REQUESTS, "ERP adapter capacity busy"))?;
    let c = &a.config.tenants[t];
    let payload = json!({"apiVersion":"1","tenant":t,"order":order(a,t,id).await?});
    let key = format!(
        "veyndo-{:x}",
        Sha256::digest(format!("{t}:{}:{id}", a.config.app_id))
    );
    if let Some(existing) = store::claim(a, t, id, &payload, &key).await? {
        return Ok(existing);
    }
    let result = a
        .http
        .post(&c.erp_url)
        .bearer_auth(&c.erp_token)
        .header("Idempotency-Key", &key)
        .json(&payload)
        .send()
        .await;
    match result {
        Err(_) => store::finish(a,t,id,"uncertain",None,"No confirmed ERP response. Reconcile using the idempotency key; automatic resend is blocked.").await,
        Ok(response) if response.status().is_client_error() => store::finish(a,t,id,"failed",None,"ERP rejected the export. Correct the mapping and reconcile before a new attempt.").await,
        Ok(response) if response.status().is_success() => match response_json(response).await {
            Ok(v) if v["receiptId"].as_str().is_some_and(|s| !s.is_empty()&&s.len()<=200) => store::finish(a,t,id,"accepted",v["receiptId"].as_str(),"ERP acknowledged this export.").await,
            _ => store::finish(a,t,id,"uncertain",None,"ERP responded without a bounded receiptId. Reconcile externally.").await,
        },
        _ => store::finish(a,t,id,"uncertain",None,"ERP returned a server or redirect response. Reconcile externally; automatic resend is blocked.").await,
    }
}
pub(super) async fn reconcile(a: &App, t: &str, id: &str) -> Result<Value> {
    let _slot = a
        .capacity
        .clone()
        .try_acquire_owned()
        .map_err(|_| error(StatusCode::TOO_MANY_REQUESTS, "ERP adapter capacity busy"))?;
    order(a, t, id).await?;
    let c = &a.config.tenants[t];
    let existing = store::get(a, t, id).await?;
    if existing["state"] != "uncertain" && existing["state"] != "failed" {
        return Ok(existing);
    }
    let key = existing["idempotencyKey"]
        .as_str()
        .ok_or(error(StatusCode::CONFLICT, "ERP receipt key missing"))?;
    let response = a
        .http
        .get(format!(
            "{}/receipts/{key}",
            c.erp_url.trim_end_matches('/')
        ))
        .bearer_auth(&c.erp_token)
        .send()
        .await
        .map_err(|_| {
            error(
                StatusCode::BAD_GATEWAY,
                "ERP reconciliation unavailable; no export was repeated",
            )
        })?;
    if !response.status().is_success() {
        return Err(error(
            StatusCode::BAD_GATEWAY,
            "ERP did not confirm this receipt; no export was repeated",
        ));
    }
    let v = response_json(response).await?;
    let receipt = v["receiptId"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() <= 200)
        .ok_or(error(
            StatusCode::BAD_GATEWAY,
            "ERP reconciliation needs a bounded receiptId",
        ))?;
    store::reconcile(a, t, id, receipt).await
}
