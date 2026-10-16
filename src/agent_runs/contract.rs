//! HTTP/MCP share revision-bound run controls and safe progress; checkpoints and credentials are never exported.
use super::*;
pub(crate) const CAPABILITIES: &[(&str, &str)] = &[
    (
        "merchant.run.create",
        "Queue a durable native planning task; no automatic business writes",
    ),
    (
        "merchant.run.status",
        "Read a saved run and completed proposal with current rights",
    ),
    (
        "merchant.run.cancel",
        "Cancel a saved run with its expected revision",
    ),
    (
        "merchant.run.resume",
        "Explicitly resume a failed or ambiguous run from completed checkpoints",
    ),
];
pub(crate) fn schema(name: &str) -> Option<Value> {
    if let Some(schema) = super::controls::schema(name) {
        return Some(schema);
    }
    CAPABILITIES.iter().any(|(n,_)|*n==name).then(||json!({"type":"object","properties":{"requestId":{"type":"string","minLength":1,"maxLength":64},"id":{"type":"string","maxLength":64},"revision":{"type":"integer","minimum":1},"approve":{"type":"boolean"},"instruction":{"type":"string","minLength":1,"maxLength":4000},"inference":{"type":"object","properties":{"provider":{"type":"string","enum":["platform","ollama","openai","anthropic"]},"model":{"type":["string","null"],"maxLength":128}},"required":["provider"],"additionalProperties":false}},"required":if name=="merchant.run.create" {vec!["instruction"]}else if name=="merchant.run.status" {vec!["id"]}else{vec!["id","revision","approve"]},"additionalProperties":false}))
}
pub(crate) fn router() -> Router<App> {
    Router::new()
        .merge(super::controls::router())
        .secure_route(
            "/api/agent/runs",
            &[("POST", "assistant.use")],
            post(create),
        )
        .secure_route(
            "/api/agent/runs/{id}",
            &[("GET", "assistant.use")],
            get(status),
        )
        .secure_route(
            "/api/agent/runs/{id}/cancel",
            &[("POST", "assistant.use")],
            post(cancel),
        )
        .secure_route(
            "/api/agent/runs/{id}/resume",
            &[("POST", "assistant.use")],
            post(resume),
        )
}
async fn create(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    Ok(Json(invoke(&a, &h, "merchant.run.create", &v).await?))
}
async fn status(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    Ok(Json(
        invoke(&a, &h, "merchant.run.status", &json!({"id":id})).await?,
    ))
}
async fn cancel(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
    Json(mut v): Json<Value>,
) -> Result<Json<Value>> {
    v["id"] = json!(id);
    Ok(Json(invoke(&a, &h, "merchant.run.cancel", &v).await?))
}
async fn resume(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
    Json(mut v): Json<Value>,
) -> Result<Json<Value>> {
    v["id"] = json!(id);
    Ok(Json(invoke(&a, &h, "merchant.run.resume", &v).await?))
}
pub(crate) async fn invoke(a: &App, h: &RequestContext, name: &str, v: &Value) -> Result<Value> {
    if super::controls::schema(name).is_some() {
        return super::controls::invoke(a, h, name, v).await;
    }
    let schema = schema(name).ok_or(bad("Unknown agent run operation"))?;
    apps::validate_native_input(&schema, v)?;
    agent::assistant_access(h)?;
    let t = merchant(a, h)?;
    if name == "merchant.run.create" {
        return enqueue(a,h,json!({"instruction":v["instruction"],"inference":v.get("inference"),"locale":language_context(a,h).await?.0,"channel":marketing::channel_id(h),"requestId":v["requestId"]}),None).await;
    }
    // Resume charges the shared live-shop budget in the same transaction.
    // Status/cancel retain the ordinary actor-scoped connection.
    let mut tx = if name == "merchant.run.resume" {
        a.db.begin_privileged().await?
    } else {
        a.db.begin().await?
    };
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,2))")
        .bind(&t)
        .execute(&mut *tx)
        .await?;
    let row = sqlx::query(
        "SELECT *,run_updated::text AS updated_text FROM tasks WHERE tenant=$1 AND id=$2 AND run_state IS NOT NULL FOR UPDATE",
    )
    .bind(&t)
    .bind(v["id"].as_str().unwrap())
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(Error(StatusCode::NOT_FOUND, "Agent run not found".into()))?;
    let actor: String = row.get("run_actor");
    let request: Value = row.get("run_request");
    if !h.principal.personal_session
        && actor != "bootstrap"
        && (h.principal.agent_key.is_none()
            || request["agentId"].as_str() != h.principal.agent_key.as_deref())
    {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Run belongs to another agent identity".into(),
        ));
    }
    if header(h, "x-rac-user") != Some(actor.as_str())
        && !(name == "merchant.run.cancel"
            && h.principal.personal_session
            && header(h, "x-rac-role") == Some("owner"))
    {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Only the original run actor may access its continuation".into(),
        ));
    }
    let scopes: Value = row.get("run_scopes");
    if name != "merchant.run.cancel"
        && scopes.as_array().is_none_or(|s| {
            s.iter()
                .any(|s| s.as_str().is_none_or(|s| !auth::allowed(h, s)))
        })
    {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Run evidence requires its original permissions".into(),
        ));
    }
    let state: String = row.get("run_state");
    let revision: i64 = row.get("run_revision");
    if name == "merchant.run.status" {
        return Ok(project(&row));
    }
    if v["approve"] != true || v["revision"].as_i64() != Some(revision) {
        return Err(conflict(
            "Explicit approval and current run revision required",
        ));
    }
    let next = if name == "merchant.run.cancel" {
        if state == "ready" || state == "cancelled" {
            return Err(conflict(
                "Completed run cannot be cancelled; its proposal still needs approval",
            ));
        }
        "cancelled"
    } else {
        if !["failed", "uncertain"].contains(&state.as_str()) {
            return Err(conflict("Only a stopped run can be explicitly resumed"));
        }
        let stopped:bool=sqlx::query_scalar("SELECT agents_stopped FROM tenants WHERE id=coalesce((SELECT live_tenant FROM shop_environments WHERE tenant=$1),$1)").bind(&t).fetch_one(&mut *tx).await?;
        if stopped {
            return Err(Error(
                StatusCode::FORBIDDEN,
                "Shop agents are stopped by an administrator".into(),
            ));
        }
        performance::reserve_ai_attempt_tx(a, &t, &mut tx).await?;
        "queued"
    };
    if next == "queued"
        && let Some(c) = row.get::<Option<String>, _>("conversation_id")
    {
        let available:bool=sqlx::query_scalar("SELECT NOT EXISTS(SELECT 1 FROM tasks WHERE tenant=$1 AND conversation_id=$2 AND id<>$3 AND run_state IN ('queued','running','uncertain')) AND EXISTS(SELECT 1 FROM conversations WHERE tenant=$1 AND id=$2 AND (turn_owner=$3 OR turn_until IS NULL OR turn_until<now()))").bind(&t).bind(&c).bind(row.get::<String,_>("id")).fetch_one(&mut *tx).await?;
        if !available {
            return Err(conflict("A newer conversation turn is active"));
        }
        sqlx::query("UPDATE conversations SET turn_owner=$3,turn_until='infinity' WHERE tenant=$1 AND id=$2").bind(&t).bind(&c).bind(row.get::<String,_>("id")).execute(&mut *tx).await?;
    }
    if next == "queued" && row.get::<bool, _>("run_personal") != h.principal.personal_session {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Use the original personal or integration credential kind to continue".into(),
        ));
    }
    let credential = header(h, "authorization")
        .and_then(|s| s.strip_prefix("Bearer "))
        .map(hash);
    if actor != "bootstrap" && credential.is_none() {
        return Err(bad("Current run credential required"));
    }
    sqlx::query("UPDATE tasks SET run_state=$3,run_error=NULL,run_pending=NULL,run_lease=NULL,run_until=NULL,run_credential=$4,run_personal=$5,run_revision=run_revision+1,run_updated=now() WHERE tenant=$1 AND id=$2")
   .bind(&t).bind(row.get::<String,_>("id")).bind(next).bind(credential).bind(h.principal.personal_session).execute(&mut *tx).await?;
    if next == "cancelled" {
        sqlx::query("UPDATE conversations SET turn_owner=NULL,turn_until=NULL WHERE tenant=$1 AND id=$2 AND turn_owner=$3").bind(&t).bind(row.get::<Option<String>,_>("conversation_id")).bind(row.get::<String,_>("id")).execute(&mut *tx).await?;
    }
    tx.commit().await?;
    Ok(
        json!({"taskId":row.get::<String,_>("id"),"state":next,"revision":revision+1,"approvalRequired":true}),
    )
}
pub(super) fn project(row: &sqlx::postgres::PgRow) -> Value {
    let state: String = row.get("run_state");
    let cp: Value = row.get("run_checkpoint");
    let steps = cp
        .as_object()
        .map_or(0, |o| o.keys().filter(|k| k.starts_with("model-")).count());
    json!({"taskId":row.get::<String,_>("id"),"agentId":row.get::<Value,_>("run_request")["agentId"],"state":state,"revision":row.get::<i64,_>("run_revision"),"completedModelSteps":steps,"error":row.get::<Option<Value>,_>("run_error"),"conversationId":row.get::<Option<String>,_>("conversation_id"),"approvalRequired":true,"preview":if state=="ready" {row.get::<Value,_>("proposal")}else{Value::Null},"updatedAt":row.get::<String,_>("updated_text")})
}
