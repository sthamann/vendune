//! Durable continuation extends native tasks; leases fence checkpoints and publication, never approved writes.
use crate::*;
mod authority;
pub(crate) mod checkpoint;
mod contract;
mod worker;
pub(crate) use contract::{CAPABILITIES, invoke, router, schema};
pub(crate) use worker::once;
#[derive(Clone)]
pub(crate) struct Run {
    pub tenant: String,
    pub id: String,
    pub lease: String,
}
tokio::task_local! { pub(crate) static CURRENT: Run; }
pub(crate) fn current_id() -> Option<String> {
    CURRENT.try_with(|r| r.id.clone()).ok()
}

pub(crate) async fn enqueue(
    a: &App,
    h: &RequestContext,
    request: Value,
    conversation: Option<&str>,
) -> Result<Value> {
    agent::assistant_access(h)?;
    let t = merchant(a, h)?;
    let instruction = request["instruction"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() <= 4000)
        .ok_or(bad("Instruction must contain 1..4000 characters"))?;
    if request.to_string().len() > 32768 || h.principal.app.is_some() {
        return Err(bad("Invalid durable agent request"));
    }
    let actor = header(h, "x-rac-user").ok_or(bad("Agent actor required"))?;
    let credential = header(h, "authorization")
        .and_then(|s| s.strip_prefix("Bearer "))
        .map(hash);
    if actor != "bootstrap" && credential.is_none() {
        return Err(bad("Current credential required"));
    }
    let id = uid();
    let scopes = auth::SCOPES
        .iter()
        .filter(|s| auth::allowed(h, s))
        .copied()
        .collect::<Vec<_>>();
    let mut tx = a.db.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,2))")
        .bind(&t)
        .execute(&mut *tx)
        .await?;
    let request_key = request
        .get("requestId")
        .filter(|v| !v.is_null())
        .map(|v| {
            v.as_str()
                .filter(|s| {
                    !s.is_empty()
                        && s.len() <= 64
                        && s.bytes()
                            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
                })
                .ok_or(bad("Invalid agent request ID"))
        })
        .transpose()?;
    let fingerprint = hash(
        &json!([
            request["instruction"],
            request["inference"],
            request["locale"],
            request["channel"],
            request["requestedConversation"]
        ])
        .to_string(),
    );
    if let Some(key)=request_key && let Some(existing)=sqlx::query("SELECT *,run_updated::text AS updated_text FROM tasks WHERE tenant=$1 AND run_actor=$2 AND run_key=$3").bind(&t).bind(actor).bind(key).fetch_optional(&mut *tx).await? {
        if existing.get::<Option<String>,_>("run_fingerprint").as_deref()!=Some(&fingerprint) {return Err(conflict("Agent request ID was already used with different input"));}
        let admitted:Value=existing.get("run_scopes");
        if admitted.as_array().is_none_or(|s|s.iter().any(|s|s.as_str().is_none_or(|s|!auth::allowed(h,s)))) {return Err(Error(StatusCode::FORBIDDEN,"Saved request evidence requires its original permissions".into()));}
        return Ok(contract::project(&existing));
    }
    let count:i64=sqlx::query_scalar("SELECT count(*) FROM tasks WHERE tenant=$1 AND run_state IN ('queued','running','uncertain')").bind(&t).fetch_one(&mut *tx).await?;
    if count >= 20 {
        return Err(Error(
            StatusCode::TOO_MANY_REQUESTS,
            "Agent backlog limit reached; finish or cancel a saved run".into(),
        ));
    }
    if request["newConversation"] == true
        && let Some(c) = conversation
    {
        sqlx::query("INSERT INTO conversations(tenant,id,title,owner_id) VALUES($1,$2,$3,$4)")
            .bind(&t)
            .bind(c)
            .bind(instruction.chars().take(70).collect::<String>())
            .bind(actor)
            .execute(&mut *tx)
            .await?;
    }
    if let Some(c) = conversation {
        let free:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM conversations WHERE tenant=$1 AND id=$2 AND (turn_until IS NULL OR turn_until<now()) AND NOT EXISTS(SELECT 1 FROM tasks WHERE tenant=$1 AND conversation_id=$2 AND run_state IN ('queued','running','uncertain'))) FOR UPDATE").bind(&t).bind(c).fetch_one(&mut *tx).await?;
        if !free {
            return Err(conflict(
                "A saved turn is already active in this conversation",
            ));
        }
        sqlx::query("INSERT INTO chat_messages(tenant,conversation_id,role,content,data) VALUES($1,$2,'user',$3,$4)").bind(&t).bind(c).bind(instruction).bind(json!({"runId":id})).execute(&mut *tx).await?;
    }
    // Only new work consumes the shared budget. Replays above remain recoverable at the daily limit.
    performance::reserve_ai_attempt(a, &t).await?;
    sqlx::query("INSERT INTO tasks(tenant,id,proposal,run_state,run_request,run_actor,run_scopes,run_credential,run_personal,conversation_id,run_key,run_fingerprint) VALUES($1,$2,'{}','queued',$3,$4,$5,$6,$7,$8,$9,$10)")
        .bind(&t).bind(&id).bind(&request).bind(actor).bind(json!(scopes)).bind(credential).bind(h.principal.personal_session).bind(conversation).bind(request_key).bind(&fingerprint).execute(&mut *tx).await?;
    if let Some(c) = conversation {
        sqlx::query("UPDATE conversations SET turn_owner=$3,turn_until='infinity' WHERE tenant=$1 AND id=$2").bind(&t).bind(c).bind(&id).execute(&mut *tx).await?;
    }
    tx.commit().await?;
    sqlx::query("SELECT pg_notify('veyndo_work_ready','')")
        .execute(&a.db)
        .await?;
    Ok(
        json!({"taskId":id,"state":"queued","revision":1,"approvalRequired":true,"conversationId":conversation}),
    )
}

pub(crate) async fn persist(a: &App, t: &str, id: &str, evidence: &Value) -> Result<()> {
    let Some(run) = CURRENT.try_with(Clone::clone).ok() else {
        sqlx::query("INSERT INTO tasks(id,tenant,proposal) VALUES($1,$2,$3)")
            .bind(id)
            .bind(t)
            .bind(evidence)
            .execute(&a.db)
            .await?;
        return Ok(());
    };
    checkpoint::authorize(a).await?;
    let mut tx = a.db.begin().await?;
    let row=sqlx::query("UPDATE tasks SET proposal=$1,run_state='ready',run_pending=NULL,run_lease=NULL,run_until=NULL,run_revision=run_revision+1,run_updated=now() WHERE tenant=$2 AND id=$3 AND run_state='running' AND run_lease=$4 AND run_until>now() RETURNING conversation_id")
        .bind(evidence).bind(t).bind(id).bind(&run.lease).fetch_optional(&mut *tx).await?.ok_or(conflict("Agent run cancelled or lease lost"))?;
    if let Some(c) = row.get::<Option<String>, _>("conversation_id") {
        sqlx::query("UPDATE conversations SET turn_owner=NULL,turn_until=NULL WHERE tenant=$1 AND id=$2 AND turn_owner=$3").bind(t).bind(&c).bind(id).execute(&mut *tx).await?;
        let data = json!({"taskId":id,"preview":evidence,"approvalRequired":true});
        sqlx::query("INSERT INTO chat_messages(tenant,conversation_id,role,content,data) VALUES($1,$2,'assistant',$3,$4)").bind(t).bind(c).bind(evidence["proposal"]["summary"].as_str().unwrap_or("")).bind(data).execute(&mut *tx).await?;
    }
    tx.commit().await?;
    Ok(())
}

/// Compatibility wait is only a transport: dropping it never deletes the persisted run.
pub(crate) async fn wait(a: &App, h: &RequestContext, id: &str) -> Result<Value> {
    let start = std::time::Instant::now();
    loop {
        let value = invoke(a, h, "merchant.run.status", &json!({"id":id})).await?;
        if ![Some("queued"), Some("running")].contains(&value["state"].as_str())
            || start.elapsed().as_secs() >= 185
        {
            return Ok(value);
        }
        tokio::time::sleep(std::time::Duration::from_millis(250)).await;
    }
}
/// Preserve the synchronous planning error contract while the saved run remains inspectable.
pub(crate) fn plan_result(run: Value) -> Result<Value> {
    if run["state"] == "ready" {
        return Ok(
            json!({"taskId":run["taskId"],"preview":run["preview"],"approvalRequired":true,"run":run}),
        );
    }
    if [Some("failed"), Some("uncertain"), Some("cancelled")].contains(&run["state"].as_str()) {
        let status = run["error"]["status"]
            .as_u64()
            .and_then(|v| u16::try_from(v).ok())
            .and_then(|v| StatusCode::from_u16(v).ok())
            .filter(|v| v.is_client_error() || v.is_server_error())
            .unwrap_or(StatusCode::BAD_GATEWAY);
        return Err(Error(
            status,
            format!(
                "Saved agent run {} stopped: {}. Inspect its status before continuing.",
                run["taskId"].as_str().unwrap_or(""),
                run["error"]["detail"]
                    .as_str()
                    .unwrap_or("explicit review required")
            ),
        ));
    }
    Ok(run)
}
pub(crate) async fn conversation_run(
    a: &App,
    h: &RequestContext,
    conversation: &str,
) -> Result<Value> {
    let t = merchant(a, h)?;
    let id:Option<String>=sqlx::query_scalar("SELECT id FROM tasks WHERE tenant=$1 AND conversation_id=$2 AND run_actor=$3 ORDER BY created_at DESC LIMIT 1").bind(t).bind(conversation).bind(header(h,"x-rac-user")).fetch_optional(&a.db).await?;
    match id {
        Some(id) => invoke(a, h, "merchant.run.status", &json!({"id":id})).await,
        None => Ok(Value::Null),
    }
}
