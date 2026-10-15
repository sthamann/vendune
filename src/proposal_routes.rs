//! HTTP proposal creation, approval and task listing.
use crate::*;

pub(crate) async fn agent_plan(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    agent::assistant_access(&h)?;
    merchant(&a, &h)?;
    auth::permit(&h, "knowledge.read")?;
    let selection = choice(&v)?;
    let queued=agent_runs::enqueue(&a,&h,json!({"instruction":v["instruction"],"inference":selection,"locale":language_context(&a,&h).await?.0,"channel":marketing::channel_id(&h)}),None).await?;
    if v["background"] == true {
        return Ok(Json(queued));
    }
    let run = agent_runs::wait(&a, &h, queued["taskId"].as_str().unwrap()).await?;
    Ok(Json(agent_runs::plan_result(run)?))
}
pub(crate) async fn agent_apply(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    agent::assistant_access(&h)?;
    let t = merchant(&a, &h)?;
    if v["approve"] != true {
        return Err(bad("Explicit approve=true required"));
    }
    Ok(Json(apply(&a, &t, &id, &h).await?))
}
pub(crate) async fn tasks(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    agent::assistant_access(&h)?;
    let t = merchant(&a, &h)?;
    let rs = sqlx::query(
        "SELECT id,proposal,applied FROM tasks WHERE tenant=$1 AND (run_state IS NULL OR run_state='ready') AND coalesce(run_actor,proposal->>'actor')=$2 AND (run_scopes IS NULL OR run_scopes <@ $3) ORDER BY created_at DESC LIMIT 30",
    )
    .bind(t)
    .bind(header(&h,"x-rac-user"))
    .bind(json!(auth::SCOPES.iter().filter(|s|auth::allowed(&h,s)).collect::<Vec<_>>()))
    .fetch_all(&a.db)
    .await?;
    Ok(Json(
        json!({"tasks":rs.iter().map(|r|json!({"id":r.get::<String,_>("id"),"preview":r.get::<Value,_>("proposal"),"applied":r.get::<bool,_>("applied")})).collect::<Vec<_>>()}),
    ))
}
