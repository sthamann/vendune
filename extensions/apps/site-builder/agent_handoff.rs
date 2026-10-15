//! Coding agents edit the same page schema through credential-free tasks and explicit native review.
use super::*;
pub(super) async fn export(
    a: &App,
    h: &RequestContext,
    fields: &Value,
    v: &Value,
) -> Result<Value> {
    let tenant = merchant(a, h)?;
    let registry = apps::surfaces::registry(a, h, true).await?;
    let elements: Vec<_> = registry["surfaces"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|s| s["surface"]["location"] == "storefront.block")
        .take(64)
        .map(|s| json!({"app":s["app"],"surface":s["surface"]["id"],"label":s["surface"]["label"],"version":s["version"]}))
        .collect();
    let (settings, _) = commerce::config(a, &tenant).await?;
    Ok(
        json!({"agent":v["agent"],"task":format!("Edit this native Veyndo page in its private sandbox. Request: {}. Return the resultTemplate with content/theme edits only. Preserve all IDs, localized maps and product facts. If selected is nonempty, return only that block in content.blocks and preserve the theme. Use only the supplied registered app elements. No HTML/CSS/JS, copied code, secrets, direct writes or publication. Submit the returned JSON for merchant review through merchant.site.propose; only explicit merchant.site.apply may save the approved proposal. Publishing remains a separate selected release.",v["instruction"]),"resultTemplate":{"id":v["id"],"revision":v["revision"],"instruction":v["instruction"],"selected":v["selected"],"summary":"","fields":fields},"schema":{"content":{"blocks":"max 24; id, kind=hero/text/products/image/form/articles/app, text=localized map, rich=localized safe rich blocks, image=owned media, products=owned IDs, productMode=all/selected, fields=form fields; app kind requires extension={app,surface}"},"theme":{"accent":"#rrggbb","background":"#rrggbb","foreground":"#rrggbb","font":"sans/serif/mono","radius":"0..32","spacing":"12..96","columns":"1..4"}},"elements":elements,"locales":settings.locales,"mainLocale":settings.main_locale,"mcpEndpoint":"/mcp","mcpConfig":developer::agent_connection::configuration(&tenant)?,"credentials":"No credentials are exported. Configure your personal session locally; the Python bridge is optional client tooling only."}),
    )
}
pub(super) async fn propose(
    a: &App,
    h: &RequestContext,
    m: &apps::Manifest,
    entity: &apps::Entity,
    fields: &Value,
    v: &Value,
    instruction: &str,
) -> Result<Value> {
    let next = v["fields"].as_object().ok_or(bad("Return page fields"))?;
    for (key, value) in next {
        if !["content", "theme"].contains(&key.as_str()) && fields.get(key) != Some(value) {
            return Err(bad("Coding agent may change only content and theme"));
        }
    }
    let summary = v["summary"]
        .as_str()
        .filter(|s| !s.trim().is_empty() && s.len() <= 500)
        .ok_or(bad("Describe the proposed changes in 1..500 bytes"))?;
    let output = json!({"interpretation":summary,"variants":[{"summary":summary,"content_json":v["fields"]["content"].to_string(),"theme_json":v["fields"]["theme"].to_string()}]});
    let mut input = v.clone();
    input["style"] = json!(true);
    input["structure"] = json!(true);
    input["content"] = json!(true);
    super::proposals::prepare(
        a,
        h,
        m,
        entity,
        fields,
        &input,
        super::proposals::ResultContext {
            instruction,
            output: &output,
            sources: &json!([]),
            model: "external-coding-agent",
            usage: &json!({}),
        },
    )
    .await
}
