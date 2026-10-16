//! Tenant-authorized quarantine inspection and explicit retry; delivered or retired events cannot be replayed here.
use crate::{
    App, Error, Json, Path, RequestContext, Result, State, StatusCode, Value, bad, json, merchant,
};
pub(crate) async fn retry(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<i64>,
) -> Result<Json<Value>> {
    let tenant = merchant(&a, &h)?;
    crate::auth::permit(&h, "settings.write")?;
    if id <= 0 {
        return Err(bad("Positive event ID required"));
    }
    let mut tx = a.db.begin().await?;
    let changed=sqlx::query("UPDATE outbox_subscriber_failures c SET attempts=0,available_at=now(),dead_letter_at=NULL WHERE c.tenant=$1 AND c.event_id=$2 AND c.dead_letter_at IS NOT NULL AND EXISTS(SELECT 1 FROM outbox e WHERE e.id=$2 AND e.tenant=c.tenant AND e.delivered_at IS NULL AND e.payload_retired_at IS NULL)")
        .bind(&tenant).bind(id).execute(&mut *tx).await?.rows_affected();
    let released=sqlx::query("UPDATE outbox SET attempts=0,available_at=now(),dispatch_not_before=now(),dispatch_requires_retry=false,dead_letter_at=NULL,error_code=NULL WHERE tenant=$1 AND id=$2 AND delivered_at IS NULL AND payload_retired_at IS NULL AND (dispatch_requires_retry OR $3)")
        .bind(&tenant).bind(id).bind(changed>0).execute(&mut *tx).await?.rows_affected();
    if released == 0 {
        return Err(Error(
            StatusCode::NOT_FOUND,
            "Quarantined event not found in this shop".into(),
        ));
    }
    tx.commit().await?;
    sqlx::query("SELECT pg_notify('veyndo_work_ready','outbox')")
        .execute(&a.db)
        .await?;
    Ok(Json(json!({"eventId":id,"queued":true})))
}
