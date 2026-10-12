//! Reusable private/shared procurement lists; applying them reuses native cart admission and pricing.
use super::*;
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ListData {
    name: HashMap<String, String>,
    shared: bool,
    items: Vec<Item>,
}
pub(super) async fn invoke(a: &App, h: &RequestContext, op: &str, v: &Value) -> Result<Value> {
    let t = tenant(h)?;
    let unit = v["unitId"].as_str().ok_or(bad("Unit required"))?;
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "b2b.procurement").await?;
    let customer = identity(&mut tx, h).await?;
    history::customer_context(&mut tx, &customer).await?;
    let policy = access(&mut tx, &t, unit, &customer).await?;
    require(&policy, "lists")?;
    if op == "lists" {
        let rows=sqlx::query("SELECT id,data,revision,owner_id FROM b2b_lists WHERE tenant=$1 AND unit_id=$2 AND (owner_id=$3 OR data->>'shared'='true') ORDER BY id LIMIT 100")
            .bind(&t).bind(unit).bind(customer).fetch_all(&mut *tx).await?;
        return Ok(
            json!({"elements":rows.iter().map(|r|json!({"id":r.get::<String,_>("id"),"data":r.get::<Value,_>("data"),"revision":r.get::<i64,_>("revision"),"ownerId":r.get::<String,_>("owner_id")})).collect::<Vec<_>>()}),
        );
    }
    let id = v["id"]
        .as_str()
        .filter(|s| apps::identifier(s))
        .ok_or(bad("Valid list ID required"))?;
    let expected = v["revision"]
        .as_i64()
        .filter(|r| *r >= 0)
        .ok_or(bad("List revision required"))?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(format!("b2b:list:{t}:{id}"))
        .execute(&mut *tx)
        .await?;
    let row = sqlx::query(
        "SELECT unit_id,owner_id,data,revision FROM b2b_lists WHERE tenant=$1 AND id=$2 FOR UPDATE",
    )
    .bind(&t)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?;
    if let Some(r) = &row
        && (r.get::<String, _>("unit_id") != unit
            || (r.get::<String, _>("owner_id") != customer
                && r.get::<Value, _>("data")["shared"] != true))
    {
        return Err(Error(StatusCode::NOT_FOUND, "List not found".into()));
    }
    if row
        .as_ref()
        .map(|r| r.get::<i64, _>("revision"))
        .unwrap_or(0)
        != expected
    {
        return Err(conflict("List changed; reload before editing"));
    }
    if op == "list.apply" {
        let r = row.ok_or(Error(StatusCode::NOT_FOUND, "List not found".into()))?;
        let data: ListData =
            serde_json::from_value(r.get("data")).map_err(|_| bad("Invalid saved list"))?;
        tx.commit().await?;
        let c = load_cart(a, h).await?;
        if c.data.b2b.as_ref().is_none_or(|c| c.unit_id != unit) {
            return Err(bad("Select the list's purchasing unit before applying it"));
        }
        let expected = v["cartRevision"]
            .as_i64()
            .ok_or(bad("Current cart revision required"))?;
        let c = set_cart(a, h, data.items, Some(expected), None).await?;
        return cart_json(a, &c).await;
    }
    // Shared lists are readable by peers, but only their owner can edit/delete them.
    if row
        .as_ref()
        .is_some_and(|r| r.get::<String, _>("owner_id") != customer)
    {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Only the list owner may edit or delete it".into(),
        ));
    }
    if op == "list.delete" {
        if row.is_none() {
            return Err(Error(StatusCode::NOT_FOUND, "List not found".into()));
        }
        sqlx::query("DELETE FROM b2b_lists WHERE tenant=$1 AND id=$2")
            .bind(&t)
            .bind(id)
            .execute(&mut *tx)
            .await?;
    } else {
        let data: ListData =
            serde_json::from_value(v["data"].clone()).map_err(|_| bad("Invalid list fields"))?;
        let (settings, _) = commerce::scoped_locked(&mut tx, &t, marketing::channel_id(h)).await?;
        organization::name(&data.name, &settings)?;
        validate_items(&data.items)?;
        let ids: Vec<_> = data.items.iter().map(|i| i.id.clone()).collect();
        let count: i64 =
            sqlx::query_scalar("SELECT count(*) FROM products WHERE tenant=$1 AND id=ANY($2)")
                .bind(&t)
                .bind(ids)
                .fetch_one(&mut *tx)
                .await?;
        if count != data.items.len() as i64 {
            return Err(bad("List contains missing, duplicate or foreign products"));
        }
        sqlx::query("INSERT INTO b2b_lists(tenant,id,unit_id,owner_id,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(tenant,id) DO UPDATE SET data=excluded.data,revision=b2b_lists.revision+1").bind(&t).bind(id).bind(unit).bind(customer).bind(json!(data)).execute(&mut *tx).await?;
    }
    organization::event(
        &mut tx,
        &t,
        "b2b.list_changed",
        json!({"listId":id,"unitId":unit,"operation":op,"revision":expected+1}),
    )
    .await?;
    tx.commit().await?;
    Ok(json!({"id":id,"revision":expected+1,"deleted":op=="list.delete"}))
}
