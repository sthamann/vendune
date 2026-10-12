//! Revision-bound purchasing approval inbox; approvers must be active peers and cannot approve themselves.
use super::*;
pub(super) async fn request(a: &App, h: &RequestContext, v: &Value) -> Result<Value> {
    let c = load_cart(a, h).await?;
    let context = c
        .data
        .b2b
        .as_ref()
        .ok_or(bad("Select a company unit first"))?;
    if c.status != "open" || c.data.items.is_empty() {
        return Err(bad("Open nonempty cart required"));
    }
    if v["revision"].as_i64() != Some(c.revision) {
        return Err(conflict("Cart changed; reload before requesting approval"));
    }
    let mut q = cart_json(a, &c).await?;
    if let Some(snapshot) = q.as_object_mut() {
        snapshot.remove("token");
    }
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "b2b.procurement").await?;
    let revision: i64 = sqlx::query_scalar(
        "SELECT revision FROM carts WHERE tenant=$1 AND id=$2 AND status='open' FOR UPDATE",
    )
    .bind(&c.tenant)
    .bind(&c.id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(conflict("Cart is terminal"))?;
    if revision != c.revision {
        return Err(conflict("Cart changed; reload before requesting approval"));
    }
    let policy = guard_conn(&mut tx, h, &c)
        .await?
        .ok_or(bad("Company context required"))?;
    require(&policy, "buy")?;
    history::customer_context(&mut tx, &context.customer_id).await?;
    catalog_guard(&mut tx, &c, &policy).await?;
    let digest = purchase::fingerprint(&c, &q, &policy.version);
    let id = uid();
    let data = json!({"quote":q,"buyerId":context.customer_id,"unitId":context.unit_id,"policyVersion":policy.version});
    sqlx::query("INSERT INTO b2b_approvals(tenant,id,unit_id,buyer_id,cart_id,fingerprint,data) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(tenant,cart_id,fingerprint) DO NOTHING").bind(&c.tenant).bind(&id).bind(&context.unit_id).bind(&context.customer_id).bind(&c.id).bind(&digest).bind(data).execute(&mut *tx).await?;
    let r=sqlx::query("SELECT id,state,revision FROM b2b_approvals WHERE tenant=$1 AND cart_id=$2 AND fingerprint=$3").bind(&c.tenant).bind(&c.id).bind(digest).fetch_one(&mut *tx).await?;
    let actual: String = r.get("id");
    if actual == id {
        organization::event(
            &mut tx,
            &c.tenant,
            "b2b.approval_requested",
            json!({"approvalId":id,"unitId":context.unit_id}),
        )
        .await?;
    }
    tx.commit().await?;
    Ok(
        json!({"id":actual,"state":r.get::<String,_>("state"),"revision":r.get::<i64,_>("revision")}),
    )
}
pub(super) async fn inbox(a: &App, h: &RequestContext, v: &Value) -> Result<Value> {
    let t = tenant(h)?;
    let unit = v["unitId"].as_str().ok_or(bad("Unit required"))?;
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "b2b.procurement").await?;
    let customer = identity(&mut tx, h).await?;
    history::customer_context(&mut tx, &customer).await?;
    let policy = access(&mut tx, &t, unit, &customer).await?;
    let approver = policy.member.allows("approve");
    let rows=sqlx::query("SELECT id,buyer_id,state,data,revision,created_at::text AS created FROM b2b_approvals WHERE tenant=$1 AND unit_id=$2 AND ($3 OR buyer_id=$4) ORDER BY created_at DESC LIMIT 100").bind(&t).bind(unit).bind(approver).bind(customer).fetch_all(&mut *tx).await?;
    Ok(
        json!({"elements":rows.iter().map(|r|json!({"id":r.get::<String,_>("id"),"buyerId":r.get::<String,_>("buyer_id"),"state":r.get::<String,_>("state"),"data":r.get::<Value,_>("data"),"revision":r.get::<i64,_>("revision"),"createdAt":r.get::<String,_>("created")})).collect::<Vec<_>>()}),
    )
}
pub(super) async fn decide(a: &App, h: &RequestContext, v: &Value) -> Result<Value> {
    let t = tenant(h)?;
    let id = v["id"].as_str().ok_or(bad("Approval required"))?;
    let target = v["state"]
        .as_str()
        .filter(|s| ["approved", "rejected"].contains(s))
        .ok_or(bad("Approve or reject required"))?;
    let revision = v["revision"]
        .as_i64()
        .ok_or(bad("Approval revision required"))?;
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "b2b.procurement").await?;
    let customer = identity(&mut tx, h).await?;
    history::customer_context(&mut tx, &customer).await?;
    // Unit first matches checkout's lock order; no approval->unit deadlock.
    let unit: Option<String> =
        sqlx::query_scalar("SELECT unit_id FROM b2b_approvals WHERE tenant=$1 AND id=$2")
            .bind(&t)
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?;
    let unit = unit.ok_or(Error(StatusCode::NOT_FOUND, "Approval not found".into()))?;
    sqlx::query("SELECT id FROM b2b_units WHERE tenant=$1 AND id=$2 FOR UPDATE")
        .bind(&t)
        .bind(&unit)
        .fetch_one(&mut *tx)
        .await?;
    let policy = access(&mut tx, &t, &unit, &customer).await?;
    require(&policy, "approve")?;
    let r = sqlx::query(
        "SELECT buyer_id,state,revision FROM b2b_approvals WHERE tenant=$1 AND id=$2 FOR UPDATE",
    )
    .bind(&t)
    .bind(id)
    .fetch_one(&mut *tx)
    .await?;
    if !verified_kernel::b2b_approval_admissible(
        r.get::<String, _>("buyer_id") != customer,
        true,
        r.get::<String, _>("state") == "pending",
        r.get::<i64, _>("revision") == revision,
    ) {
        return Err(conflict(
            "Approval requires a different approver and a current pending revision",
        ));
    }
    sqlx::query("UPDATE b2b_approvals SET state=$3,revision=revision+1,data=data||jsonb_build_object('approverId',$4::text,'decidedAt',now()::text) WHERE tenant=$1 AND id=$2").bind(&t).bind(id).bind(target).bind(customer).execute(&mut *tx).await?;
    organization::event(
        &mut tx,
        &t,
        "b2b.approval_decided",
        json!({"approvalId":id,"unitId":unit,"state":target}),
    )
    .await?;
    tx.commit().await?;
    Ok(json!({"id":id,"state":target,"revision":revision+1}))
}
