//! Fine-grained workspace overrides. Owners retain control; delegates cannot grant rights they lack.
use super::permit;
use crate::{
    App, Error, Json, Path, RequestContext, Result, Row, State, StatusCode, Value, bad, hash,
    header, json, merchant, verified_kernel,
};

pub(crate) const SCOPES: &[&str] = &[
    "overview.read",
    "assistant.use",
    "automation.read",
    "automation.manage",
    "channels.read",
    "channels.manage",
    "developer.read",
    "developer.manage",
    "environments.read",
    "environments.manage",
    "knowledge.write",
    "ai.manage",
    "apps.read",
    "pos.use",
    "b2b.read",
    "b2b.manage",
    "catalog.read",
    "catalog.write",
    "orders.read",
    "orders.write",
    "customers.read",
    "customers.pii",
    "customers.write",
    "documents.read",
    "documents.create",
    "payments.read",
    "payments.manage",
    "team.manage",
    "settings.read",
    "settings.write",
    "apps.manage",
    "knowledge.read",
];
pub(crate) fn scope(kind: &str) -> &str {
    match kind {
        "catalog" => "catalog.write",
        "users" => "team.manage",
        "operations" => "orders.write",
        "settings" => "settings.write",
        "extension" => "apps.manage",
        x => x,
    }
}
pub(crate) fn allowed(h: &RequestContext, kind: &str) -> bool {
    let role = header(h, "x-rac-role").unwrap_or("");
    if kind == "read" {
        return !role.is_empty();
    }
    let requested = scope(kind);
    let raw = header(h, "x-rac-permissions");
    let explicit_grant = raw.is_some_and(|raw| {
        serde_json::from_str::<Vec<String>>(raw)
            .is_ok_and(|v| v.iter().any(|x| x == requested) || compatibility_grant(&v, requested))
    });
    let default_grant = match requested {
        "catalog.read" | "orders.read" | "payments.read" | "settings.read" | "knowledge.read"
        | "overview.read" | "assistant.use" | "automation.read" | "channels.read"
        | "environments.read" | "apps.read" => !role.is_empty(),
        "catalog.write" | "knowledge.write" => ["admin", "editor"].contains(&role),
        x if SCOPES.contains(&x) => role == "admin",
        _ => false,
    };
    verified_kernel::scope_admissible(
        !role.is_empty(),
        SCOPES.contains(&requested),
        role == "owner",
        raw.is_some(),
        explicit_grant,
        default_grant,
    )
}
/// Existing broad settings rights remain broad; new domain scopes permit narrower delegation.
fn compatibility_grant(values: &[String], requested: &str) -> bool {
    let has = |s: &str| values.iter().any(|v| v == s);
    match requested {
        "channels.read" | "automation.read" => has("settings.read"),
        "channels.manage" | "automation.manage" | "ai.manage" => has("settings.write"),
        "developer.read" | "developer.manage" => has("apps.manage") && has("team.manage"),
        "environments.read" | "environments.manage" => has("team.manage"),
        "knowledge.write" => has("catalog.write"),
        "apps.read" => has("apps.manage"),
        "overview.read" => has("orders.read"),
        _ => false,
    }
}
pub(crate) fn validate_permissions(h: &RequestContext, v: &Value) -> Result<Value> {
    if v.is_null() {
        return Ok(Value::Null);
    }
    let values = v
        .as_array()
        .filter(|x| x.len() <= SCOPES.len())
        .ok_or(bad("Invalid permission list"))?;
    for x in values {
        let x = x.as_str().ok_or(bad("Invalid permission"))?;
        if !SCOPES.contains(&x) {
            return Err(bad("Unknown permission"));
        }
        if !allowed(h, x) {
            return Err(Error(
                StatusCode::FORBIDDEN,
                "Cannot delegate a permission you do not hold".into(),
            ));
        }
    }
    Ok(v.clone())
}
pub(crate) async fn access(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    merchant(&a, &h)?;
    Ok(Json(
        json!({"permissions":SCOPES.iter().filter(|s|allowed(&h,s)).collect::<Vec<_>>(),"available":SCOPES,"personalSession":h.principal.personal_session}),
    ))
}
pub(crate) async fn sessions(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    merchant(&a, &h)?;
    let user = header(&h, "x-rac-user").unwrap();
    let rows=sqlx::query("SELECT digest,created_at::text AS created,expires_at::text AS expires FROM user_sessions WHERE user_id=$1 AND expires_at>now() ORDER BY created_at DESC LIMIT 100").bind(user).fetch_all(&a.db).await?;
    let current = header(&h, "authorization")
        .and_then(|s| s.strip_prefix("Bearer "))
        .map(hash);
    Ok(Json(
        json!({"sessions":rows.iter().map(|r|{let id:String=r.get("digest");json!({"id":id,"current":current.as_ref()==Some(&id),"createdAt":r.get::<String,_>("created"),"expiresAt":r.get::<String,_>("expires")})}).collect::<Vec<_>>()}),
    ))
}
pub(crate) async fn revoke_session(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    merchant(&a, &h)?;
    sqlx::query("DELETE FROM user_sessions WHERE user_id=$1 AND digest=$2")
        .bind(header(&h, "x-rac-user").unwrap())
        .bind(id)
        .execute(&a.db)
        .await?;
    Ok(Json(json!({"revoked":true})))
}
pub(crate) async fn revoke_invite(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    permit(&h, "users")?;
    sqlx::query("UPDATE user_invites SET redeemed_at=now() WHERE tenant=$1 AND id=$2 AND redeemed_at IS NULL").bind(t).bind(id).execute(&a.db).await?;
    Ok(Json(json!({"revoked":true})))
}
