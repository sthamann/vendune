//! Native operation input contracts; transports consume this owner instead of maintaining their own schemas.
use crate::*;
pub(crate) fn input(name: &str) -> Value {
    if let Some(schema) = agent_runs::schema(name) {
        return schema;
    }
    if let Some(schema) = studio::personal::schema(name) {
        return schema;
    }
    if let Some(schema) = apps::site_builder::design_agent::schema(name) {
        return schema;
    }
    if let Some(schema) = apps::record_history::schema(name) {
        return schema;
    }
    if let Some(schema) = auth::roles::schema(name) {
        return schema;
    }
    if let Some(schema) = b2b::schema(name) {
        return schema;
    }
    if let Some(schema) = cognition::contracts::schema(name) {
        return schema;
    }
    if let Some(schema) = currencies::schema(name) {
        return schema;
    }
    if let Some(schema) = legal::schema(name) {
        return schema;
    }
    if let Some(schema) = history::schema(name) {
        return schema;
    }
    if let Some(schema) = documents::knowledge_schema(name) {
        return schema;
    }
    if let Some(schema) = pos::schema(name) {
        return schema;
    }
    if let Some(schema) = operations::creation_schema(name) {
        return schema;
    }
    if let Some(schema) = commerce::catalog_intake::schema(name) {
        return schema;
    }
    let props = match name {
        "merchant.grid.plan" => {
            json!({"entity":{"type":"string","enum":["orders","products","customers"]},"instruction":{"type":"string","minLength":1,"maxLength":2000},"locale":{"type":"string","maxLength":35}})
        }
        "merchant.delivery.split" => {
            json!({"id":{"type":"string"},"revision":{"type":"integer","minimum":1},"deliveryIndex":{"type":"integer","minimum":0},"requestKey":{"type":"string","minLength":8,"maxLength":128},"positions":{"type":"array","minItems":1,"maxItems":100,"items":{"type":"object","required":["id","quantity"],"additionalProperties":false,"properties":{"id":{"type":"string"},"quantity":{"type":"integer","minimum":1}}}}})
        }
        "merchant.customer.lookup" => {
            json!({"query":{"type":"string","maxLength":200},"limit":{"type":"integer","minimum":1,"maximum":100},"after":{"type":"string"}})
        }
        "merchant.company" => json!({"channelId":{"type":"string"}}),
        "merchant.company.save" => {
            json!({"channelId":{"type":"string"},"revision":{"type":"integer","minimum":0},"baseRevision":{"type":"integer","minimum":0},"data":{"type":"object"}})
        }
        "merchant.commerce.read" => json!({"channelId":{"type":"string"}}),
        "merchant.commerce.save" => {
            json!({"channelId":{"type":"string"},"baseRevision":{"type":"integer","minimum":0},"revision":{"type":"integer","minimum":0},"data":{"type":"object"}})
        }
        "merchant.commerce.dependencies" => {
            json!({"area":{"type":"string","enum":["shipping","payments"]},"methodId":{"type":"string"}})
        }
        "merchant.media.list" => json!({"productId":{"type":"string"}}),
        "merchant.media.create" => {
            json!({"productId":{"type":"string"},"revision":{"type":"integer","minimum":1},"mode":{"type":"string","enum":["generate","optimize"]},"sourceId":{"type":["string","null"]},"prompt":{"type":"string","minLength":1,"maxLength":2000}})
        }
        "merchant.media.detail" => json!({"id":{"type":"string"}}),
        "merchant.media.apply" => {
            json!({"id":{"type":"string"},"revision":{"type":"integer","minimum":1}})
        }
        "merchant.translations.create" => {
            json!({"targetLocale":{"type":"string"},"overwrite":{"type":"boolean"},"inference":{"type":"object","properties":{"provider":{"type":"string","enum":["ollama","openai","anthropic"]},"model":{"type":["string","null"]}},"additionalProperties":false}})
        }
        "merchant.translations.detail" => {
            json!({"id":{"type":"string"},"cursor":{"type":"string"}})
        }
        "merchant.translations.control" => {
            json!({"id":{"type":"string"},"action":{"type":"string","enum":["resume","cancel"]}})
        }
        "merchant.translations.apply" => {
            json!({"id":{"type":"string"},"productId":{"type":"string"}})
        }
        "merchant.products" => {
            let mut p = operations::grid_fields("products").unwrap();
            p["after"] = json!({"type":"string"});
            p["limit"] = json!({"type":"integer","minimum":1,"maximum":100});
            p
        }
        "merchant.categories" => json!({}),
        "merchant.product.create" => json!({"product":{"type":"object"}}),
        "merchant.category.create" => json!({"category":{"type":"object"}}),
        "merchant.category.save" => json!({"id":{"type":"string"},"category":{"type":"object"}}),
        "automation.save" => {
            json!({"kind":{"type":"string","enum":["rules","flows","promotions","channels"]},"id":{"type":"string"},"revision":{"type":"integer","minimum":0},"data":{"type":"object"}})
        }
        "automation.delete" => {
            json!({"kind":{"type":"string","enum":["rules","flows","promotions","channels"]},"id":{"type":"string"},"revision":{"type":"integer","minimum":1}})
        }
        "automation.dependencies" => {
            json!({"kind":{"type":"string","enum":["rules","flows","promotions","channels"]},"id":{"type":"string"}})
        }
        "automation.preview" | "automation.import" => json!({"condition":{"type":"object"}}),
        "merchant.customer.addresses" => json!({"id":{"type":"string"}}),
        "merchant.customer.address.save" => {
            json!({"id":{"type":"string"},"addressId":{"type":"string"},"revision":{"type":"integer"},"address":{"type":"object"},"defaultBilling":{"type":"boolean"},"defaultShipping":{"type":"boolean"}})
        }
        "merchant.customer.address.delete" => {
            json!({"id":{"type":"string"},"addressId":{"type":"string"},"revision":{"type":"integer"}})
        }
        "merchant.workflow.save" => json!({"revision":{"type":"integer"},"data":{"type":"object"}}),
        "merchant.product.content" | "merchant.product.assets" => json!({"id":{"type":"string"}}),
        "merchant.product.save" => json!({"id":{"type":"string"},"product":{"type":"object"}}),
        "merchant.asset.publish" => {
            json!({"id":{"type":"string"},"digest":{"type":"string"},"public":{"type":"boolean"}})
        }
        "merchant.customers" | "merchant.orders" => {
            let mut p = operations::grid_fields(if name == "merchant.orders" {
                "orders"
            } else {
                "customers"
            })
            .unwrap();
            p["after"] = json!({"type":"string"});
            p["limit"] = json!({"type":"integer","minimum":1,"maximum":100});
            p
        }
        "merchant.customer" | "merchant.order" | "merchant.receipts" => {
            json!({"id":{"type":"string"}})
        }
        "merchant.customer.save" => json!({"id":{"type":"string"},"customer":{"type":"object"}}),
        "merchant.order.transition" => {
            json!({"id":{"type":"string"},"revision":{"type":"integer"},"kind":{"type":"string","enum":["order","payment","delivery"]},"state":{"type":"string"},"trackingCode":{"type":"string"},"trackingUrl":{"type":"string","format":"uri"},"requestKey":{"type":"string"},"action":{"type":"string"},"deliveryIndex":{"type":"integer","minimum":0}})
        }
        "merchant.order.note" => {
            json!({"id":{"type":"string"},"revision":{"type":"integer"},"text":{"type":"string","maxLength":4000}})
        }
        "merchant.receipt.create" => {
            json!({"id":{"type":"string"},"revision":{"type":"integer"},"kind":{"type":"string","enum":["invoice","delivery_note","cancellation"]},"locale":{"type":"string","enum":["en","de","fr","es"]},"requestKey":{"type":"string"},"referenceId":{"type":"string"},"deliveryIndex":{"type":"integer","minimum":0}})
        }
        "merchant.payment.onboarding" => {
            json!({"id":{"type":"string"},"operation":{"type":"string","enum":["start","status","disconnect"]},"channel":{"type":"string"},"environment":{"type":"string","enum":["sandbox","live","contract-fixture"]},"country":{"type":"string"},"requestKey":{"type":"string"},"approve":{"type":"boolean"}})
        }
        "merchant.payment" => {
            json!({"id":{"type":"string"},"operation":{"type":"string","enum":["capture","authorize","void","refund","reconcile","cancel"]},"amountMinor":{"type":"integer","minimum":1},"requestKey":{"type":"string"},"approve":{"type":"boolean"}})
        }
        "developer.archive" => {
            json!({"app":{"type":"string"},"archived":{"type":"boolean"},"approve":{"type":"boolean"}})
        }
        "developer.import" => {
            json!({"environment":{"type":"string"},"prompt":{"type":"string"},"summary":{"type":"object"},"manifest":{"type":"object"}})
        }
        "developer.stage" => {
            json!({"buildId":{"type":"string"},"digest":{"type":"string"},"approve":{"type":"boolean"}})
        }
        "developer.task" => {
            json!({"environment":{"type":"string"},"prompt":{"type":"string"},"agent":{"type":"string"}})
        }
        "catalog.search" => {
            json!({"query":{"type":"string","maxLength":200},"search":{"type":"string","maxLength":200},"category":{"type":"string","maxLength":100},"categoryId":{"type":"string","maxLength":100},"ids":{"type":"array","maxItems":500,"items":{"type":"string","minLength":1,"maxLength":200}},"after":{"type":"string","maxLength":200},"limit":{"type":"integer","minimum":1,"maximum":100}})
        }
        "knowledge.search" | "knowledge.external" => json!({"query":{"type":"string"}}),
        "cart.create" => json!({"session":{"type":"string"}}),
        "catalog.detail" => {
            json!({"productId":{"type":"string"},"after":{"type":"string","maxLength":200},"limit":{"type":"integer","minimum":1,"maximum":100}})
        }
        "checkout.select" => {
            json!({"revision":{"type":"integer"},"checkout":{"type":"object","properties":{"country":{"type":"string"},"shippingMethodId":{"type":"string"},"paymentMethodId":{"type":"string"},"customerEmail":{"type":["string","null"]},"address":{"type":["object","null"]},"billingAddress":{"type":["object","null"]},"billingAddressId":{"type":["string","null"]},"shippingAddressId":{"type":["string","null"]}},"additionalProperties":false}})
        }
        "cart.replace" => {
            json!({"revision":{"type":"integer"},"items":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"quantity":{"type":"integer","minimum":1}},"required":["id","quantity"]}}})
        }
        "checkout.complete" => json!({"idempotency_key":{"type":"string"}}),
        "merchant.plan" => json!({"instruction":{"type":"string"}}),
        "merchant.apply" => json!({"task_id":{"type":"string"},"approve":{"type":"boolean"}}),
        _ => json!({}),
    };
    let required = match name {
        "merchant.delivery.split" => {
            vec!["id", "revision", "deliveryIndex", "positions", "requestKey"]
        }
        "merchant.company.save" => vec!["revision", "data"],
        "merchant.commerce.save" => vec!["revision", "data"],
        "merchant.commerce.dependencies" => vec!["area", "methodId"],
        "merchant.media.list" => vec!["productId"],
        "merchant.media.create" => vec!["productId", "revision", "mode", "prompt"],
        "merchant.media.detail" => vec!["id"],
        "merchant.media.apply" => vec!["id", "revision"],
        "merchant.translations.create" => vec!["targetLocale"],
        "merchant.translations.control" => vec!["id", "action"],
        "merchant.translations.apply" | "merchant.translations.detail" => vec!["id"],
        "merchant.product.create" => vec!["product"],
        "merchant.category.create" => vec!["category"],
        "merchant.category.save" => vec!["id", "category"],
        "automation.delete" => vec!["kind", "id", "revision"],
        "automation.dependencies" => vec!["kind", "id"],
        "automation.save" => vec!["kind", "id", "revision", "data"],
        "automation.preview" | "automation.import" => vec!["condition"],
        "merchant.customer.addresses" => vec!["id"],
        "merchant.customer.address.save" => vec!["id", "address"],
        "merchant.customer.address.delete" => vec!["id", "addressId", "revision"],
        "merchant.workflow.save" => vec!["revision", "data"],
        "merchant.product.content" | "merchant.product.assets" => vec!["id"],
        "merchant.product.save" => vec!["id", "product"],
        "merchant.asset.publish" => vec!["id", "digest", "public"],
        "merchant.customer" | "merchant.order" | "merchant.receipts" => vec!["id"],
        "merchant.customer.save" => vec!["id", "customer"],
        "merchant.order.transition" => vec!["id", "revision", "kind", "state"],
        "merchant.order.note" => vec!["id", "revision", "text"],
        "merchant.receipt.create" => vec!["id", "revision", "kind", "locale", "requestKey"],
        "merchant.payment" => vec!["id", "operation", "requestKey", "approve"],
        "developer.archive" => vec!["app", "archived", "approve"],
        "developer.import" => vec!["environment", "prompt", "summary", "manifest"],
        "developer.stage" => vec!["buildId", "digest", "approve"],
        "developer.task" => vec!["environment", "prompt", "agent"],
        "cart.replace" => vec!["revision", "items"],
        "catalog.detail" => vec!["productId"],
        "checkout.select" => vec!["revision", "checkout"],
        "checkout.complete" => vec!["idempotency_key"],
        "merchant.grid.plan" => vec!["entity", "instruction", "locale"],
        "merchant.plan" => vec!["instruction"],
        "merchant.apply" => vec!["task_id", "approve"],
        _ => vec![],
    };
    json!({"type":"object","properties":props,"required":required,"additionalProperties":false})
}
