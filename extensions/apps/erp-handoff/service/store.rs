//! App-private PostgreSQL receipts use forced tenant RLS, short claims and explicit uncertain outcomes after a crash.
use super::*;
use sqlx::Row;
fn db_error(_: sqlx::Error) -> Error {
    error(
        StatusCode::SERVICE_UNAVAILABLE,
        "ERP receipt store unavailable",
    )
}
async fn tx(a: &App, t: &str) -> Result<sqlx::Transaction<'static, sqlx::Postgres>> {
    let mut tx = a.db.begin().await.map_err(db_error)?;
    sqlx::query("SELECT set_config('app.tenant',$1,true)")
        .bind(t)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;
    Ok(tx)
}
pub(super) async fn verify_role(db: &sqlx::PgPool) -> Result<()> {
    let valid:bool=sqlx::query_scalar("SELECT NOT r.rolsuper AND NOT r.rolbypassrls AND c.relrowsecurity AND c.relforcerowsecurity AND c.relowner<>r.oid FROM pg_roles r CROSS JOIN pg_class c WHERE r.rolname=current_user AND c.oid='public.erp_handoff_receipts'::regclass")
        .fetch_one(db).await.map_err(db_error)?;
    if !valid {
        return Err(error(
            StatusCode::FORBIDDEN,
            "ERP role must not own or bypass forced tenant RLS",
        ));
    }
    Ok(())
}
pub(super) async fn claim(
    a: &App,
    t: &str,
    id: &str,
    payload: &Value,
    key: &str,
) -> Result<Option<Value>> {
    let mut tx = tx(a, t).await?;
    let inserted=sqlx::query("INSERT INTO erp_handoff_receipts(tenant,order_id,state,payload,idempotency_key) VALUES($1,$2,'running',$3,$4) ON CONFLICT DO NOTHING")
        .bind(t).bind(id).bind(payload).bind(key).execute(&mut *tx).await.map_err(db_error)?.rows_affected()==1;
    // A timeout or process restart cannot prove whether the ERP accepted a previous attempt. Never resend automatically.
    sqlx::query("UPDATE erp_handoff_receipts SET state='uncertain',detail='Previous attempt ended without a confirmed result; reconcile at the ERP using its idempotency key',updated_at=now() WHERE tenant=$1 AND order_id=$2 AND state='running' AND created_at<now()-interval '10 seconds'")
        .bind(t).bind(id).execute(&mut *tx).await.map_err(db_error)?;
    let value=sqlx::query_scalar("SELECT jsonb_build_object('orderId',order_id,'state',state,'idempotencyKey',idempotency_key,'externalReceipt',external_receipt,'detail',detail) FROM erp_handoff_receipts WHERE tenant=$1 AND order_id=$2")
        .bind(t).bind(id).fetch_one(&mut *tx).await.map_err(db_error)?;
    tx.commit().await.map_err(db_error)?;
    Ok(if inserted { None } else { Some(value) })
}
pub(super) async fn finish(
    a: &App,
    t: &str,
    id: &str,
    state: &str,
    receipt: Option<&str>,
    detail: &str,
) -> Result<Value> {
    let mut tx = tx(a, t).await?;
    let result=sqlx::query_scalar("UPDATE erp_handoff_receipts SET state=$3,external_receipt=$4,detail=$5,updated_at=now() WHERE tenant=$1 AND order_id=$2 AND state='running' RETURNING jsonb_build_object('orderId',order_id,'state',state,'idempotencyKey',idempotency_key,'externalReceipt',external_receipt,'detail',detail)")
        .bind(t).bind(id).bind(state).bind(receipt).bind(detail).fetch_optional(&mut *tx).await.map_err(db_error)?
        .ok_or(error(StatusCode::CONFLICT,"ERP attempt no longer owns this receipt"))?;
    tx.commit().await.map_err(db_error)?;
    Ok(result)
}
pub(super) async fn list(a: &App, t: &str) -> Result<Vec<Value>> {
    let mut tx = tx(a, t).await?;
    let rows=sqlx::query("SELECT jsonb_build_object('orderId',order_id,'state',state,'externalReceipt',external_receipt,'idempotencyKey',idempotency_key,'detail',detail,'createdAt',created_at,'updatedAt',updated_at) AS data FROM erp_handoff_receipts WHERE tenant=$1 ORDER BY created_at DESC LIMIT 100")
        .bind(t).fetch_all(&mut *tx).await.map_err(db_error)?;
    let result = rows.iter().map(|r| r.get("data")).collect();
    tx.commit().await.map_err(db_error)?;
    Ok(result)
}
pub(super) async fn get(a: &App, t: &str, id: &str) -> Result<Value> {
    let mut tx = tx(a, t).await?;
    let value=sqlx::query_scalar("SELECT jsonb_build_object('orderId',order_id,'state',state,'externalReceipt',external_receipt,'idempotencyKey',idempotency_key,'detail',detail) FROM erp_handoff_receipts WHERE tenant=$1 AND order_id=$2")
        .bind(t).bind(id).fetch_optional(&mut *tx).await.map_err(db_error)?.ok_or(error(StatusCode::NOT_FOUND,"ERP receipt not found"))?;
    tx.commit().await.map_err(db_error)?;
    Ok(value)
}
pub(super) async fn reconcile(a: &App, t: &str, id: &str, receipt: &str) -> Result<Value> {
    let mut tx = tx(a, t).await?;
    let value=sqlx::query_scalar("UPDATE erp_handoff_receipts SET state='accepted',external_receipt=$3,detail='ERP receipt confirmed by explicit reconciliation; export was not repeated',updated_at=now() WHERE tenant=$1 AND order_id=$2 AND state IN ('uncertain','failed') RETURNING jsonb_build_object('orderId',order_id,'state',state,'externalReceipt',external_receipt,'idempotencyKey',idempotency_key)")
        .bind(t).bind(id).bind(receipt).fetch_optional(&mut *tx).await.map_err(db_error)?.ok_or(error(StatusCode::CONFLICT,"Receipt changed during reconciliation"))?;
    tx.commit().await.map_err(db_error)?;
    Ok(value)
}
