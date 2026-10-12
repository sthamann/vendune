//! Standard order read fields are projected from the authoritative quote/payment, never maintained twice.
use super::*;
pub(crate) fn order_fields(o: &mut Value) {
    if !o.is_object() {
        return;
    }
    o["amountTotal"] = o["cart"]["price"]["totalPrice"].clone();
    o["amountNet"] = o["cart"]["price"]["netPrice"].clone();
    o["shippingTotal"] = o["cart"]["shippingCosts"]["totalPrice"].clone();
    o["price"] = o["cart"]["price"].clone();
    // Exact-money API consumers use the immutable quote, including its actual currency scale.
    o["currency"] = o["money"]["currency"]["code"].clone();
    o["currencyScale"] = o["money"]["currency"]["scale"].clone();
    o["totalMinor"] = o["money"]["minor"].clone();
    o["lineItems"] = o["cart"]["lineItems"].clone();
    o["shippingCosts"] = o["cart"]["shippingCosts"].clone();
    o["currencyId"] = o["cart"]["price"]["currency"]
        .as_str()
        .map(|c| json!(c))
        .unwrap_or(json!("EUR"));
    o["currencyFactor"] = json!(
        o["cart"]["currencyContext"]["factor"]
            .as_str()
            .and_then(|s| s.parse::<f64>().ok())
            .unwrap_or(1.)
    );
    if o["currencyFactor"].is_null() {
        o["currencyFactor"] = json!(1);
    }
    o["taxStatus"] = o["cart"]["price"]["taxStatus"].clone();
    o["transactions"] = json!([{"id":o["payment"]["attemptId"].as_str().map(str::to_owned).unwrap_or_else(||format!("{}-payment",o["id"].as_str().unwrap_or(""))),"paymentMethodId":o["payment"]["method"]["id"],"state":o["payment"]["state"],"amount":o["cart"]["price"],"provider":o["payment"]["provider"],"realMoneyCharged":o["payment"]["realMoneyCharged"]}]);
    let mut addresses = Vec::new();
    for (kind, id) in [
        ("billingAddress", "billingAddressId"),
        ("shippingAddress", "shippingAddressId"),
    ] {
        if o[kind].is_object() {
            let mut a = o[kind].clone();
            a["id"] = o[id].clone();
            addresses.push(a);
        }
    }
    o["addresses"] = json!(addresses);
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn payment_projection_follows_provider_state() {
        let mut o = json!({"id":"order","cart":{"price":{"totalPrice":19.99,"netPrice":16.8,"taxStatus":"gross"},"shippingCosts":{"totalPrice":0},"lineItems":[]},"payment":{"state":"pending","method":{"id":"paypal-live"},"provider":"paypal","realMoneyCharged":false}});
        order_fields(&mut o);
        assert_eq!(o["transactions"][0]["state"], "pending");
        o["payment"]["state"] = json!("captured");
        o["payment"]["realMoneyCharged"] = json!(true);
        order_fields(&mut o);
        assert_eq!(o["transactions"][0]["state"], "captured");
        assert_eq!(o["transactions"][0]["realMoneyCharged"], true);
        assert_eq!(o["amountTotal"], 19.99);
    }
    #[test]
    fn exact_api_amount_comes_from_the_order_snapshot_not_recomputed_float_price() {
        let mut o = json!({"cart":{"price":{"totalPrice":99.99,"currency":"EUR"}},"money":{"minor":1200,"currency":{"code":"JPY","scale":0}}});
        order_fields(&mut o);
        assert_eq!(o["totalMinor"], 1200);
        assert_eq!(o["currency"], "JPY");
        assert_eq!(o["currencyScale"], 0);
    }
}
