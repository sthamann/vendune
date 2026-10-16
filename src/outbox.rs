//! Durable outbox and audit projection worker.
use crate::*;
use tracing::Instrument;
mod control;
mod retention;
pub(crate) use control::retry as retry_outbox;

pub(crate) async fn runtime(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    let r=sqlx::query("SELECT (SELECT count(*) FROM outbox WHERE tenant=$1 AND delivered_at IS NULL AND dead_letter_at IS NULL) AS pending,(SELECT count(*) FROM outbox WHERE tenant=$1 AND dead_letter_at IS NOT NULL) AS quarantined,(SELECT count(*) FROM outbox WHERE tenant=$1 AND delivered_at IS NULL AND attempts>0 AND dead_letter_at IS NULL) AS retrying,(SELECT count(*) FROM projections WHERE tenant=$1) AS consumed").bind(t).fetch_one(&a.db).await?;
    Ok(Json(
        json!({"outboxPending":r.get::<i64,_>("pending"),"outboxQuarantined":r.get::<i64,_>("quarantined"),"outboxRetrying":r.get::<i64,_>("retrying"),"eventsConsumed":r.get::<i64,_>("consumed"),"consumer":"independent cognition/apps/flows/audit cursors; no external messages in projection",
            // Instance-wide diagnostic counters are visible only to the existing instance credential.
            "performance":if header(&h,"x-rac-user")==Some("bootstrap") {Some(json!({"reads":a.reads.snapshot(),"admission":a.admission.snapshot(),"pool":{"size":a.db.size(),"idle":a.db.num_idle()}}))}else{None}}),
    ))
}
pub(crate) const SUBSCRIBERS: [&str; 4] = ["cognition", "apps", "flows", "audit"];
/// Each lane owns its schedule; exact event acknowledgement and effects commit atomically.
pub(crate) async fn consume_subscriber(a: &App, subscriber: &str) -> Result<bool> {
    if !SUBSCRIBERS.contains(&subscriber) {
        return Err(bad("Unknown outbox subscriber"));
    }
    let bit = 1_i16 << SUBSCRIBERS.iter().position(|s| *s == subscriber).unwrap();
    // Closed server constants let PostgreSQL use the matching partial index even
    // with a generic prepared plan. No caller text enters either SQL statement.
    let scheduling =
        include_str!("outbox/next_tenant.sql").replace("SUBSCRIBER_BIT", &bit.to_string());
    let mut tx = a.db.begin().await?;
    let next = sqlx::query(sqlx::AssertSqlSafe(scheduling.as_str()))
        .bind(subscriber)
        .fetch_optional(&mut *tx)
        .await?;
    let Some(next) = next else {
        tx.commit().await?;
        retention::once(a).await?;
        return Ok(false);
    };
    let t: String = next.get("tenant");
    let pending: Option<i64> = next.get("pending_id");
    let retry_filter = if pending.is_some() { " AND id=$2" } else { "" };
    let selection = format!(
        "SELECT * FROM outbox WHERE tenant=$1 AND (subscriber_mask & {bit}::smallint)=0 AND NOT dispatch_requires_retry AND dispatch_not_before<=now() AND delivered_at IS NULL AND payload_retired_at IS NULL{retry_filter} ORDER BY id LIMIT 50"
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(selection.as_str())).bind(&t);
    if let Some(id) = pending {
        query = query.bind(id);
    }
    let rows = query.fetch_all(&mut *tx).await?;
    sqlx::query("UPDATE outbox_checkpoints SET served_order=nextval('public.outbox_dispatch_sequence') WHERE tenant=$1 AND subscriber=$2")
        .bind(&t).bind(subscriber).execute(&mut *tx).await?;
    let worked = !rows.is_empty();
    for r in rows {
        let id = r.get::<i64, _>("id");
        let kind = r.get::<String, _>("kind");
        let data = r.get::<Value, _>("data");
        sqlx::query("SAVEPOINT project_event")
            .execute(&mut *tx)
            .await?;
        let result:Result<()> = async {
            match subscriber {
                "cognition"=>cognition::project(&mut tx,&t,id,&kind,&data).await?,
                "apps"=>apps::project_events(&mut tx,&t,id,&kind).await?,
                "flows"=>marketing::project_flows(&mut tx,&t,id,&kind,&data).await?,
                "audit"=>{sqlx::query("INSERT INTO projections(event_id,tenant,kind,data) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING").bind(id).bind(&t).bind(&kind).bind(&data).execute(&mut *tx).await?;},
                _=>unreachable!()
            }
            sqlx::query("UPDATE outbox SET subscriber_mask=subscriber_mask|$3::smallint,delivered_at=CASE WHEN (subscriber_mask|$3::smallint)=15 THEN now() ELSE delivered_at END,dead_letter_at=CASE WHEN (subscriber_mask|$3::smallint)=15 THEN NULL ELSE dead_letter_at END,error_code=CASE WHEN (subscriber_mask|$3::smallint)=15 THEN NULL ELSE error_code END WHERE tenant=$1 AND id=$2")
                .bind(&t).bind(id).bind(bit).execute(&mut *tx).await?;
            sqlx::query("UPDATE outbox_checkpoints SET last_event_id=greatest(last_event_id,$3),pending_id=NULL,attempts=0,dead_letter_at=NULL,available_at=now() WHERE tenant=$1 AND subscriber=$2")
                .bind(&t).bind(subscriber).bind(id).execute(&mut *tx).await?;
            Ok(())
        }.instrument(tracing::info_span!("outbox_event",trace_id=%r.get::<String,_>("trace_id"),event_id=id,subscriber=subscriber)).await;
        if let Err(error) = result {
            sqlx::query("ROLLBACK TO SAVEPOINT project_event")
                .execute(&mut *tx)
                .await?;
            sqlx::query("UPDATE outbox_checkpoints SET pending_id=$3,attempts=attempts+1,available_at=now()+least(300,power(2,least(attempts+1,8))::int)*interval '1 second',dead_letter_at=CASE WHEN attempts+1>=8 THEN now() ELSE NULL END WHERE tenant=$1 AND subscriber=$2")
                .bind(&t).bind(subscriber).bind(id).execute(&mut *tx).await?;
            // Aggregate quarantine is sticky until explicit retry or all lanes
            // acknowledge. A first failure in another lane must not erase it.
            sqlx::query("UPDATE outbox e SET attempts=greatest(e.attempts,c.attempts),available_at=c.available_at,dead_letter_at=coalesce(e.dead_letter_at,c.dead_letter_at),error_code='projection_failed' FROM outbox_checkpoints c WHERE e.id=$1 AND e.tenant=$2 AND c.tenant=e.tenant AND c.subscriber=$3")
                .bind(id).bind(&t).bind(subscriber).execute(&mut *tx).await?;
            eprintln!(
                "outbox_projection_failed tenant={t} event_id={id} subscriber={subscriber} kind={kind} status={}",
                error.0.as_u16()
            );
            sqlx::query("RELEASE SAVEPOINT project_event")
                .execute(&mut *tx)
                .await?;
            break;
        }
        sqlx::query("RELEASE SAVEPOINT project_event")
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    retention::once(a).await?;
    Ok(worked)
}
