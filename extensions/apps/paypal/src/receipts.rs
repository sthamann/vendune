//! PayPal receipt interpretation; shared payment storage owns order and inventory effects.
use crate::payments::{Attempt, enqueue_tx, paypal, receipt_matches, state, storage::update_order};
use crate::{Error, Result, StatusCode, Value, bad, json};

pub(crate) async fn persist(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    p: &Attempt,
    op: &str,
    input: &Value,
    v: &Value,
) -> Result<()> {
    let mut state = p.state.clone();
    let mut capture = p.capture.clone();
    let mut provider_order = p.provider_order.clone();
    let mut url: Option<String> = None;
    let mut refunded = p.refunded;
    if op == "refund" {
        let amount = input["amountMinor"]
            .as_i64()
            .ok_or(bad("Refund amount missing"))?;
        if v["status"] == "PENDING" {
            return Err(Error(
                StatusCode::ACCEPTED,
                "Provider refund pending".into(),
            ));
        }
        if !receipt_matches(
            amount,
            &v["amount"],
            &p.currency,
            v["status"] == "COMPLETED",
        )? || v["id"].as_str().is_none()
        {
            return Err(bad("Refund receipt does not confirm the requested amount"));
        }
        refunded = refunded
            .checked_add(amount)
            .filter(|v| *v <= p.amount)
            .ok_or(bad("Refund exceeds payment"))?;
        state = if refunded == p.amount {
            "refunded"
        } else {
            "partially_refunded"
        }
        .into();
    } else {
        paypal::validate_order(p, v)?;
        provider_order = Some(
            v["id"]
                .as_str()
                .ok_or(bad("Provider order ID missing"))?
                .into(),
        );
        if v["status"] == "COMPLETED" {
            let captures = v["purchase_units"][0]["payments"]["captures"]
                .as_array()
                .filter(|c| c.len() == 1)
                .ok_or(bad("Expected one capture receipt"))?;
            let c = &captures[0];
            if !receipt_matches(
                p.amount,
                &c["amount"],
                &p.currency,
                c["status"] == "COMPLETED",
            )? {
                return Err(bad("Capture receipt does not match payment"));
            }
            capture = Some(
                c["id"]
                    .as_str()
                    .filter(|s| s.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-'))
                    .ok_or(bad("Capture ID missing"))?
                    .into(),
            );
            if ["pending", "ready", "approved"].contains(&state.as_str()) {
                state = "captured".into();
            } else if ["cancelled", "expired"].contains(&state.as_str()) {
                state = "captured_late".into();
            }
        } else if ["pending", "ready", "approved"].contains(&state.as_str()) {
            state = if v["status"] == "APPROVED" || state == "approved" {
                "approved"
            } else {
                "ready"
            }
            .into();
            url = v["links"]
                .as_array()
                .and_then(|ls| {
                    ls.iter().find(|l| {
                        ["payer-action", "approve"].contains(&l["rel"].as_str().unwrap_or(""))
                    })
                })
                .and_then(|l| l["href"].as_str())
                .map(str::to_string);
            if let Some(s) = &url {
                let parsed =
                    reqwest::Url::parse(s).map_err(|_| bad("Invalid provider approval URL"))?;
                if parsed.scheme() != "https"
                    || !parsed.host_str().is_some_and(|h| {
                        if p.environment == "live" {
                            h == "paypal.com" || h == "www.paypal.com"
                        } else {
                            h == "sandbox.paypal.com" || h.ends_with(".sandbox.paypal.com")
                        }
                    })
                {
                    return Err(bad("Approval URL must belong to PayPal Sandbox"));
                }
            }
        }
    }
    let transitioned = state != p.state;
    state::transition(&p.state, &state)?;
    sqlx::query("UPDATE payment_attempts SET state=$1,provider_order=coalesce($2,provider_order),approval_url=coalesce($3,approval_url),capture_id=$4,refunded_minor=$5,revision=revision+1 WHERE tenant=$6 AND id=$7").bind(&state).bind(provider_order).bind(url).bind(capture).bind(refunded).bind(&p.tenant).bind(&p.id).execute(&mut **tx).await?;
    if transitioned && state == "approved" {
        // Approval is verified by the provider adapter, never by a browser return URL.
        enqueue_tx(
            tx,
            &p.tenant,
            &p.id,
            "capture",
            &format!("approved:{}", p.id),
            &json!({}),
        )
        .await?;
    }
    if transitioned {
        update_order(tx, p, &state).await?;
    }
    Ok(())
}
