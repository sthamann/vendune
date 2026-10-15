//! Saved runs retain an upper authority bound; every continuation rechecks credential, membership and private stage admission.
use super::*;
pub(super) async fn headers(a: &App, row: &sqlx::postgres::PgRow) -> Result<RequestContext> {
    let t: String = row.get("tenant");
    let actor: String = row.get("run_actor");
    let mut h = RequestContext::new();
    h.insert(
        "x-tenant",
        t.parse().map_err(|_| bad("Invalid saved tenant"))?,
    );
    h.principal.tenant = Some(t.clone());
    h.principal.user = Some(actor.clone());
    h.principal.personal_session = row.get("run_personal");
    veyndo::tenant_scope::scoped(veyndo::tenant_scope::Scope::System,async {
        if actor=="bootstrap" {
            if !runtime_config::get().allow_bootstrap { return Err(Error(StatusCode::FORBIDDEN,"Bootstrap agent authority disabled".into())); }
            h.principal.role=Some("owner".into());
        } else {
            let digest:Option<String>=row.get("run_credential");
            let valid:bool=sqlx::query_scalar("SELECT CASE WHEN $3 THEN EXISTS(SELECT 1 FROM user_sessions WHERE digest=$1 AND user_id=$2 AND expires_at>now()) ELSE EXISTS(SELECT 1 FROM integration_keys WHERE digest=$1 AND user_id=$2 AND tenant=coalesce((SELECT live_tenant FROM shop_environments WHERE tenant=$4),$4) AND app_id IS NULL AND expires_at>now()) END")
                .bind(digest).bind(&actor).bind(h.principal.personal_session).bind(&t).fetch_one(&a.db).await?;
            if !valid { return Err(Error(StatusCode::FORBIDDEN,"Agent credential expired or revoked".into())); }
            let member=sqlx::query("SELECT role,permissions FROM membership_grants WHERE tenant=coalesce((SELECT live_tenant FROM shop_environments WHERE tenant=$1),$1) AND user_id=$2 AND active")
                .bind(&t).bind(&actor).fetch_optional(&a.db).await?.ok_or(Error(StatusCode::FORBIDDEN,"Agent owner lost membership".into()))?;
            h.principal.role=Some(member.get("role"));
            let permissions:Value=member.get("permissions");
            h.principal.permissions=(!permissions.is_null()).then(||permissions.to_string());
            let scopes:Value=row.get("run_scopes");
            if scopes.as_array().is_none_or(|s|s.iter().any(|s|s.as_str().is_none_or(|s|!auth::allowed(&h,s)))) { return Err(Error(StatusCode::FORBIDDEN,"Agent owner permissions changed; start a new reviewed run".into())); }
            if !h.principal.personal_session {
                let current:Value=sqlx::query_scalar("SELECT permissions FROM integration_keys WHERE digest=$1 AND user_id=$2 AND expires_at>now()")
                    .bind(row.get::<Option<String>,_>("run_credential")).bind(&actor).fetch_one(&a.db).await?;
                let mut key=h.clone(); key.principal.role=Some("admin".into()); key.principal.permissions=Some(current.to_string());
                if scopes.as_array().unwrap().iter().any(|s|s.as_str().is_none_or(|scope|!auth::allowed(&key,scope))) { return Err(Error(StatusCode::FORBIDDEN,"Integration permissions narrowed".into())); }
            }
        }
        h.principal.role=Some("admin".into());
        h.principal.permissions=Some(row.get::<Value,_>("run_scopes").to_string());
        let request:Value=row.get("run_request");
        h.insert("x-commerce-locale",request["locale"].as_str().unwrap_or("en-GB").parse().map_err(|_|bad("Invalid saved locale"))?);
        if let Some(channel)=request["channel"].as_str() { h.insert("sw-sales-channel-id",channel.parse().map_err(|_|bad("Invalid saved channel"))?); }
        let admitted=sqlx::query("SELECT t.status,e.preview_owner,e.preview_until>now() AS valid FROM tenants t LEFT JOIN shop_environments e ON e.tenant=$1 WHERE t.id=coalesce(e.live_tenant,$1)").bind(&t).fetch_optional(&a.db).await?.ok_or(bad("Shop no longer exists"))?;
        if admitted.get::<String,_>("status")!="active" || admitted.get::<Option<String>,_>("preview_owner").is_some_and(|owner|owner!=actor || !h.principal.personal_session || admitted.get::<Option<bool>,_>("valid")!=Some(true)) { return Err(Error(StatusCode::FORBIDDEN,"Agent shop or personal preview is unavailable".into())); }
        agent::assistant_access(&h)?;
        Ok(h)
    }).await
}
