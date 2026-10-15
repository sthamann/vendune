//! Actor-private workspace preferences; HTTP and MCP share CAS, bounds and the current membership.
use crate::*;
mod model;
pub(crate) use model::schema;

pub(crate) fn router() -> Router<App> {
    Router::new().secure_route(
        "/api/studio/workspace",
        &[("GET", "read"), ("PUT", "read")],
        get(read).put(save),
    )
}
async fn identity(a: &App, h: &RequestContext) -> Result<(String, String)> {
    let t = merchant(a, h)?;
    if !h.principal.personal_session {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Personal merchant session required".into(),
        ));
    }
    auth::mfa::personal(a, h).await?;
    let user = h.principal.user.clone().ok_or(Error(
        StatusCode::FORBIDDEN,
        "A personal merchant session is required".into(),
    ))?;
    if h.principal.app.is_some() {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Personal session required".into(),
        ));
    }
    Ok((t, user))
}
pub(crate) async fn invoke(a: &App, h: &RequestContext, name: &str, v: &Value) -> Result<Value> {
    let (t, user) = identity(a, h).await?;
    let mut tx = a.db.begin().await?;
    sqlx::query("SELECT set_config('rac.tenant',$1,true),set_config('rac.actor',$2,true)")
        .bind(&t)
        .bind(&user)
        .execute(&mut *tx)
        .await?;
    if !sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM membership_grants WHERE tenant=$1 AND user_id=$2 AND active)",
    )
    .bind(&t)
    .bind(&user)
    .fetch_one(&mut *tx)
    .await?
    {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Active membership required".into(),
        ));
    }
    if name == "studio.workspace.read" {
        let row = sqlx::query(
            "SELECT revision,data FROM studio_workspaces WHERE tenant=$1 AND user_id=$2",
        )
        .bind(&t)
        .bind(&user)
        .fetch_optional(&mut *tx)
        .await?;
        let versions=sqlx::query("SELECT revision,data,created_at::text AS created_at FROM studio_workspace_versions WHERE tenant=$1 AND user_id=$2 ORDER BY revision DESC LIMIT 20")
            .bind(&t).bind(&user).fetch_all(&mut *tx).await?;
        tx.commit().await?;
        return Ok(
            json!({"revision":row.as_ref().map(|r|r.get::<i64,_>("revision")).unwrap_or(0),
            "data":row.map(|r|r.get::<Value,_>("data")).unwrap_or_else(model::empty),
            "versions":versions.iter().map(|r|json!({"revision":r.get::<i64,_>("revision"),"data":r.get::<Value,_>("data"),"createdAt":r.get::<String,_>("created_at")})).collect::<Vec<_>>()}),
        );
    }
    if name != "studio.workspace.save" {
        return Err(bad("Unknown workspace operation"));
    }
    let data = model::validate(&v["data"])?;
    let expected = v["revision"]
        .as_i64()
        .filter(|n| *n >= 0)
        .ok_or(bad("Workspace revision required"))?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,945))")
        .bind(format!("{t}:{user}"))
        .execute(&mut *tx)
        .await?;
    let current = sqlx::query_scalar::<_, i64>(
        "SELECT revision FROM studio_workspaces WHERE tenant=$1 AND user_id=$2 FOR UPDATE",
    )
    .bind(&t)
    .bind(&user)
    .fetch_optional(&mut *tx)
    .await?
    .unwrap_or(0);
    if current != expected {
        return Err(conflict(
            "Workspace changed in another window; reload before saving",
        ));
    }
    let next = current + 1;
    sqlx::query("INSERT INTO studio_workspaces(tenant,user_id,revision,data) VALUES($1,$2,$3,$4) ON CONFLICT(tenant,user_id) DO UPDATE SET revision=EXCLUDED.revision,data=EXCLUDED.data,updated_at=now()")
        .bind(&t).bind(&user).bind(next).bind(&data).execute(&mut *tx).await?;
    sqlx::query(
        "INSERT INTO studio_workspace_versions(tenant,user_id,revision,data) VALUES($1,$2,$3,$4)",
    )
    .bind(&t)
    .bind(&user)
    .bind(next)
    .bind(&data)
    .execute(&mut *tx)
    .await?;
    sqlx::query(
        "DELETE FROM studio_workspace_versions WHERE tenant=$1 AND user_id=$2 AND revision <= $3",
    )
    .bind(&t)
    .bind(&user)
    .bind(next - 20)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(json!({"revision":next,"data":data}))
}
async fn read(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    Ok(Json(
        invoke(&a, &h, "studio.workspace.read", &json!({})).await?,
    ))
}
async fn save(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    Ok(Json(invoke(&a, &h, "studio.workspace.save", &v).await?))
}
