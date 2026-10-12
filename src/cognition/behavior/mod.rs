//! Native behavior analytics projects the existing event ledger into private shop knowledge.
use crate::*;
mod capture;
mod geography;
mod input;
mod journey;
mod report;
pub(crate) fn router() -> Router<App> {
    Router::new()
        .route(
            "/store-api/behavior/events",
            post(capture::capture)
                .get(capture::export)
                .delete(capture::forget),
        )
        .secure_route(
            "/api/knowledge/behavior",
            &[("POST", "knowledge.read")],
            post(report_api),
        )
        .secure_route(
            "/api/knowledge/behavior/journey",
            &[("POST", "customers.pii")],
            post(journey_api),
        )
}
async fn report_api(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    Ok(Json(invoke(&a, &h, "knowledge.behavior", &v).await?))
}
async fn journey_api(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    Ok(Json(
        invoke(&a, &h, "knowledge.behavior.journey", &v).await?,
    ))
}
pub(crate) fn schema(name: &str) -> Option<Value> {
    let props = match name {
        "knowledge.behavior" => {
            json!({"days":{"type":"integer","minimum":1,"maximum":30},"salesChannelId":{"type":"string"}})
        }
        "knowledge.behavior.journey" => {
            json!({"session":{"type":"string","minLength":64,"maxLength":64}})
        }
        _ => return None,
    };
    Some(json!({"type":"object","properties":props,"additionalProperties":false}))
}
pub(crate) async fn invoke(a: &App, h: &RequestContext, name: &str, v: &Value) -> Result<Value> {
    let t = merchant(a, h)?;
    match name {
        "knowledge.behavior" => {
            auth::permit(h, "knowledge.read")?;
            report::read(a, h, &t, v).await
        }
        "knowledge.behavior.journey" => {
            auth::permit(h, "customers.pii")?;
            journey::read(a, h, &t, v).await
        }
        _ => Err(bad("Unknown behavioral capability")),
    }
}
pub(crate) async fn retire(a: &App) -> Result<()> {
    sqlx::query("DELETE FROM session_signal_events WHERE (tenant,id) IN (SELECT tenant,id FROM session_signal_events WHERE purpose='analytics' AND expires_at<=now() ORDER BY expires_at LIMIT 1000 FOR UPDATE SKIP LOCKED)").execute(&a.db).await?;
    Ok(())
}
