//! Shared HTTP/MCP capability dispatch and tool authorization.
use crate::*;

mod catalog;
pub(crate) use catalog::CAPABILITIES;
pub(crate) async fn capabilities() -> Json<Value> {
    Json(
        json!({"capabilities":CAPABILITIES.iter().map(|(n,d)|json!({"name":n,"description":d})).collect::<Vec<_>>()}),
    )
}

/// Select a boxed domain future before polling it, keeping inactive domains off the worker stack.
pub(crate) fn invoke<'a>(
    a: &'a App,
    h: &'a RequestContext,
    name: &'a str,
    v: &'a Value,
) -> CapabilityFuture<'a> {
    if name.starts_with("b2b.") {
        // Keep only the selected domain's suspended state on the heap.
        return Box::pin(b2b::invoke(a, h, name, v));
    }
    if let Some(operation) = name.strip_prefix("pos.") {
        return Box::pin(pos::invoke(a, h, operation, v));
    }
    if name == "catalog.facts" {
        return Box::pin(async move {
            cognition::signed::facts(
                a,
                h,
                v["productId"].as_str().ok_or(bad("Product required"))?,
            )
            .await
        });
    }
    if cognition::contracts::schema(name).is_some() {
        return Box::pin(cognition::contracts::invoke_contract(a, h, name, v));
    }
    if currencies::schema(name).is_some() {
        return Box::pin(currencies::invoke(a, h, name, v));
    }
    if legal::schema(name).is_some() {
        return Box::pin(legal::invoke(a, h, name, v));
    }
    if history::schema(name).is_some() {
        return Box::pin(history::invoke(a, h, name, v));
    }
    if name.starts_with("merchant.media.") {
        return Box::pin(assets::media_invoke(a, h, name, v));
    }
    if commerce::international_permission(name).is_some() {
        return Box::pin(commerce::international_invoke(a, h, name, v));
    }
    if name.starts_with("automation.") {
        return Box::pin(marketing::invoke(a, h, name, v));
    }
    if operations::permission(name).is_some() {
        return Box::pin(operations::invoke(a, h, name, v));
    }
    if name.starts_with("developer.") {
        return Box::pin(developer::invoke(a, h, name, v));
    }
    if let Some(app) = name.strip_prefix("app.") {
        return Box::pin(async move {
            let (id, action) = app
                .split_once('.')
                .ok_or(bad("Invalid app capability name"))?;
            apps::invoke_app(a, h, id, action, v).await
        });
    }
    if documents::knowledge_schema(name).is_some() {
        return Box::pin(documents::knowledge_invoke(a, h, name, v));
    }
    Box::pin(invoke_native(a, h, name, v))
}
type CapabilityFuture<'a> =
    std::pin::Pin<Box<dyn std::future::Future<Output = Result<Value>> + Send + 'a>>;

async fn invoke_native(a: &App, h: &RequestContext, name: &str, v: &Value) -> Result<Value> {
    if name.starts_with("knowledge.") {
        merchant(a, h)?;
        auth::permit(h, "knowledge.read")?;
    }
    if name == "merchant.apply" {
        auth::permit(h, "catalog")?;
    }
    match name {
        "catalog.search" => {
            let criteria =
                serde_json::from_value(v.clone()).map_err(|_| bad("Invalid catalog criteria"))?;
            let Json(result) = catalog_page(State(a.clone()), h.clone(), criteria).await?;
            Ok(result)
        }
        "catalog.detail" => {
            let criteria =
                serde_json::from_value(v.clone()).map_err(|_| bad("Invalid variant criteria"))?;
            let Json(v) = commerce::product_detail(
                State(a.clone()),
                h.clone(),
                Path(
                    v["productId"]
                        .as_str()
                        .ok_or(bad("Product ID required"))?
                        .into(),
                ),
                axum::extract::Query(criteria),
            )
            .await?;
            Ok(v)
        }
        "checkout.options" => {
            let Json(v) = commerce::options(State(a.clone()), h.clone()).await?;
            Ok(v)
        }
        "checkout.select" => {
            let Json(v) =
                commerce::select_checkout(State(a.clone()), h.clone(), Json(v.clone())).await?;
            Ok(v)
        }
        "knowledge.external" => Ok(
            json!({"elements":apps::private_evidence(a,&tenant(h)?,v["query"].as_str().unwrap_or("")).await?}),
        ),
        "knowledge.graph" => Ok(knowledge::graph(&a.db, &tenant(h)?).await?),
        "knowledge.search" => retrieve(a, &tenant(h)?, v["query"].as_str().unwrap_or("")).await,
        "cart.create" => {
            let c = new_cart_context(a, h, v["session"].as_str().unwrap_or(""), "mcp").await?;
            cart_json(a, &c).await
        }
        "cart.quote" => cart_json(a, &load_cart(a, h).await?).await,
        "cart.replace" => {
            let i = serde_json::from_value(v["items"].clone()).map_err(|e| bad(e.to_string()))?;
            let c = set_items(
                a,
                h,
                i,
                Some(v["revision"].as_i64().ok_or(bad("revision required"))?),
            )
            .await?;
            cart_json(a, &c).await
        }
        "checkout.complete" => {
            checkout(
                a,
                h,
                v["idempotency_key"]
                    .as_str()
                    .ok_or(bad("idempotency_key required"))?,
            )
            .await
        }
        "merchant.plan" => {
            auth::permit(h, "knowledge.read")?;
            let t = merchant(a, h)?;
            let (locale, _) = language_context(a, h).await?;
            let instruction = v["instruction"].as_str().unwrap_or("");
            if instruction.is_empty() || instruction.len() > 4000 {
                return Err(bad("Instruction must contain 1..4000 characters"));
            }
            performance::reserve_ai_attempt(a, &t).await?;
            plan_with(a, &t, instruction, None, "", &locale, h).await
        }
        "merchant.apply" => {
            let t = merchant(a, h)?;
            if v["approve"] != true {
                return Err(bad("approve=true required"));
            }
            apply(
                a,
                &t,
                v["task_id"].as_str().ok_or(bad("task_id required"))?,
                h,
            )
            .await
        }
        "merchant.orders" => {
            let Json(v) = orders(State(a.clone()), h.clone()).await?;
            Ok(v)
        }
        _ => Err(bad("Unknown capability")),
    }
}
