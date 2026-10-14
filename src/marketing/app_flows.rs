//! App flow dispatch uses the same permission/schema gateway as HTTP/MCP, with a stable job key.
use super::*;
pub(super) fn validate_manifest_flow(
    h: &RequestContext,
    f: &flows::Flow,
    m: &apps::Manifest,
) -> Result<()> {
    auth::permit(h, "apps.manage")?;
    let target = f
        .app_action
        .as_ref()
        .ok_or(bad("Flow app action required"))?;
    let act = m
        .actions
        .iter()
        .find(|x| x.name == target.action)
        .ok_or(bad("Unknown flow app action"))?;
    eligible(act)?;
    auth::permit(h, act.permission.as_deref().unwrap_or("catalog"))?;
    let args = arguments(
        act,
        &target.arguments,
        "schema-check",
        "schema-check",
        &if ["order.", "delivery.", "document.", "payment.", "pos."]
            .iter()
            .any(|prefix| f.event.starts_with(prefix))
        {
            json!({"orderId":"00000000000000000000000000000000"})
        } else {
            json!({})
        },
        &f.event,
    );
    apps::validate_input(&act.input_schema, &args)
}
fn arguments(
    action: &apps::Action,
    base: &Value,
    key: &str,
    instruction: &str,
    event: &Value,
    kind: &str,
) -> Value {
    let mut args = base.clone();
    let props = &action.input_schema["properties"];
    // Native order-bound events supply their canonical ID; explicit non-empty
    // merchant arguments remain unchanged. No string interpolation or AI identity.
    if props.get("orderId").is_some()
        && args["orderId"].as_str().is_none_or(str::is_empty)
        && let Some(id) = event["orderId"].as_str().filter(|id| !id.is_empty())
    {
        args["orderId"] = json!(id);
    }
    if props.get("kind").is_some() {
        args["kind"] = json!(kind);
    }
    if props.get("requestKey").is_some() {
        args["requestKey"] = json!(key);
    }
    if props.get("event").is_some() {
        args["event"] = event.clone();
    }
    if props.get("template").is_some() && args.get("template").is_none() {
        args["template"] = json!(instruction);
    }
    args
}
pub(crate) async fn execute_app_flow(
    a: &App,
    t: &str,
    f: &flows::Flow,
    id: &str,
    instruction: &str,
    definition: &Value,
) -> Result<Value> {
    let target = f
        .app_action
        .as_ref()
        .ok_or(bad("Flow app action required"))?;
    let mut h = super::flow_access::headers(a, t, f.actor.as_deref()).await?;
    h.insert(
        "idempotency-key",
        format!("flow-{id}")
            .parse()
            .map_err(|_| bad("Invalid flow job identity"))?,
    );
    auth::permit(&h, "automation.manage")?;
    auth::permit(&h, "apps.manage")?;
    let m = apps::package(a, t, &target.app, true).await?;
    let act = m
        .actions
        .iter()
        .find(|x| x.name == target.action)
        .ok_or(bad("Unknown flow app action"))?;
    eligible(act)?;
    let event = if definition["orderId"]
        .as_str()
        .is_some_and(|s| !s.is_empty())
    {
        json!({"order":definition["orderSnapshot"],"orderId":definition["orderId"]})
    } else {
        definition["eventContext"].clone()
    };
    let args = arguments(act, &target.arguments, id, instruction, &event, &f.event);
    apps::invoke_app(a, &h, &target.app, &target.action, &args).await
}

fn eligible(action: &apps::Action) -> Result<()> {
    if !veyndo::verified_kernel::app_flow_admissible(
        action.flow_allowed,
        action.read_only,
        action.public,
    ) {
        return Err(bad("Action is not eligible for flows"));
    }
    Ok(())
}
