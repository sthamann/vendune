//! Read bounded tenant flow execution summaries without reloading rule/channel configuration on each Studio refresh.
use super::*;
pub(super) async fn values(a: &App, t: &str, h: &RequestContext) -> Result<Value> {
    let jobs=sqlx::query("SELECT j.id,j.flow,j.state,j.result,j.error,j.cursor,j.execution,to_char(j.available_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS available_at,COALESCE((SELECT t.applied FROM tasks t WHERE t.tenant=j.tenant AND t.id=j.result->>'taskId'),false) AS applied FROM flow_jobs j WHERE j.tenant=$1 ORDER BY j.event_id DESC,j.id LIMIT 50").bind(t).fetch_all(&a.db).await?;
    let full = auth::SCOPES.iter().all(|s| auth::allowed(h, s));
    let value=json!(jobs.iter().map(|r|json!({"id":r.get::<String,_>("id"),"flow":r.get::<String,_>("flow"),"state":r.get::<String,_>("state"),"result":r.get::<Option<Value>,_>("result"),"error":r.get::<Option<String>,_>("error"),"cursor":r.get::<Option<String>,_>("cursor"),"execution":r.get::<Value,_>("execution"),"availableAt":r.get::<String,_>("available_at"),"applied":r.get::<bool,_>("applied")})).collect::<Vec<_>>());
    Ok(project(value, full))
}
pub(super) async fn list(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    auth::permit(&h, "automation.read")?;
    Ok(Json(json!({"jobs":values(&a,&merchant(&a,&h)?,&h).await?})))
}

/// A trace can contain private app output or model evidence; summaries never replay that authority.
fn project(mut value: Value, full: bool) -> Value {
    if !full && let Some(jobs) = value.as_array_mut() {
        for j in jobs {
            j["result"] = Value::Null;
            if !j["error"].is_null() {
                j["error"] =
                    json!("Flow action failed; detailed output requires source permissions");
            }
            let trace=j["execution"]["trace"].as_array().map(|rows| rows.iter().map(|r|json!({"node":r["node"],"action":r["action"],"matched":r["matched"]})).collect::<Vec<_>>()).unwrap_or_default();
            j["execution"] = json!({"trace":trace});
        }
    }
    value
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn restricted_trace_never_contains_action_output() {
        let jobs = json!([{"result":{"customerEmail":"private@example.test"},"error":"private detail","execution":{"trace":[{"node":"one","action":"app","result":{"secret":"private"}}]}}]);
        let masked = project(jobs.clone(), false);
        assert!(masked[0]["result"].is_null());
        assert!(masked[0]["execution"]["trace"][0]["result"].is_null());
        assert!(!masked.to_string().contains("private"));
        assert_eq!(project(jobs.clone(), true), jobs);
    }
}
