//! Live-only agent stop and existing-key admission; no control becomes a sandbox release or credential snapshot.
use crate::*;
pub(crate) fn conversation_actor(h: &RequestContext) -> Option<String> {
    h.principal
        .agent_key
        .as_ref()
        .map(|id| format!("agent:{id}"))
        .or_else(|| h.principal.user.clone())
}
pub(crate) const CAPABILITIES: &[(&str, &str)] = &[
    (
        "merchant.agents.status",
        "Read live shop agent stop state and revision",
    ),
    (
        "merchant.agents.control",
        "Explicitly stop or re-enable shop agents with current revision",
    ),
];
pub(crate) fn schema(name: &str) -> Option<Value> {
    CAPABILITIES.iter().any(|(n,_)|*n==name).then(|| if name.ends_with("status") {
        json!({"type":"object","properties":{},"additionalProperties":false})
    } else { json!({"type":"object","properties":{"stopped":{"type":"boolean"},"revision":{"type":"integer","minimum":1},"approve":{"type":"boolean","enum":[true]}},"required":["stopped","revision","approve"],"additionalProperties":false}) })
}
pub(crate) fn visible(a: &App, h: &RequestContext) -> bool {
    h.principal.personal_session && merchant(a, h).is_ok() && auth::allowed(h, "ai.manage")
}
pub(crate) async fn model_authority(
    _a: &App,
    h: &RequestContext,
) -> veyndo::inference::budget::Authority {
    let tenant = h
        .access
        .as_ref()
        .and_then(|s| s.parent.clone())
        .or_else(|| h.principal.tenant.clone())
        .or_else(|| {
            h.access
                .as_ref()
                .filter(|s| s.exists)
                .map(|s| s.tenant.clone())
        })
        .unwrap_or_default();
    veyndo::inference::budget::Authority {
        tenant,
        key_id: h.principal.agent_key.clone(),
        require_budget: h.principal.agent_key.is_some()
            || (!h.principal.personal_session
                && h.principal
                    .user
                    .as_deref()
                    .is_some_and(|s| s != "bootstrap")
                && h.principal.app.is_none()
                && header(h, "authorization").is_some()),
    }
}
pub(crate) fn planning_scope(scope: &str) -> bool {
    scope.ends_with(".read") || ["assistant.use", "customers.pii"].contains(&scope)
}
pub(crate) async fn admit_key(a: &App, h: &RequestContext, path: &str, method: &str) -> Result<()> {
    if let Some(id) = &h.principal.agent_key {
        let run_control = path
            .strip_prefix("/api/agent/runs/")
            .and_then(|s| s.rsplit_once('/'))
            .is_some_and(|(id, action)| {
                apps::identifier(id) && ["cancel", "resume"].contains(&action)
            });
        let planning_post = method == "POST"
            && (run_control
                || [
                    "/mcp",
                    "/api/agent/runs",
                    "/api/agent/chat",
                    "/api/agent/chat/stream",
                    "/api/agent/plan",
                    "/api/merchant/grid/plan",
                ]
                .contains(&path));
        if !["GET", "HEAD"].contains(&method) && !planning_post {
            return Err(Error(
                StatusCode::FORBIDDEN,
                "Budgeted planning agents cannot mutate commerce or delegate credentials".into(),
            ));
        }
        let permitted:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM integration_keys i JOIN tenants t ON t.id=i.tenant WHERE i.id=$1 AND i.tenant=coalesce((SELECT live_tenant FROM shop_environments WHERE tenant=$2),$2) AND i.expires_at>now() AND NOT t.agents_stopped)")
            .bind(id).bind(tenant(h)?).fetch_one(&a.db).await?;
        if !permitted {
            return Err(Error(
                StatusCode::FORBIDDEN,
                "Agent access is stopped or revoked".into(),
            ));
        }
    }
    Ok(())
}
pub(crate) fn router() -> Router<App> {
    Router::new().secure_route(
        "/api/agent/control",
        &[("GET", "ai.manage"), ("POST", "ai.manage")],
        get(status).post(control),
    )
}
async fn status(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    Ok(Json(
        invoke(&a, &h, "merchant.agents.status", &json!({})).await?,
    ))
}
async fn control(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    Ok(Json(invoke(&a, &h, "merchant.agents.control", &v).await?))
}
pub(crate) async fn invoke(a: &App, h: &RequestContext, name: &str, v: &Value) -> Result<Value> {
    apps::validate_native_input(&schema(name).ok_or(bad("Unknown agent control"))?, v)?;
    if !visible(a, h) {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Personal AI administration permission required".into(),
        ));
    }
    if name.ends_with("control") && v["approve"] != true {
        return Err(bad("Explicit approval required for agent controls"));
    }
    let t = merchant(a, h)?;
    let mut tx = a.db.begin_privileged().await?;
    let live: String = sqlx::query_scalar(
        "SELECT coalesce((SELECT live_tenant FROM shop_environments WHERE tenant=$1),$1)",
    )
    .bind(&t)
    .fetch_one(&mut *tx)
    .await?;
    let row = sqlx::query(
        "SELECT agents_stopped,agents_revision FROM tenants WHERE id=$1 FOR NO KEY UPDATE",
    )
    .bind(&live)
    .fetch_one(&mut *tx)
    .await?;
    let revision: i64 = row.get("agents_revision");
    let stopped: bool = row.get("agents_stopped");
    if name.ends_with("status") {
        return Ok(json!({"stopped":stopped,"revision":revision,"liveShop":live}));
    }
    if v["revision"].as_i64() != Some(revision) {
        return Err(conflict("Agent controls changed; reload before confirming"));
    }
    let stopped = v["stopped"].as_bool().unwrap();
    sqlx::query(
        "UPDATE tenants SET agents_stopped=$2,agents_revision=agents_revision+1 WHERE id=$1",
    )
    .bind(&live)
    .bind(stopped)
    .execute(&mut *tx)
    .await?;
    let cancelled = if stopped {
        let count=sqlx::query("UPDATE tasks SET run_state='cancelled',run_lease=NULL,run_until=NULL,run_revision=run_revision+1,run_updated=now() WHERE (tenant=$1 OR tenant IN(SELECT tenant FROM shop_environments WHERE live_tenant=$1)) AND run_state IN('queued','running','uncertain')")
            .bind(&live).execute(&mut *tx).await?.rows_affected();
        sqlx::query("UPDATE conversations c SET turn_owner=NULL,turn_until=NULL WHERE (tenant=$1 OR tenant IN(SELECT tenant FROM shop_environments WHERE live_tenant=$1)) AND EXISTS(SELECT 1 FROM tasks k WHERE k.tenant=c.tenant AND k.id=c.turn_owner AND k.run_state='cancelled')")
            .bind(&live).execute(&mut *tx).await?;
        count
    } else {
        0
    };
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,'intelligence.agents.controlled',$2)").bind(&live).bind(json!({"stopped":stopped,"revision":revision+1,"actor":h.principal.user,"cancelled":cancelled})).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(json!({"stopped":stopped,"revision":revision+1,"liveShop":live,"cancelled":cancelled}))
}
