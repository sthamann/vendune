//! Explicit integration permission imports requisitions into native lists; it never impersonates checkout buyers.
use super::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Input {
    name: HashMap<String, String>,
    lines: Value,
    #[serde(default)]
    currency: Option<String>,
}
pub(super) async fn import(a: &App, h: &RequestContext, v: &Value) -> Result<Value> {
    let t = merchant(a, h)?;
    auth::permit(h, "b2b.manage")?;
    let unit = v["unitId"]
        .as_str()
        .ok_or(bad("Purchasing unit required"))?;
    let buyer = v["customerId"]
        .as_str()
        .ok_or(bad("Mapped buyer required"))?;
    let id = v["id"]
        .as_str()
        .filter(|s| apps::identifier(s))
        .ok_or(bad("Valid requisition ID required"))?;
    let data: Input = serde_json::from_value(v["data"].clone())
        .map_err(|_| bad("Expected requisition name and SKU lines"))?;
    let (settings, _) = commerce::config(a, &t).await?;
    organization::name(&data.name, &settings)?;
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "b2b.requisition").await?;
    let policy = access(&mut tx, &t, unit, buyer).await?;
    require(&policy, "lists")?;
    require(&policy, "buy")?;
    if data
        .currency
        .as_deref()
        .is_some_and(|c| c != policy.unit.currency)
    {
        return Err(bad("Document currency differs from mapped purchasing unit"));
    }
    let items = quick_order::resolve(&mut tx, &t, &data.lines).await?;
    validate_items(&items)?;
    for item in &items {
        catalog::admit_unit(&mut tx, &t, unit, &item.id, &policy).await?;
    }
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(format!("b2b:list:{t}:{id}"))
        .execute(&mut *tx)
        .await?;
    let normalized = json!({"name":data.name,"shared":false,"items":items});
    if let Some(row) = sqlx::query(
        "SELECT owner_id,unit_id,data,revision FROM b2b_lists WHERE tenant=$1 AND id=$2 FOR UPDATE",
    )
    .bind(&t)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    {
        if row.get::<String, _>("owner_id") != buyer
            || row.get::<String, _>("unit_id") != unit
            || row.get::<Value, _>("data") != normalized
        {
            return Err(conflict("Requisition ID already has different content"));
        }
        return Ok(json!({"id":id,"revision":row.get::<i64,_>("revision"),"replayed":true}));
    }
    sqlx::query("INSERT INTO b2b_lists(tenant,id,unit_id,owner_id,data)VALUES($1,$2,$3,$4,$5)")
        .bind(&t)
        .bind(id)
        .bind(unit)
        .bind(buyer)
        .bind(normalized)
        .execute(&mut *tx)
        .await?;
    organization::event(
        &mut tx,
        &t,
        "b2b.list_changed",
        json!({"id":id,"unitId":unit,"revision":1}),
    )
    .await?;
    tx.commit().await?;
    Ok(json!({"id":id,"revision":1,"replayed":false}))
}
