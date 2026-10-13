//! UCP B2B commands route to native RFQ/CAS/approval owners; a checkout token alone never identifies an employee.
use super::*;
fn operation(op: &str) -> Result<String> {
    if op == "checkout.handoff" {
        return Ok(op.into());
    }
    if ![
        "contexts",
        "select",
        "quote.current",
        "quote.get",
        "quote.request",
        "quote.message",
        "quote.reject",
        "quote.accept",
        "quote.release",
        "approval.request",
    ]
    .contains(&op)
    {
        return Err(bad(
            "Unsupported buyer negotiation operation; merchant offers and approver decisions use their authenticated native APIs",
        ));
    }
    Ok(format!("b2b.{op}"))
}
pub(crate) async fn command(
    State(a): State<App>,
    h: RequestContext,
    Path((id, op)): Path<(String, String)>,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let name = operation(&op)?;
    if !profile::selected(&h).await? {
        return Err(conflict(
            "capabilities_incompatible: negotiate ai.veyndo.app.shopping.b2b_negotiation first",
        ));
    }
    let c = ucp_load(&a, &h, &id).await?;
    // Guard session/membership even on read or closed-cart paths; native commands repeat checks under locks.
    b2b::guard(&a, &h, &c).await?;
    accounts::identity(&a, &h).await?;
    if ["quote.message", "quote.reject"].contains(&op.as_str()) {
        Box::pin(b2b::invoke(&a, &h, "b2b.quote.get", &json!({"id":v["id"]}))).await?;
    }
    let result = if name == "checkout.handoff" {
        if v.as_object()
            .is_none_or(|o| o.len() != 1 || !o.contains_key("revision"))
        {
            return Err(bad(
                "Checkout handoff requires only the current cart revision",
            ));
        }
        checkout_handoff::issue(State(a.clone()), h.clone(), Json(v))
            .await?
            .0
    } else {
        // Keep the large shared domain dispatcher out of the UCP future's stack frame.
        Box::pin(b2b::invoke(&a, &h, &name, &v)).await?
    };
    let current = ucp_load(&a, &h, &id).await?;
    let mut doc = response(&a, &h, &current, true).await?;
    if name == "checkout.handoff" {
        let origin = shop_domains::links(&c.tenant)["studioUrl"]
            .as_str()
            .unwrap()
            .to_owned();
        let url = reqwest::Url::parse(&origin)
            .and_then(|u| u.join(result["checkoutPath"].as_str().unwrap()))
            .map_err(|_| bad("Invalid checkout continuation URL"))?;
        doc["continue_url"] = json!(url.as_str());
    }
    doc["b2b_negotiation"]["result"] = result;
    Ok(Json(doc))
}
pub(super) async fn response(
    a: &App,
    h: &RequestContext,
    c: &StoredCart,
    selected: bool,
) -> Result<Value> {
    let mut quote = cart_json(a, c).await?;
    // Completed price snapshots stay immutable; purchasing metadata describes current policy.
    if selected && c.data.b2b.is_some() && quote["b2b"].is_null() {
        b2b::preview(a, c, &mut quote).await?;
    }
    let mut doc = ucp_document(c, &quote);
    // Keep canonical tenant/channel links instead of localhost-only continuation URLs.
    let mut url = reqwest::Url::parse(
        shop_domains::links(&c.tenant)["storefrontUrl"]
            .as_str()
            .unwrap(),
    )
    .map_err(|_| bad("Invalid shop origin"))?;
    url.query_pairs_mut()
        .append_pair("channel", &c.data.sales_channel);
    url.set_fragment(Some("checkout"));
    doc["continue_url"] = json!(url.as_str());
    if let Some(order) = c.data.order.as_ref() {
        url.set_fragment(Some(&format!(
            "order/{}",
            order["id"].as_str().unwrap_or_default()
        )));
        doc["order"]["permalink_url"] = json!(url.as_str());
        if let Some(attempt) = order["payment"]["attemptId"].as_str()
            && doc["status"] == "requires_escalation"
        {
            url.set_fragment(Some(&format!("payment/{attempt}")));
            doc["continue_url"] = json!(url.as_str());
        }
    }
    if !selected {
        return Ok(doc);
    }
    doc["ucp"]["capabilities"][profile::B2B] = json!([{"version":profile::VERSION}]);
    let procurement = &quote["b2b"];
    doc["b2b_negotiation"] =
        json!({"checkout_revision":c.revision,"purchasing":procurement,"quotes":[]});
    if c.data.b2b.is_some() && procurement["quotesAllowed"] == true {
        let quotes = Box::pin(b2b::invoke(a, h, "b2b.quote.current", &json!({}))).await?;
        doc["b2b_negotiation"]["quotes"] = quotes["elements"].clone();
        doc["b2b_negotiation"]["quote_limit"] = quotes["limit"].clone();
    }
    if c.status == "open"
        && let Some((code, _)) = blocker(procurement)
    {
        doc["status"] = json!("requires_escalation");
        doc["messages"] =
            json!([{"type":"info","code":code,"content":messages::content(code,&c.data.locale)}]);
    }
    Ok(doc)
}
fn blocker(p: &Value) -> Option<(&'static str, &'static str)> {
    if p["budgetAvailable"] == false {
        Some((
            "b2b_budget_exceeded",
            "Purchasing budget exceeded. Ask your company administrator.",
        ))
    } else if p["purchaseOrderRequired"] == true
        && p["purchaseOrder"]
            .as_str()
            .is_none_or(|v| v.trim().is_empty())
    {
        Some((
            "b2b_purchase_order_required",
            "Enter the purchase-order reference required by your company.",
        ))
    } else if p["approvalRequired"] == true && p["approval"]["state"] != "approved" {
        Some((
            "b2b_approval_required",
            "The current negotiated checkout requires a separate authorized purchasing approver.",
        ))
    } else {
        None
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn buyer_protocol_cannot_offer_or_self_grant_merchant_authority() {
        assert!(operation("quote.request").is_ok());
        for name in [
            "quote.offer",
            "approval.decide",
            "company.save",
            "../../api/b2b/quote.offer",
        ] {
            assert!(operation(name).is_err());
        }
    }
    #[test]
    fn readiness_describes_current_budget_and_separate_approval() {
        assert_eq!(
            blocker(&json!({"budgetAvailable":false})).unwrap().0,
            "b2b_budget_exceeded"
        );
        assert_eq!(
            blocker(&json!({"approvalRequired":true,"approval":{"state":"requested"}}))
                .unwrap()
                .0,
            "b2b_approval_required"
        );
        assert!(blocker(&json!({"budgetAvailable":true,"approvalRequired":true,"approval":{"state":"approved"}})).is_none());
    }
}
