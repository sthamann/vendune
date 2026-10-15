//! Connect separately admitted SQL roles within one process budget; rotate authenticated transaction scopes.
use crate::*;
use veyndo::{database_scope::Signer, scoped_pool::ScopedPool};

pub(crate) async fn connect(fallback: &str) -> ScopedPool {
    let system_url = env::var("DATABASE_RUNTIME_URL").unwrap_or_else(|_| fallback.to_owned());
    let Some(tenant_url) = env::var("DATABASE_TENANT_URL").ok() else {
        assert!(
            env::var("DB_SCOPE_REQUIRED").as_deref() != Ok("true"),
            "Authenticated SQL scope requires DATABASE_TENANT_URL and a separate system runtime connection"
        );
        let raw = super::pool::pool_options()
            .connect(&system_url)
            .await
            .expect("commerce connection");
        return ScopedPool::new(raw, runtime_config::get().transaction_pooling);
    };
    assert!(
        runtime_config::get().strict,
        "Authenticated SQL scope requires DB_RLS_REQUIRED=true"
    );
    let budget = runtime_config::get().db_pool_max;
    assert!(
        budget >= 4,
        "Authenticated SQL scope requires DB_POOL_MAX>=4, shared by both pools"
    );
    let system_max = (budget / 3).clamp(2, 4);
    let system = super::pool::options(system_max, 0)
        .connect(&system_url)
        .await
        .expect("system runtime connection");
    let tenant = super::pool::options(budget - system_max, 0)
        .connect(&tenant_url)
        .await
        .expect("tenant runtime connection");
    let tenant_role: String = sqlx::query_scalar("SELECT session_user::text")
        .fetch_one(&tenant)
        .await
        .expect("tenant database role");
    let system_role: String = sqlx::query_scalar("SELECT session_user::text")
        .fetch_one(&system)
        .await
        .expect("system database role");
    assert_ne!(
        tenant_role, system_role,
        "Tenant and system database logins must differ"
    );
    let unsafe_role:bool=sqlx::query_scalar("SELECT r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR EXISTS(SELECT 1 FROM pg_roles other WHERE other.oid<>r.oid AND pg_has_role(r.oid,other.oid,'MEMBER')) OR has_schema_privilege(current_user,'public','CREATE') OR has_database_privilege(current_user,current_database(),'CREATE') OR has_database_privilege(current_user,current_database(),'TEMPORARY') OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND (pg_has_role(current_user,c.relowner,'MEMBER') OR has_table_privilege(current_user,c.oid,'TRUNCATE'))) FROM pg_roles r WHERE r.rolname=session_user")
        .fetch_one(&tenant).await.expect("tenant authority audit");
    assert!(
        !unsafe_role,
        "Tenant connection must not own relations, inherit roles, create schema/temporary objects, truncate or bypass RLS"
    );
    for table in [
        "user_sessions",
        "merchant_mfa",
        "merchant_identities",
        "platform_ai",
        "platform_operators",
    ] {
        let exposed: bool=sqlx::query_scalar("SELECT has_table_privilege(current_user,$1,'SELECT') OR has_table_privilege(current_user,$1,'INSERT') OR has_table_privilege(current_user,$1,'UPDATE') OR has_table_privilege(current_user,$1,'DELETE')")
            .bind(table).fetch_one(&tenant).await.expect("identity authority audit");
        assert!(
            !exposed,
            "Tenant connection has privileged identity table access"
        );
    }
    let identity_secret:bool=sqlx::query_scalar("SELECT has_column_privilege(current_user,'merchant_users','password_hash','SELECT') OR has_column_privilege(current_user,'merchant_users','password_hash','UPDATE') OR has_table_privilege(current_user,'merchant_users','INSERT') OR has_table_privilege(current_user,'merchant_users','DELETE')")
        .fetch_one(&tenant).await.expect("identity column authority audit");
    assert!(
        !identity_secret,
        "Tenant connection has credential column or identity mutation access"
    );
    let coverage:i64=sqlx::query_scalar("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname NOT LIKE 'connector_%' AND EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='tenant' AND NOT a.attisdropped) AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity OR NOT EXISTS(SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid AND p.polname='authenticated_scope' AND NOT p.polpermissive))")
        .fetch_one(&system).await.expect("authenticated scope coverage audit");
    assert_eq!(
        coverage, 0,
        "Tenant table missing authenticated restrictive scope policy"
    );
    let status: Value = sqlx::query_scalar("SELECT public.veyndo_scope_status()")
        .fetch_one(&system)
        .await
        .expect("database scope status");
    assert!(
        status["enforced"] == true || env::var("DB_SCOPE_STAGED").as_deref() == Ok("true"),
        "Database scope is not enforced; staged rollout must be explicit"
    );
    let signer = Signer::load(&system, &tenant_role)
        .await
        .expect("database scope signing authority");
    let db = ScopedPool::with_authority(tenant, system, signer);
    let refresh = db.clone();
    tokio::spawn(async move {
        let mut timer = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            timer.tick().await;
            if refresh.refresh_authority().await.is_err() {
                eprintln!(
                    "Database scope key refresh unavailable; existing tickets expire and fail closed"
                );
            }
        }
    });
    db
}
