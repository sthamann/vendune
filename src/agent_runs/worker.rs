//! Database claims resume only completed checkpoints; unknown model outcomes are never automatically charged again.
use super::*;
use tracing::Instrument;
pub(crate) async fn once(a: &App) -> Result<bool> {
    // A dead worker can be resumed safely between calls; an in-flight provider result is ambiguous.
    sqlx::query("UPDATE tasks SET run_state=CASE WHEN run_pending IS NULL THEN 'queued' ELSE 'uncertain' END,run_error=CASE WHEN run_pending IS NULL THEN NULL ELSE '{\"code\":\"agent_model_interrupted\",\"retryable\":false}'::jsonb END,run_lease=NULL,run_until=NULL,run_revision=run_revision+1,run_updated=now() WHERE (tenant,id) IN (SELECT tenant,id FROM tasks WHERE run_state='running' AND run_until<now() ORDER BY run_updated LIMIT 20 FOR UPDATE SKIP LOCKED)").execute(&a.db).await?;
    let lease = uid();
    let mut tx = a.db.begin().await?;
    let row=sqlx::query("SELECT * FROM tasks r WHERE run_state='queued' AND NOT EXISTS(SELECT 1 FROM tasks active WHERE active.tenant=r.tenant AND active.run_state='running' AND active.run_until>now()) ORDER BY run_updated,tenant,id FOR UPDATE SKIP LOCKED LIMIT 1").fetch_optional(&mut *tx).await?;
    let Some(row) = row else { return Ok(false) };
    let t: String = row.get("tenant");
    let id: String = row.get("id");
    // Serialize tenant admission across replicas, then recheck the running count.
    let admitted: bool =
        sqlx::query_scalar("SELECT pg_try_advisory_xact_lock(hashtextextended($1,2))")
            .bind(&t)
            .fetch_one(&mut *tx)
            .await?;
    if !admitted {
        return Ok(false);
    };
    let busy:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM tasks WHERE tenant=$1 AND run_state='running' AND run_until>now())").bind(&t).fetch_one(&mut *tx).await?;
    if busy {
        return Ok(false);
    };
    sqlx::query("UPDATE tasks SET run_state='running',run_lease=$3,run_until=now()+interval '240 seconds',run_revision=run_revision+1,run_updated=now() WHERE tenant=$1 AND id=$2")
        .bind(&t).bind(&id).bind(&lease).execute(&mut *tx).await?;
    tx.commit().await?;
    let request: Value = row.get("run_request");
    let trace: String = row.get("run_trace");
    let result = veyndo::trace::scoped(
        trace.clone(),
        async {
            let h = authority::headers(a, &row).await?;
            let scope = if h.principal.personal_session {
                veyndo::tenant_scope::Scope::Personal {
                    tenant: t.clone(),
                    actor: row.get("run_actor"),
                }
            } else {
                veyndo::tenant_scope::Scope::Actor {
                    tenant: t.clone(),
                    actor: row.get("run_actor"),
                }
            };
            let run = Run {
                tenant: t.clone(),
                id: id.clone(),
                lease: lease.clone(),
            };
            veyndo::tenant_scope::scoped(
                scope,
                CURRENT.scope(run, async {
                    let choice = agent::choice(&request)?;
                    tokio::time::timeout(
                        std::time::Duration::from_secs(190),
                        plan_with(
                            a,
                            &t,
                            request["instruction"].as_str().unwrap_or(""),
                            choice.as_ref(),
                            request["history"].as_str().unwrap_or(""),
                            request["locale"].as_str().unwrap_or("en-GB"),
                            &h,
                        ),
                    )
                    .await
                    .unwrap_or_else(|_| {
                        Err(Error(
                            StatusCode::GATEWAY_TIMEOUT,
                            "Model turn timed out".into(),
                        ))
                    })
                }),
            )
            .await
        }
        .instrument(tracing::info_span!("agent_run",trace_id=%trace,task_id=%id)),
    )
    .await;
    if let Err(error) = result {
        // Native diagnostics stay actor-private; outbox projections contain IDs/states only.
        let problem = json!({"code":if error.0==StatusCode::FORBIDDEN {"agent_authority_changed"}else if error.0==StatusCode::TOO_MANY_REQUESTS {"agent_capacity_busy"}else{"agent_step_failed"},"status":error.0.as_u16(),"detail":error.1.chars().take(500).collect::<String>()});
        let mut tx = a.db.begin().await?;
        let stopped=sqlx::query("UPDATE tasks SET run_state=CASE WHEN run_pending IS NOT NULL THEN 'uncertain' ELSE 'failed' END,run_error=$4,run_lease=NULL,run_until=NULL,run_revision=run_revision+1,run_updated=now() WHERE tenant=$1 AND id=$2 AND run_lease=$3 AND run_state='running' AND run_until>now() RETURNING conversation_id,run_state")
            .bind(&t).bind(&id).bind(&lease).bind(&problem).fetch_optional(&mut *tx).await?;
        if let Some(stopped) = stopped
            && let Some(c) = stopped.get::<Option<String>, _>("conversation_id")
        {
            let state: String = stopped.get("run_state");
            let data = json!({"error":true,"runId":id,"runState":state,"code":problem["code"],"providerUnavailable":error.0==StatusCode::BAD_GATEWAY});
            sqlx::query("INSERT INTO chat_messages(tenant,conversation_id,role,content,data) VALUES($1,$2,'assistant',$3,$4)").bind(&t).bind(&c).bind(error.1.chars().take(500).collect::<String>()).bind(data).execute(&mut *tx).await?;
            if state == "failed" {
                sqlx::query("UPDATE conversations SET turn_owner=NULL,turn_until=NULL WHERE tenant=$1 AND id=$2 AND turn_owner=$3").bind(&t).bind(&c).bind(&id).execute(&mut *tx).await?;
            }
        }
        tx.commit().await?;
    }
    Ok(true)
}
