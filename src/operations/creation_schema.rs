//! Domain-owned MCP schemas for safe CRM creation choices and explicitly reviewed manual orders.
use super::*;
pub(crate) const CAPABILITIES: &[(&str, &str)] = &[
    (
        "merchant.customer.creation",
        "Read safe customer-creation groups and countries without granting settings access",
    ),
    (
        "merchant.customer.create",
        "Create a tenant customer profile and default addresses without issuing login credentials",
    ),
    (
        "merchant.order.context",
        "Read configured manual order context",
    ),
    (
        "merchant.order.review",
        "Prepare an actor-private authoritative native order quote",
    ),
    (
        "merchant.order.complete",
        "Explicit idempotent admin order checkout bound to reviewed revision and exact total",
    ),
];
pub(crate) fn schema(name: &str) -> Option<Value> {
    let (props, required) = match name {
        "merchant.customer.creation" => (json!({}), vec![]),
        "merchant.customer.create" => (
            json!({"email":{"type":"string"},"profile":{"type":"object"},"customerGroup":{"type":"string"},"billingAddress":{"type":"object"},"shippingAddress":{"type":["object","null"]},"requestKey":{"type":"string","minLength":8,"maxLength":128}}),
            vec![
                "email",
                "profile",
                "customerGroup",
                "billingAddress",
                "requestKey",
            ],
        ),
        "merchant.order.context" => (
            json!({"channelId":{"type":"string"},"locale":{"type":"string"}}),
            vec!["channelId"],
        ),
        "merchant.order.review" => (
            json!({"channelId":{"type":"string"},"customerId":{"type":"string"},"locale":{"type":"string"},"currency":{"type":"string"},"items":{"type":"array","maxItems":100,"items":{"type":"object","properties":{"id":{"type":"string"},"quantity":{"type":"integer","minimum":1,"maximum":10000}},"required":["id","quantity"],"additionalProperties":false}},"checkout":{"type":"object"},"codes":{"type":"array","items":{"type":"string"}}}),
            vec![
                "channelId",
                "locale",
                "currency",
                "customerId",
                "items",
                "checkout",
            ],
        ),
        "merchant.order.complete" => (
            json!({"channelId":{"type":"string"},"locale":{"type":"string"},"cartToken":{"type":"string"},"revision":{"type":"integer"},"totalMinor":{"type":"string","pattern":"^[0-9]+$"},"approve":{"type":"boolean"},"customerAcknowledgement":{"type":"boolean"},"policyVersion":{"type":"string"},"terms":{"type":"boolean"},"digitalImmediate":{"type":"boolean"},"requestKey":{"type":"string","minLength":8,"maxLength":128}}),
            vec![
                "channelId",
                "locale",
                "cartToken",
                "revision",
                "totalMinor",
                "approve",
                "customerAcknowledgement",
                "policyVersion",
                "terms",
                "digitalImmediate",
                "requestKey",
            ],
        ),
        _ => return None,
    };
    Some(
        json!({"type":"object","properties":props,"required":required,"additionalProperties":false}),
    )
}
