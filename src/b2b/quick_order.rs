//! Bounded SKU bulk entry resolves native products then uses the ordinary cart's permissions, quantities and prices.
use super::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Line {
    sku: String,
    quantity: u32,
}
pub(super) async fn apply(a: &App, h: &RequestContext, v: &Value) -> Result<Value> {
    let c = load_cart(a, h).await?;
    let mut tx = a.db.begin().await?;
    let policy = guard_conn(&mut tx, h, &c)
        .await?
        .ok_or(bad("Select a company unit first"))?;
    require(&policy, "buy")?;
    let items = resolve(&mut tx, &c.tenant, &v["lines"]).await?;
    tx.commit().await?;
    let revision = v["revision"]
        .as_i64()
        .ok_or(bad("Cart revision required"))?;
    let c = set_cart(a, h, items, Some(revision), None).await?;
    cart_json(a, &c).await
}

pub(super) async fn resolve(
    conn: &mut sqlx::PgConnection,
    t: &str,
    value: &Value,
) -> Result<Vec<Item>> {
    let lines: Vec<Line> =
        serde_json::from_value(value.clone()).map_err(|_| bad("Expected SKU/quantity lines"))?;
    if lines.is_empty()
        || lines.len() > 100
        || lines
            .iter()
            .any(|l| l.sku.is_empty() || l.sku.len() > 100 || l.quantity == 0 || l.quantity > 10000)
    {
        return Err(bad("Enter 1..100 valid SKU lines with quantities 1..10000"));
    }
    let skus: Vec<_> = lines.iter().map(|l| l.sku.clone()).collect();
    let rows = sqlx::query(
        "SELECT id,product_number FROM products WHERE tenant=$1 AND product_number=ANY($2)",
    )
    .bind(t)
    .bind(skus)
    .fetch_all(conn)
    .await?;
    let mut items = Vec::new();
    for l in lines {
        let matching: Vec<_> = rows
            .iter()
            .filter(|r| r.get::<String, _>("product_number") == l.sku)
            .collect();
        if matching.len() != 1 {
            return Err(bad(format!("Unknown or ambiguous SKU: {}", l.sku)));
        }
        items.push(Item {
            id: matching[0].get("id"),
            quantity: l.quantity,
        });
    }
    Ok(items)
}
