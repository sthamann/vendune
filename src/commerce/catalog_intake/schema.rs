//! One catalogue-intake contract is shared by HTTP, MCP and explicit UI review; it cannot publish or overwrite products.
use crate::*;
pub(crate) const CAPABILITIES: &[(&str, &str)] = &[
    (
        "merchant.catalog.context",
        "Read current catalogue intake language, currency, taxes and sandbox status",
    ),
    (
        "merchant.catalog.prepare",
        "Prepare CSV, public URL or described demo products without saving",
    ),
    (
        "merchant.catalog.save",
        "Explicitly save one reviewed new product in the current private sandbox",
    ),
];
pub(crate) fn schema(name: &str) -> Option<Value> {
    let (props, required) = match name {
        "merchant.catalog.context" => (json!({}), vec![]),
        "merchant.catalog.prepare" => (
            json!({"mode":{"type":"string","enum":["csv","url","demo"]},"source":{"type":"string","minLength":1,"maxLength":200000},"count":{"type":"integer","minimum":1,"maximum":10},"inference":{"type":["object","null"],"properties":{"provider":{"type":"string","enum":["platform","ollama","openai","anthropic"]},"model":{"type":["string","null"]}},"additionalProperties":false}}),
            vec!["mode", "source", "count"],
        ),
        "merchant.catalog.save" => (
            json!({"id":{"type":"string"},"approve":{"type":"boolean"},"settingsRevision":{"type":"integer","minimum":1},"mainLocale":{"type":"string"},"currency":{"type":"string"},"taxRate":{"type":"number","minimum":0,"maximum":50},"demo":{"type":"boolean"},"draft":{"type":"object","additionalProperties":false,"properties":{"name":{"type":"string","minLength":1,"maxLength":200},"description":{"type":"string","maxLength":4000},"price":{"type":"number","minimum":0,"maximum":1000000},"productNumber":{"type":"string","maxLength":100},"imageUrl":{"type":"string","maxLength":2000}},"required":["name","description","price"]}}),
            vec![
                "id",
                "approve",
                "settingsRevision",
                "mainLocale",
                "currency",
                "taxRate",
                "demo",
                "draft",
            ],
        ),
        _ => return None,
    };
    Some(
        json!({"type":"object","properties":props,"required":required,"additionalProperties":false}),
    )
}
