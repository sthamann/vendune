//! Bounded journal of prepared context and completed inference calls; ambiguous calls require explicit continuation.
use super::*;
pub(crate) async fn authorize(a: &App) -> Result<()> {
    let Some(run) = CURRENT.try_with(Clone::clone).ok() else {
        return Ok(());
    };
    let row=sqlx::query("SELECT * FROM tasks WHERE tenant=$1 AND id=$2 AND run_state='running' AND run_lease=$3 AND run_until>now()")
        .bind(&run.tenant).bind(&run.id).bind(&run.lease).fetch_optional(&a.db).await?.ok_or(conflict("Agent run cancelled or lease lost"))?;
    let h = authority::headers(a, &row).await?;
    let saved: Value = row.get("run_checkpoint");
    if let Some(context) = saved.get("context") {
        planner::validate_context(
            a,
            &run.tenant,
            &h,
            &row.get::<Value, _>("run_request"),
            context,
        )
        .await?;
    }
    Ok(())
}
pub(crate) async fn load(a: &App, key: &str) -> Result<Option<Value>> {
    let Some(run) = CURRENT.try_with(Clone::clone).ok() else {
        return Ok(None);
    };
    authorize(a).await?;
    Ok(sqlx::query_scalar("SELECT run_checkpoint->$4 FROM tasks WHERE tenant=$1 AND id=$2 AND run_lease=$3 AND run_state='running' AND run_until>now()")
        .bind(&run.tenant).bind(&run.id).bind(&run.lease).bind(key).fetch_optional(&a.db).await?.flatten())
}
pub(crate) async fn save(a: &App, key: &str, value: &Value) -> Result<()> {
    let Some(run) = CURRENT.try_with(Clone::clone).ok() else {
        return Ok(());
    };
    if value.to_string().len() > 524288 {
        return Err(bad("Agent checkpoint exceeds its bounded budget"));
    }
    authorize(a).await?;
    let changed=sqlx::query("UPDATE tasks SET run_checkpoint=jsonb_set(run_checkpoint,ARRAY[$4],$5,true),run_pending=NULL,run_revision=run_revision+1,run_updated=now(),run_until=now()+interval '240 seconds' WHERE tenant=$1 AND id=$2 AND run_lease=$3 AND run_state='running' AND run_until>now()")
        .bind(&run.tenant).bind(&run.id).bind(&run.lease).bind(key).bind(value).execute(&a.db).await?.rows_affected();
    if changed != 1 {
        return Err(conflict("Agent run cancelled or lease lost"));
    }
    Ok(())
}
#[tracing::instrument(skip_all,fields(trace_id=%veyndo::trace::current()))]
pub(crate) async fn model(
    a: &App,
    h: &RequestContext,
    choice: Option<&Choice>,
    system: &str,
    prompt: &str,
    schema: &Value,
    public: bool,
) -> Result<veyndo::inference::Output> {
    let key = format!(
        "model-{}",
        hash(&json!([system, prompt, schema, choice]).to_string())
    );
    if let Some(value) = load(a, &key).await? {
        return serde_json::from_value(value).map_err(|_| bad("Invalid saved model checkpoint"));
    }
    if let Ok(run) = CURRENT.try_with(Clone::clone) {
        authorize(a).await?;
        let changed=sqlx::query("UPDATE tasks SET run_pending=$4,run_updated=now(),run_until=now()+interval '240 seconds' WHERE tenant=$1 AND id=$2 AND run_lease=$3 AND run_state='running' AND run_until>now()")
            .bind(&run.tenant).bind(&run.id).bind(&run.lease).bind(&key).execute(&a.db).await?.rows_affected();
        if changed != 1 {
            return Err(conflict("Agent lease lost before inference"));
        }
    }
    agent::assistant_access(h).or_else(|e| if public { Ok(()) } else { Err(e) })?;
    let authority = super::controls::model_authority(a, h).await;
    let output = veyndo::inference::budget::scoped(
        authority,
        Box::pin(a.inference.structured_for(
            if public { "concierge" } else { "planner" },
            choice,
            system,
            prompt,
            schema,
        )),
    )
    .await
    .map_err(Error::from)?;
    save(a, &key, &json!(output)).await?;
    Ok(output)
}
