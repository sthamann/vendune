//! Designer context projects native channels, languages and calculated products; no second catalogue or price engine.
use crate::*;
pub(super) fn router() -> Router<App> {
    Router::new().secure_route(
        "/api/merchant/site/context",
        &[("GET", "channels.read")],
        get(context),
    )
}
async fn context(
    State(a): State<App>,
    mut h: RequestContext,
    axum::extract::Query(q): axum::extract::Query<HashMap<String, String>>,
) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    auth::permit(&h, "catalog.read")?;
    let (settings, _) = commerce::config(&a, &t).await?;
    if let Some(locale) = q.get("locale") {
        if !settings.locales.contains(locale) {
            return Err(bad("Content language unavailable"));
        }
        h.insert(
            "x-commerce-locale",
            locale
                .parse()
                .map_err(|_| bad("Invalid content language"))?,
        );
    }
    let channel = q
        .get("channel")
        .filter(|s| s.as_str() != "*")
        .map(String::as_str)
        .unwrap_or("default");
    h.insert(
        "sw-sales-channel-id",
        channel.parse().map_err(|_| bad("Invalid channel"))?,
    );
    h.insert(
        "x-rac-channel-preview",
        channel.parse().map_err(|_| bad("Invalid channel"))?,
    );
    let rows =
        sqlx::query("SELECT id,data FROM sales_channels WHERE tenant=$1 ORDER BY id LIMIT 100")
            .bind(&t)
            .fetch_all(&a.db)
            .await?;
    let installed: Vec<String> =
        sqlx::query_scalar("SELECT id FROM app_packages WHERE tenant=$1 AND id=ANY($2) AND active")
            .bind(&t)
            .bind(vec!["site_builder", "site_forms"])
            .fetch_all(&a.db)
            .await?;
    let product_ids = q
        .get("ids")
        .map(|ids| serde_json::from_str::<Vec<String>>(ids).map_err(|_| bad("Invalid catalog IDs")))
        .transpose()?;
    let criteria = CatalogCriteria {
        limit: Some(if product_ids.is_some() { 100 } else { 24 }),
        product_ids,
        search: q.get("query").cloned(),
        after: q.get("after").cloned(),
        ..Default::default()
    };
    let Json(products) = catalog_page(State(a.clone()), h, criteria).await?;
    Ok(Json(
        json!({"channels":rows.iter().filter(|r|r.get::<Value,_>("data")["kind"]=="storefront").map(|r|json!({"id":r.get::<String,_>("id"),"data":r.get::<Value,_>("data")})).collect::<Vec<_>>(),"mainLocale":settings.main_locale,"locales":settings.locales,"installed":installed,"catalogue":products}),
    ))
}
