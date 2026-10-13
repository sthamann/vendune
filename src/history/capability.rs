//! HTTP/MCP parity for history; per-entity read/write scopes are checked again at invocation time.
use super::*;
pub(crate) fn schema(name: &str) -> Option<Value> {
    if name == "merchant.customer.groups" {
        return Some(json!({"type":"object","properties":{},"additionalProperties":false}));
    }
    if ![
        "merchant.history",
        "merchant.history.version",
        "merchant.history.restore",
    ]
    .contains(&name)
    {
        return None;
    }
    let mut props = json!({"entity":{"type":"string","enum":["role","product","category","customer","order","settings","company","companyChannel","checkoutChannel","rule","flow","promotion","channel","source","b2bCompany","b2bUnit","b2bQuote","b2bList","b2bApproval"]},"id":{"type":"string","minLength":1,"maxLength":254}});
    let mut required = vec!["entity", "id"];
    if name == "merchant.history" {
        props["before"] = json!({"type":"integer"});
    } else {
        props["version"] = json!({"type":"integer","minimum":1});
        required.push("version");
    }
    if name == "merchant.history.restore" {
        props["approve"] = json!({"type":"boolean","const":true});
        props["revision"] = json!({"type":"integer","minimum":0});
        props["side"] = json!({"type":"string","enum":["before","after"]});
        required.extend(["approve", "revision", "side"]);
    }
    Some(
        json!({"type":"object","properties":props,"required":required,"additionalProperties":false}),
    )
}
pub(crate) fn visible(h: &RequestContext, name: &str) -> bool {
    if name == "merchant.customer.groups" {
        return auth::permit(h, "customers.read").is_ok()
            || auth::permit(h, "settings.read").is_ok();
    }
    let scopes = if name == "merchant.history.restore" {
        vec![
            "catalog.write",
            "customers.write",
            "settings.write",
            "team.manage",
            "channels.manage",
            "automation.manage",
            "knowledge.write",
        ]
    } else {
        vec![
            "team.manage",
            "channels.read",
            "automation.read",
            "catalog.read",
            "customers.read",
            "settings.read",
            "orders.read",
            "knowledge.read",
        ]
    };
    scopes.iter().any(|p| auth::permit(h, p).is_ok())
        || (auth::allowed(h, "customers.pii")
            && auth::allowed(
                h,
                if name == "merchant.history.restore" {
                    "b2b.manage"
                } else {
                    "b2b.read"
                },
            ))
}
pub(crate) async fn invoke(a: &App, h: &RequestContext, name: &str, v: &Value) -> Result<Value> {
    let Json(value) = if name == "merchant.customer.groups" {
        commerce::groups(State(a.clone()), h.clone()).await?
    } else {
        let entity = v["entity"]
            .as_str()
            .ok_or(bad("entity required"))?
            .to_string();
        let id = v["id"].as_str().ok_or(bad("id required"))?.to_string();
        match name {
            "merchant.history" => {
                routes::list(
                    State(a.clone()),
                    h.clone(),
                    Path((entity, id)),
                    axum::extract::Query(routes::Page {
                        before: v["before"].as_i64(),
                    }),
                )
                .await?
            }
            "merchant.history.version" => {
                routes::detail(
                    State(a.clone()),
                    h.clone(),
                    Path((
                        entity,
                        id,
                        v["version"].as_i64().ok_or(bad("version required"))?,
                    )),
                )
                .await?
            }
            "merchant.history.restore" => {
                routes::restore(
                    State(a.clone()),
                    h.clone(),
                    Path((
                        entity,
                        id,
                        v["version"].as_i64().ok_or(bad("version required"))?,
                    )),
                    Json(v.clone()),
                )
                .await?
            }
            _ => return Err(bad("Unknown history operation")),
        }
    };
    Ok(value)
}
