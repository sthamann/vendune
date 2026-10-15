//! Shared HTTP/MCP capability dispatch and tool authorization.
use crate::*;

mod admission;
mod catalog;
mod contract;
pub(crate) use contract::ToolContract;
mod dispatch;
mod registry;
mod schema;
pub(crate) use registry::agent_reads;
pub(crate) use registry::{OPERATIONS, tool_schema};
pub(crate) async fn capabilities() -> Json<Value> {
    Json(
        json!({"capabilities":OPERATIONS.iter().map(|operation|operation.description()).collect::<Vec<_>>()}),
    )
}

/// Select a boxed domain future before polling it, keeping inactive domains off the worker stack.
pub(crate) fn invoke<'a>(
    a: &'a App,
    h: &'a RequestContext,
    name: &'a str,
    v: &'a Value,
) -> CapabilityFuture<'a> {
    if name.starts_with("app.") {
        return Box::pin(async move {
            let (id, action) = name
                .strip_prefix("app.")
                .unwrap()
                .split_once('.')
                .ok_or(bad("Invalid app capability name"))?;
            apps::invoke_app(a, h, id, action, v).await
        });
    }
    let Some(operation) = registry::find(name) else {
        return Box::pin(async { Err(bad("Unknown capability")) });
    };
    if !operation.admitted(a, h) {
        return Box::pin(async {
            Err(Error(
                StatusCode::FORBIDDEN,
                "Operation is not currently authorized".into(),
            ))
        });
    }
    if let Err(error) = apps::validate_native_input(&operation.input_schema(), v) {
        return Box::pin(async move { Err(error) });
    }
    operation.owner.invoke(a, h, name, v)
}

pub(super) type CapabilityFuture<'a> =
    std::pin::Pin<Box<dyn std::future::Future<Output = Result<Value>> + Send + 'a>>;

pub(super) async fn invoke_native(
    a: &App,
    h: &RequestContext,
    name: &str,
    v: &Value,
) -> Result<Value> {
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
            merchant(a, h)?;
            let (locale, _) = language_context(a, h).await?;
            let instruction = v["instruction"].as_str().unwrap_or("");
            if instruction.is_empty() || instruction.len() > 4000 {
                return Err(bad("Instruction must contain 1..4000 characters"));
            }
            let queued=agent_runs::enqueue(a,h,json!({"instruction":instruction,"locale":locale,"channel":marketing::channel_id(h)}),None).await?;
            let run = agent_runs::wait(a, h, queued["taskId"].as_str().unwrap()).await?;
            agent_runs::plan_result(run)
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
