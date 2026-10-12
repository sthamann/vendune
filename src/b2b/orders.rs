//! Explicit unit-wide order permission reuses the customer-safe order projection; no email-based ownership.
use super::*;
pub(super) async fn read(a: &App, h: &RequestContext, v: &Value) -> Result<Value> {
    let t = tenant(h)?;
    let unit = v["unitId"].as_str().ok_or(bad("Unit required"))?;
    let (machine, _) = commerce::machine(&a.db, &t).await?;
    let mut tx = a.db.begin().await?;
    let customer = identity(&mut tx, h).await?;
    let policy = access(&mut tx, &t, unit, &customer).await?;
    require(&policy, "companyOrders")?;
    let id = v["id"].as_str();
    let rows=sqlx::query("SELECT data,created_at::text AS created FROM orders WHERE tenant=$1 AND data->'b2b'->>'unitId'=$2 AND ($3::text IS NULL OR id=$3) ORDER BY created_at DESC,id DESC LIMIT 100").bind(&t).bind(unit).bind(id).fetch_all(&mut *tx).await?;
    if id.is_some() && rows.is_empty() {
        return Err(Error(
            StatusCode::NOT_FOUND,
            "Order not found in this unit".into(),
        ));
    }
    let elements: Vec<Value> = rows
        .iter()
        .map(|r| {
            let raw: Value = r.get("data");
            let mut p = accounts::project_order(&raw, &r.get::<String, _>("created"));
            p["b2b"] = raw["b2b"].clone();
            p
        })
        .collect();
    let labels = json!(
        machine
            .states
            .iter()
            .map(|s| (&s.id, &s.label))
            .collect::<HashMap<_, _>>()
    );
    let receipts = if let Some(id) = id {
        sqlx::query("SELECT id,kind,number,locale,created_at::text AS created FROM order_receipts WHERE tenant=$1 AND order_id=$2 ORDER BY created_at DESC LIMIT 100").bind(&t).bind(id).fetch_all(&mut *tx).await?
    } else {
        vec![]
    };
    let elements:Vec<Value>=elements.into_iter().map(|mut p|{p["stateLabels"]=labels.clone();if let Some(id)=id {p["receipts"]=json!(receipts.iter().map(|r|json!({"id":r.get::<String,_>("id"),"kind":r.get::<String,_>("kind"),"number":r.get::<String,_>("number"),"locale":r.get::<String,_>("locale"),"createdAt":r.get::<String,_>("created"),"pdfPath":format!("/store-api/b2b/units/{unit}/orders/{id}/receipts/{}/pdf",r.get::<String,_>("id"))})).collect::<Vec<_>>());}p}).collect();
    Ok(json!({"elements":elements}))
}
pub(super) async fn receipt(
    State(a): State<App>,
    h: RequestContext,
    Path((unit, id, receipt)): Path<(String, String, String)>,
) -> Result<Response> {
    read(&a, &h, &json!({"unitId":unit,"id":id})).await?;
    let snapshot: Value = sqlx::query_scalar(
        "SELECT snapshot FROM order_receipts WHERE tenant=$1 AND order_id=$2 AND id=$3",
    )
    .bind(tenant(&h)?)
    .bind(id)
    .bind(receipt)
    .fetch_optional(&a.db)
    .await?
    .ok_or(Error(StatusCode::NOT_FOUND, "Receipt not found".into()))?;
    Ok(crate::operations::receipt_response(&snapshot))
}
