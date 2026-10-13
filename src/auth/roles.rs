//! Tenant-owned roles: current grants, revisioned edits, dependency-checked removal and shared history.
use crate::*;
pub(crate) const CAPABILITIES: &[(&str, &str)] = &[
    (
        "team.roles",
        "Read tenant role definitions and their revisions",
    ),
    (
        "team.role.save",
        "Create or revise a tenant role without broader delegation",
    ),
    (
        "team.role.dependencies",
        "Inspect current role membership and invitation dependencies",
    ),
    (
        "team.role.delete",
        "Remove an unused custom role with explicit approval and revision",
    ),
];
pub(crate) fn schema(name: &str) -> Option<Value> {
    CAPABILITIES.iter().any(|(n, _)| *n == name).then(|| json!({"type":"object","properties":{"id":{"type":"string","maxLength":32},"revision":{"type":"integer","minimum":0},"approve":{"type":"boolean"},"data":{"type":"object","properties":{"name":{"type":"object","additionalProperties":{"type":"string"}},"permissions":{"type":"array","items":{"type":"string","enum":auth::SCOPES}},"active":{"type":"boolean"}},"required":["name","permissions","active"],"additionalProperties":false}},"additionalProperties":false}))
}
pub(crate) fn router() -> Router<App> {
    Router::new()
        .secure_route("/api/workspace/roles", &[("GET", "team.manage")], get(list))
        .secure_route(
            "/api/workspace/roles/{id}",
            &[("PUT", "team.manage"), ("DELETE", "team.manage")],
            axum::routing::put(save).delete(remove),
        )
        .secure_route(
            "/api/workspace/roles/{id}/dependencies",
            &[("GET", "team.manage")],
            get(dependencies),
        )
}
async fn list(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    Ok(Json(invoke(&a, &h, "team.roles", &json!({})).await?))
}
async fn save(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
    Json(mut v): Json<Value>,
) -> Result<Json<Value>> {
    v["id"] = json!(id);
    Ok(Json(invoke(&a, &h, "team.role.save", &v).await?))
}
async fn remove(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
    Json(mut v): Json<Value>,
) -> Result<Json<Value>> {
    v["id"] = json!(id);
    Ok(Json(invoke(&a, &h, "team.role.delete", &v).await?))
}
async fn dependencies(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    Ok(Json(
        invoke(&a, &h, "team.role.dependencies", &json!({"id":id})).await?,
    ))
}
pub(crate) async fn grants(
    conn: &mut sqlx::PgConnection,
    tenant: &str,
    role: &str,
) -> Result<Value> {
    sqlx::query_scalar("SELECT data->'permissions' FROM workspace_roles WHERE tenant=$1 AND id=$2 AND data->>'active'='true'")
        .bind(tenant).bind(role).fetch_optional(conn).await?.ok_or(bad("Role unavailable"))
}
/// Rehydrate asynchronous/delegating actors under the tenant lifecycle lock. Owner authority is reserved.
pub(crate) async fn current(
    conn: &mut sqlx::PgConnection,
    h: &RequestContext,
    tenant: &str,
) -> Result<RequestContext> {
    let mut actor = h.clone();
    if header(h, "x-rac-user") != Some("bootstrap") {
        let r=sqlx::query("SELECT role,permissions FROM membership_grants WHERE tenant=$1 AND user_id=$2 AND active")
            .bind(tenant).bind(header(h,"x-rac-user").unwrap_or("")).fetch_optional(conn).await?
            .ok_or(Error(StatusCode::FORBIDDEN,"Membership or role is paused".into()))?;
        let permissions: Value = r.get("permissions");
        actor.principal.role = Some(r.get("role"));
        // Integration-key constraints may never be removed by a fresh membership read.
        let effective: Vec<_> = auth::SCOPES
            .iter()
            .filter(|scope| {
                auth::allowed(h, scope)
                    && (actor.principal.role.as_deref() == Some("owner")
                        || permissions
                            .as_array()
                            .is_some_and(|p| p.iter().any(|s| s.as_str() == Some(scope))))
            })
            .collect();
        actor.principal.permissions = Some(json!(effective).to_string());
        if header(h, "x-rac-role") != Some("owner")
            && actor.principal.role.as_deref() == Some("owner")
        {
            actor.principal.role = Some("admin".into());
        }
    }
    if auth::permit(&actor, "team.manage").is_err() {
        return Err(conflict(
            "Team permissions changed; reload before delegating",
        ));
    }
    Ok(actor)
}
async fn usage(conn: &mut sqlx::PgConnection, t: &str, id: &str) -> Result<Value> {
    let r=sqlx::query("SELECT (SELECT count(*) FROM memberships WHERE tenant=$1 AND role=$2) AS members,(SELECT count(*) FROM user_invites WHERE tenant=$1 AND role=$2) AS invitations")
        .bind(t).bind(id).fetch_one(conn).await?;
    let members: i64 = r.get("members");
    let invitations: i64 = r.get("invitations");
    Ok(json!({"members":members,"invitations":invitations,"blocked":members+invitations>0}))
}
pub(crate) async fn invoke(a: &App, h: &RequestContext, name: &str, v: &Value) -> Result<Value> {
    if schema(name).is_none()
        || v.as_object().is_none_or(|o| {
            o.keys()
                .any(|k| !["id", "revision", "data", "approve"].contains(&k.as_str()))
        })
    {
        return Err(bad("Invalid role command"));
    }
    let t = merchant(a, h)?;
    auth::permit(h, "team.manage")?;
    if name == "team.roles" {
        let (settings, _) = commerce::config(a, &t).await?;
        let rows=sqlx::query("SELECT id,data,builtin,revision FROM workspace_roles WHERE tenant=$1 ORDER BY builtin DESC,id LIMIT 100").bind(t).fetch_all(&a.db).await?;
        return Ok(
            json!({"mainLocale":settings.main_locale,"locales":settings.locales,"elements":rows.iter().map(|r|json!({"id":r.get::<String,_>("id"),"data":r.get::<Value,_>("data"),"builtin":r.get::<bool,_>("builtin"),"revision":r.get::<i64,_>("revision")})).collect::<Vec<_>>()}),
        );
    }
    let id = v["id"]
        .as_str()
        .filter(|s| apps::identifier(s))
        .ok_or(bad("Invalid role ID"))?;
    let mut tx = a.db.begin().await?;
    sqlx::query("SELECT id FROM tenants WHERE id=$1 FOR UPDATE")
        .bind(&t)
        .fetch_one(&mut *tx)
        .await?;
    let actor = current(&mut tx, h, &t).await?;
    let row = sqlx::query(
        "SELECT revision,builtin FROM workspace_roles WHERE tenant=$1 AND id=$2 FOR UPDATE",
    )
    .bind(&t)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?;
    if name == "team.role.dependencies" {
        let mut d = usage(&mut tx, &t, id).await?;
        d["revision"] = json!(row.ok_or(bad("Role not found"))?.get::<i64, _>("revision"));
        return Ok(d);
    }
    if id == "owner" {
        return Err(bad("Owner authority cannot be changed"));
    }
    let expected = v["revision"]
        .as_i64()
        .ok_or(bad("Role revision required"))?;
    if row
        .as_ref()
        .map(|r| r.get::<i64, _>("revision"))
        .unwrap_or(0)
        != expected
    {
        return Err(conflict("Role revision changed"));
    }
    history::context(&mut tx, &actor, "team.roles").await?;
    if name == "team.role.delete" {
        let row = row.ok_or(bad("Role not found"))?;
        if v["approve"] != true
            || row.get::<bool, _>("builtin")
            || usage(&mut tx, &t, id).await?["blocked"] == true
        {
            return Err(conflict("Role is standard or referenced; pause it instead"));
        }
        sqlx::query("DELETE FROM workspace_roles WHERE tenant=$1 AND id=$2")
            .bind(&t)
            .bind(id)
            .execute(&mut *tx)
            .await?;
    } else {
        let d = &v["data"];
        if d.as_object().is_none_or(|o| {
            o.len() != 3
                || o.keys()
                    .any(|k| !["name", "permissions", "active"].contains(&k.as_str()))
        }) || !d["active"].is_boolean()
            || !d["permissions"].is_array()
        {
            return Err(bad("Invalid role definition"));
        }
        auth::validate_permissions(&actor, &d["permissions"])?;
        let (settings, _) = commerce::config(a, &t).await?;
        commerce::validate_names(&d["name"], &settings, 100)?;
        if row.is_none() {
            let count: i64 =
                sqlx::query_scalar("SELECT count(*) FROM workspace_roles WHERE tenant=$1")
                    .bind(&t)
                    .fetch_one(&mut *tx)
                    .await?;
            if count >= 100 {
                return Err(bad("Role limit reached"));
            }
        }
        sqlx::query("INSERT INTO workspace_roles(tenant,id,data) VALUES($1,$2,$3) ON CONFLICT(tenant,id) DO UPDATE SET data=EXCLUDED.data,revision=workspace_roles.revision+1")
            .bind(&t).bind(id).bind(d).execute(&mut *tx).await?;
    }
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,'team.role_changed',$2)").bind(t).bind(json!({"actor":header(&actor,"x-rac-user"),"id":id,"revision":expected+1,"deleted":name=="team.role.delete"})).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(
        json!({"id":id,"revision":expected+1,"saved":name=="team.role.save","deleted":name=="team.role.delete"}),
    )
}
