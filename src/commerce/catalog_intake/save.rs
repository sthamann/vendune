//! One explicit sandbox-only product creation delegates to native CAS/history/outbox; stable IDs reconcile retries without overwrites.
use super::*;
pub(super) async fn save(
    a: &App,
    h: &RequestContext,
    t: &str,
    s: &commerce::Settings,
    v: &Value,
) -> Result<Value> {
    if staging::parent(a, t).await?.is_none() {
        return Err(bad(
            "Catalogue intake saves require a private sandbox; live products were not changed",
        ));
    }
    if v["approve"] != true {
        return Err(bad("Review and explicitly approve the product draft"));
    }
    if v["mainLocale"] != s.main_locale || v["currency"] != s.currencies.base_currency {
        return Err(conflict(
            "Catalogue language or currency changed; prepare fresh drafts",
        ));
    }
    let id = v["id"]
        .as_str()
        .filter(|s| Uuid::parse_str(s).is_ok())
        .ok_or(bad("Stable product UUID required"))?;
    let draft: Draft =
        serde_json::from_value(v["draft"].clone()).map_err(|_| bad("Invalid product draft"))?;
    draft.validate()?;
    let rate = v["taxRate"]
        .as_f64()
        .filter(|r| r.is_finite() && (0.0..=50.0).contains(r))
        .ok_or(bad("Review the product tax rate"))?;
    let digest = hash(&v.to_string());
    let existing: Option<Value> =
        sqlx::query_scalar("SELECT extra FROM products WHERE tenant=$1 AND id=$2")
            .bind(t)
            .bind(id)
            .fetch_optional(&a.db)
            .await?;
    if let Some(extra) = existing {
        if extra["identity"]["catalogIntakeDigest"] == digest {
            return Ok(json!({"id":id,"saved":true,"replayed":true}));
        }
        return Err(conflict(
            "Product ID already exists; no existing product was overwritten",
        ));
    }
    let locale = super::super::product_languages::key(&s.main_locale, s);
    let media = if draft.image_url.is_empty() {
        json!([])
    } else {
        public_client(
            &reqwest::Url::parse(&draft.image_url).map_err(|_| bad("Invalid image URL"))?,
        )
        .await?;
        json!([{"id":format!("intake-{id}"),"url":draft.image_url,"view":"","alt":{}}])
    };
    let payload = json!({"id":id,"revision":0,"settingsRevision":v["settingsRevision"],"translations":{locale:{"name":draft.name,"description":draft.description}},"extra":{"priceCurrency":s.currencies.base_currency,"demo":v["demo"],"identity":{"catalogIntakeDigest":digest}},"catalog":{"active":true,"productNumber":if draft.product_number.is_empty(){format!("IMPORT-{id}")}else{draft.product_number},"categoryIds":["catalog-root"],"options":{}},"commerce":{"price":draft.price,"taxRate":rate,"stock":if v["demo"]==true{20}else{0},"minPurchase":1,"purchaseSteps":1,"maxPurchase":null,"deliveryDays":0,"listPrice":null,"advancedPrices":[],"media":media,"properties":{}}});
    let Json(result) = commerce::create_product(State(a.clone()), h.clone(), Json(payload)).await?;
    Ok(result)
}
