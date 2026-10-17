//! Native B2B operation catalogue and bounded request schema shared by HTTP, MCP and UCP adapters.
use super::*;
pub(crate) const CAPABILITIES: &[(&str, &str)] = &[
    (
        "b2b.company.create",
        "Create a company with its first purchasing unit and optional existing customer",
    ),
    (
        "b2b.settings.save",
        "Configure native B2B features using shared revisioned settings",
    ),
    (
        "b2b.configuration",
        "Read shared purchasing configuration without unrelated settings authority",
    ),
    (
        "b2b.requisition.import",
        "Import a mapped requisition as a native owned order list",
    ),
    (
        "b2b.unit.orders",
        "Read orders admitted by explicit unit-order permission",
    ),
    (
        "b2b.catalog.save",
        "Revise the purchasing unit product catalog",
    ),
    ("b2b.quotes", "List your company quote requests"),
    ("b2b.quote.get", "Read an owned original-cart quote"),
    (
        "b2b.quote.current",
        "Read quotes for the current owned company cart",
    ),
    ("b2b.quotes.merchant", "Read merchant quote inbox"),
    ("b2b.quote.request", "Request a native company cart quote"),
    ("b2b.quote.offer", "Send a currency-bound merchant offer"),
    (
        "b2b.quote.transition",
        "Advance an accepted app-owned quote preparation state",
    ),
    ("b2b.quote.message", "Continue a scoped quote negotiation"),
    ("b2b.quote.reject", "Reject your pending quote"),
    (
        "b2b.quote.accept",
        "Bind an offered quote to its original native cart",
    ),
    (
        "b2b.quote.release",
        "Remove the accepted offer from an open cart",
    ),
    ("b2b.lists", "Read private or unit-shared procurement lists"),
    ("b2b.list.save", "Revise an owned procurement list"),
    ("b2b.list.delete", "Delete an owned procurement list"),
    (
        "b2b.list.apply",
        "Apply an admitted list to the native cart",
    ),
    (
        "b2b.quick-order",
        "Resolve SKU lines into a native company cart",
    ),
    ("b2b.companies", "List merchant companies"),
    ("b2b.company", "Read company, units and employee grants"),
    ("b2b.company.save", "Create or revise a merchant company"),
    ("b2b.unit.save", "Create or revise a purchasing unit"),
    (
        "b2b.member.save",
        "Grant or pause a current customer's unit purchasing rights",
    ),
    (
        "b2b.contexts",
        "Discover the signed-in customer's active company units",
    ),
    (
        "b2b.select",
        "Bind an owned native cart to a purchasing unit and purchase-order reference",
    ),
    (
        "b2b.approval.request",
        "Request approval of a revision-bound native quote",
    ),
    ("b2b.approvals", "Read the employee's unit approval inbox"),
    (
        "b2b.approval.decide",
        "Approve or reject another employee's pending purchase",
    ),
];
pub(crate) fn permission(name: &str) -> Option<&str> {
    match name.strip_prefix("b2b.")? {
        "settings.save" => Some("settings.write"),
        "companies" | "company" | "configuration" => Some("b2b.read"),
        "requisition.import" | "company.create" | "company.save" | "unit.save" | "member.save"
        | "catalog.save" | "quotes.merchant" | "quote.offer" | "quote.transition" => {
            Some("b2b.manage")
        }
        _ => None,
    }
}
pub(crate) fn schema(name: &str) -> Option<Value> {
    if !CAPABILITIES.iter().any(|(n, _)| *n == name) {
        return None;
    }
    if name == "b2b.quote.transition" {
        return Some(
            json!({"type":"object","required":["id","revision","action"],"properties":{"id":{"type":"string","maxLength":100},"revision":{"type":"integer","minimum":1},"action":{"type":"string","maxLength":32},"message":{"type":"string","maxLength":4000}},"additionalProperties":false}),
        );
    }
    let properties = json!({"id":{"type":"string","maxLength":100},"unitId":{"type":"string","maxLength":100},"companyId":{"type":"string","maxLength":100},"parentId":{"type":["string","null"]},"customerId":{"type":"string","maxLength":100},"purchaseOrder":{"type":"string","maxLength":100},"revision":{"type":"integer","minimum":0},"state":{"type":"string","enum":["approved","rejected"]},"message":{"type":"string","maxLength":4000},"cartRevision":{"type":"integer","minimum":0},"lines":{"type":"array","maxItems":100,"items":{"type":"object","required":["sku","quantity"],"properties":{"sku":{"type":"string"},"quantity":{"type":"integer","minimum":1,"maximum":10000}},"additionalProperties":false}},"productIds":{"type":"array","maxItems":1000,"items":{"type":"string"}},"data":{"type":"object"}});
    Some(json!({"type":"object","properties":properties,"additionalProperties":false}))
}
