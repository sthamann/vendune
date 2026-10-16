//! International configuration and translation MCP tools call the exact same scoped native handlers as HTTP.
use super::*;
pub(crate) fn international_permission(name: &str) -> Option<&'static str> {
    match name {
        "merchant.commerce.read" | "merchant.commerce.dependencies" => Some("settings.read"),
        "merchant.commerce.save" => Some("settings.write"),
        "merchant.translations.list" | "merchant.translations.detail" => Some("catalog.read"),
        "merchant.translations.create"
        | "merchant.translations.control"
        | "merchant.translations.apply" => Some("catalog.write"),
        _ => None,
    }
}
pub(crate) async fn international_invoke(
    a: &App,
    h: &RequestContext,
    name: &str,
    v: &Value,
) -> Result<Value> {
    auth::permit(
        h,
        international_permission(name).ok_or(bad("Unknown international capability"))?,
    )?;
    let state = State(a.clone());
    let headers = h.clone();
    let id = || {
        v["id"]
            .as_str()
            .map(String::from)
            .ok_or(bad("Translation ID required"))
    };
    let Json(result) = match name {
        "merchant.commerce.read" => {
            if let Some(channel) = v["channelId"].as_str() {
                get_scope(state, headers, Path(channel.into())).await?
            } else {
                merchant_config(state, headers).await?
            }
        }
        "merchant.commerce.dependencies" => {
            method_dependencies(
                state,
                headers,
                Path((
                    v["area"]
                        .as_str()
                        .ok_or(bad("Method area required"))?
                        .into(),
                    v["methodId"]
                        .as_str()
                        .ok_or(bad("Method ID required"))?
                        .into(),
                )),
            )
            .await?
        }
        "merchant.commerce.save" => {
            if let Some(channel) = v["channelId"].as_str() {
                save_scope(state, headers, Path(channel.into()), Json(v.clone())).await?
            } else {
                save_config(state, headers, Json(v.clone())).await?
            }
        }
        "merchant.translations.list" => translations::list(state, headers).await?,
        "merchant.translations.create" => {
            translations::create(state, headers, Json(v.clone())).await?
        }
        "merchant.translations.detail" => {
            translations::detail(
                state,
                headers,
                Path(id()?),
                axum::extract::Query(HashMap::from([(
                    "cursor".into(),
                    v["cursor"].as_str().unwrap_or("").into(),
                )])),
            )
            .await?
        }
        "merchant.translations.control" => {
            translations::control(
                state,
                headers,
                Path(id()?),
                Json(json!({"action":v["action"]})),
            )
            .await?
        }
        "merchant.translations.apply" => {
            translations::apply(
                state,
                headers,
                Path(id()?),
                Json(json!({"productId":v["productId"]})),
            )
            .await?
        }
        _ => return Err(bad("Unknown international capability")),
    };
    if name == "merchant.commerce.read" && v["area"] == "aiPolicy" {
        return Ok(price_policy_view(&result, v["afterProductId"].as_str()));
    }
    Ok(result)
}
/// Small native projection for the existing MCP/planner read, preserving exact amounts and pagination.
fn price_policy_view(snapshot: &Value, after: Option<&str>) -> Value {
    let data = &snapshot["data"];
    let mut rows = data["aiPolicy"]["corridors"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    rows.sort_by(|a, b| a["productId"].as_str().cmp(&b["productId"].as_str()));
    let total = rows.len();
    let remaining = rows
        .iter()
        .filter(|r| {
            after.is_none_or(|cursor| r["productId"].as_str().is_some_and(|id| id > cursor))
        })
        .collect::<Vec<_>>();
    let page = remaining.iter().take(8).copied().collect::<Vec<_>>();
    let definitions = data["currencies"]["definitions"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|c| {
            page.iter().any(|r| r["currency"] == c["code"])
                || c["code"] == data["currencies"]["pricingCurrency"]
        })
        .map(|c| json!({"code":c["code"],"scale":c["scale"]}))
        .collect::<Vec<_>>();
    json!({"revision":snapshot["revision"],"data":{"aiPolicy":{"autonomy":data["aiPolicy"]["autonomy"],"corridors":page},"currencies":{"pricingCurrency":data["currencies"]["pricingCurrency"],"definitions":definitions}},"totalCorridors":total,"nextAfterProductId":if remaining.len()>8 {page.last().map(|r|r["productId"].clone()).unwrap_or(Value::Null)} else {Value::Null}})
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ai_policy_read_projection_is_paged_exact_and_omits_unrelated_settings() {
        let rows = (0..19).rev().map(|i| json!({"productId":format!("product-{i:03}"),"currency":"KWD","minimumMinor":12345,"maximumMinor":23456,"minimumMarginBps":1234})).collect::<Vec<_>>();
        let snapshot = json!({"revision":7,"data":{"unrelated":"private setting","aiPolicy":{"autonomy":{"enabled":false,"maxChangeBps":500,"productsPerDay":20},"corridors":rows},"currencies":{"pricingCurrency":"EUR","definitions":[{"code":"EUR","scale":2,"name":"Euro"},{"code":"KWD","scale":3},{"code":"JPY","scale":0}]}}});
        let first = price_policy_view(&snapshot, None);
        assert_eq!(first["revision"], 7);
        assert_eq!(first["totalCorridors"], 19);
        assert_eq!(
            first["data"]["aiPolicy"]["corridors"]
                .as_array()
                .unwrap()
                .len(),
            8
        );
        assert_eq!(first["nextAfterProductId"], "product-007");
        assert_eq!(
            first["data"]["aiPolicy"]["corridors"][0]["minimumMinor"],
            12345
        );
        assert_eq!(
            first["data"]["currencies"]["definitions"],
            json!([{"code":"EUR","scale":2},{"code":"KWD","scale":3}])
        );
        assert!(first["data"].get("unrelated").is_none());
        assert!(first.to_string().len() < 6000);
        let second = price_policy_view(&snapshot, first["nextAfterProductId"].as_str());
        assert_eq!(
            second["data"]["aiPolicy"]["corridors"][0]["productId"],
            "product-008"
        );
        let last = price_policy_view(&snapshot, second["nextAfterProductId"].as_str());
        assert_eq!(
            last["data"]["aiPolicy"]["corridors"]
                .as_array()
                .unwrap()
                .len(),
            3
        );
        assert!(last["nextAfterProductId"].is_null());
    }
}
