//! Outbound negative controls retain native amounts, escapes and explicit unsupported invoice profiles.
use super::*;
fn fixture() -> Value {
    json!({"number":"INV-1","issuedAt":"2026-10-12 12:00:00+00","order":{"orderNumber":"ORD-1","createdAt":"2026-10-12 12:00:00+00","b2b":{"purchaseOrder":"PO<1"},"cart":{"price":{"currency":"EUR","currencyScale":2,"taxStatus":"net","netPrice":10.,"tax":1.9,"totalPrice":11.9},"lineItems":[{"productNumber":"A+B","label":"A & B","quantity":2,"price":{"totalPrice":10.,"unitPrice":5.,"calculatedTaxes":[{"taxRate":19.,"tax":1.9}]}}]}}})
}
#[test]
fn outbound_reuses_native_identity_and_exact_amounts() {
    let p = json!({"receiver_id":"SELLER","sender_id":"BUYER"});
    let s = fixture();
    for kind in ["order_response", "delivery_note", "invoice"] {
        let u = render("ubl", kind, &p, &s).unwrap();
        roxmltree::Document::parse(&u).unwrap();
        assert!(u.contains("PO&lt;1") && u.contains("A &amp; B"));
        let d = render("edifact", kind, &p, &s).unwrap();
        assert!(d.contains("A?+B:SA") && d.contains("UNT+"));
    }
    assert!(
        render("ubl", "invoice", &p, &s)
            .unwrap()
            .contains(">11.90<")
    );
}
#[test]
fn export_rejects_missing_skus_unrepresented_charges_and_zero_rate() {
    let p = json!({"receiver_id":"SELLER","sender_id":"BUYER"});
    let mut s = fixture();
    s["order"]["cart"]["price"]["netPrice"] = json!(11.);
    assert!(render("ubl", "invoice", &p, &s).is_err());
    let mut s = fixture();
    s["order"]["cart"]["lineItems"][0]["productNumber"] = Value::Null;
    assert!(render("ubl", "invoice", &p, &s).is_err());
    let mut s = fixture();
    s["order"]["cart"]["lineItems"][0]["price"]["calculatedTaxes"][0]["taxRate"] = json!(0.);
    assert!(render("ubl", "invoice", &p, &s).is_err());
}
#[test]
fn cancelled_orders_are_not_exported_as_acceptances() {
    let p = json!({"receiver_id":"SELLER","sender_id":"BUYER"});
    let mut s = fixture();
    s["order"]["state"] = json!("cancelled");
    for format in ["ubl", "edifact"] {
        assert!(render(format, "order_response", &p, &s).is_err());
    }
}
