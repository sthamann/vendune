//! Verified merchant overview facts consumed by the chat and activity views.
use super::*;
use axum::{extract::Request, middleware::Next};
pub(crate) mod facts;
mod revenue;

pub(super) async fn track_channels(State(a): State<App>, request: Request, next: Next) -> Response {
    let start = std::time::Instant::now();
    let path = request.uri().path();
    let channel = if path == "/mcp" {
        Some("mcp")
    } else if path.starts_with("/ucp/") {
        Some("ucp")
    } else if path.starts_with("/store-api/") {
        Some("storefront")
    } else if path.starts_with("/api/") && !path.starts_with("/api/platform/") {
        Some("api")
    } else if path == "/" && header(request.headers(), "x-tenant").is_some() {
        Some("frontend")
    } else {
        None
    };
    let t = tenant(request.headers()).ok();
    // MatchedPath is the router template, never a customer/object ID or query string.
    let route = request
        .extensions()
        .get::<axum::extract::MatchedPath>()
        .map(|p| p.as_str().to_owned())
        .unwrap_or_else(|| "<unmatched>".into());
    let method = request.method().clone();
    let response = next.run(request).await;
    if let (Some(channel), Some(t)) = (channel, t) {
        let failure = response.status().is_client_error() || response.status().is_server_error();
        if failure {
            eprintln!(
                "http_response tenant={t} channel={channel} method={method} route={route} status={}",
                response.status().as_u16()
            );
        }
        // Diagnostic counters are best-effort and do not delay commerce. They
        // count HTTP calls (including synthetic tests/admin reads), never people.
        a.channel_metrics.record(
            t,
            channel,
            response.status(),
            start.elapsed().as_millis().min(i64::MAX as u128) as i64,
        );
    }
    response
}
pub(super) async fn merchant_overview(
    State(a): State<App>,
    h: RequestContext,
    axum::extract::Query(criteria): axum::extract::Query<CatalogCriteria>,
) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    let (locale, chain) = language_context(&a, &h).await?;
    let commerce_read = auth::allowed(&h, "overview.read") || auth::allowed(&h, "orders.read");
    let mut facts = if commerce_read {
        facts::load(&a, &t).await?
    } else {
        json!({"summary":{"orders":0,"ordersToday":0,"pendingPlans":0,"appliedPlans":0,"revenue":null,"revenueByCurrency":[]},"orders":[],"timeline":[],"activity":[],"channels":[],"learningTimeline":[],"variants":[],"indexedProducts":0,"lastIndexed":null})
    };
    if !auth::allowed(&h, "knowledge.read") {
        facts["learningTimeline"] = json!([]);
        facts["variants"] = json!([]);
    }
    if !auth::allowed(&h, "assistant.use") {
        facts["summary"]["pendingPlans"] = json!(0);
        facts["summary"]["appliedPlans"] = json!(0);
        if let Some(activity) = facts["activity"].as_array_mut() {
            activity.retain(|e| e["kind"] == "order");
        }
    }
    let (ps, pagination) = if auth::allowed(&h, "catalog.read") {
        let page = product_page(&a, &t, &chain, &criteria).await?;
        (
            json!(page.products),
            json!({"nextCursor":page.next_cursor,"hasMore":page.next_cursor.is_some(),"limit":page.limit}),
        )
    } else {
        (
            json!([]),
            json!({"nextCursor":null,"hasMore":false,"limit":0}),
        )
    };
    let graph = if auth::allowed(&h, "knowledge.read") {
        knowledge::graph(&a.db, &t).await?
    } else {
        json!({"nodes":[],"edges":[]})
    };
    let (settings, _) = commerce::config(&a, &t).await?;
    let providers = if auth::allowed(&h, "assistant.use")
        || auth::allowed(&h, "developer.read")
        || auth::allowed(&h, "ai.manage")
    {
        a.inference.public_providers().await.map_err(bad)?
    } else {
        json!({"providers":[]})
    };
    Ok(Json(json!({
        "locale":locale,"tenant":t,"productCurrency":settings.currencies.pricing_currency,"dataMode":"synthetic-demo","products":ps,"productsPagination":pagination,
        "summary":facts["summary"],"orders":if auth::allowed(&h,"orders.read") {facts["orders"].clone()} else {json!([])},"timeline":facts["timeline"],
        "knowledge":{"graph":graph,"indexedProducts":if auth::allowed(&h,"knowledge.read") {facts["indexedProducts"].clone()} else {json!(0)},"lastIndexed":if auth::allowed(&h,"knowledge.read") {facts["lastIndexed"].clone()} else {Value::Null},"provenance":"curated-demo","modelWeightsLearn":false},
        "learning":{"timeline":facts["learningTimeline"],"variants":facts["variants"],"method":"epsilon-greedy with smoothed purchase rate","reward":"simulated order","causalUpliftProven":false},
        "activity":facts["activity"],"channels":facts["channels"],
        "connections":{"providers":providers["providers"],"chatgptAccountLinked":false,"claudeAccountLinked":false,"localMCPConfig":{"mcpServers":{"vendune":{"command":"python3","args":[env::current_dir().unwrap().join("scripts/mcp_stdio.py").to_string_lossy()],"env":{"COMMERCE_URL":"http://127.0.0.1:8787","COMMERCE_TENANT":t}}}},"localMCP":true,"ucpCheckout":true,"remoteOAuth":false},
        "capabilities":CAPABILITIES.iter().map(|(name,_)|name).collect::<Vec<_>>()
    })))
}
