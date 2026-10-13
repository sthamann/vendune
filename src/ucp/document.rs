//! Project the native checkout and current purchasing constraints into UCP; never authorize a purchase.
use super::*;
pub(crate) fn ucp_document(c: &StoredCart, q: &Value) -> Value {
    let factor = 10_f64.powi(q["price"]["currencyScale"].as_i64().unwrap_or(2) as i32);
    let minor = |v: &Value| (v.as_f64().unwrap_or(0.) * factor).round() as i64;
    let status = if c.status == "completed" {
        "completed"
    } else if c.status == "cancelled" {
        "canceled"
    } else if c
        .data
        .buyer
        .as_ref()
        .and_then(|b| b["email"].as_str())
        .is_some_and(|s| s.contains('@'))
        && !c.data.items.is_empty()
    {
        "ready_for_complete"
    } else {
        "incomplete"
    };
    let mut doc = json!({"ucp":ucp_meta(),"id":c.id,"status":status,"currency":q["price"]["currency"],"line_items":q["lineItems"].as_array().unwrap().iter().map(|l|json!({"id":l["id"],"item":{"id":l["referencedId"],"title":l["label"],"price":minor(&l["price"]["unitPrice"])},"quantity":l["quantity"],"totals":[{"type":"subtotal","amount":minor(&l["price"]["totalPrice"])},{"type":"total","amount":minor(&l["price"]["totalPrice"])}]})).collect::<Vec<_>>(),"totals":[{"type":"subtotal","amount":minor(&q["price"]["positionPrice"])},{"type":"total","amount":minor(&q["price"]["totalPrice"])}],"messages":if c.status=="open"{json!([{"type":"info","code":"requires_buyer_input","content":messages::content("requires_buyer_input",&c.data.locale)}])}else{json!([])},"links":[],"payment":{"instruments":[]},"continue_url":null,"order":c.data.order.as_ref().map(|o|json!({"id":o["id"],"permalink_url":null}))});
    if let Some(o) = &c.data.order
        && o["payment"]["provider"] == "paypal"
        && !["captured", "partially_refunded", "refunded"]
            .contains(&o["payment"]["state"].as_str().unwrap_or(""))
    {
        doc["status"] = json!(if ["cancelled", "expired"]
            .contains(&o["payment"]["state"].as_str().unwrap_or(""))
        {
            "canceled"
        } else {
            "requires_escalation"
        });
        doc["messages"] = json!([{"type":"info","code":"payment_customer_action_required","content":messages::content("payment_customer_action_required",&c.data.locale)}]);
    }
    if c.data.order.is_none() {
        doc.as_object_mut().unwrap().remove("order");
    }
    if let Some(b) = &c.data.buyer {
        doc["buyer"] = b.clone();
    }
    doc
}
