//! Verified-mail recovery discovers only the canonical account's active memberships; it never provisions a shop.
use crate::*;
pub(crate) async fn lookup(State(a): State<App>, Json(v): Json<Value>) -> Result<Json<Value>> {
    let c = super::broker::assertion(&a, "/api/identity/recovery", &v).await?;
    let email = super::email(&c)?;
    let mut tx = a.db.begin().await?;
    let row =
        sqlx::query("SELECT id,credential_revision FROM merchant_users WHERE email=$1 FOR UPDATE")
            .bind(&email)
            .fetch_optional(&mut *tx)
            .await?;
    let Some(row) = row else {
        return Ok(Json(json!({"workspaces":[]})));
    };
    let user: String = row.get("id");
    let revision: i64 = row.get("credential_revision");
    sqlx::query("INSERT INTO merchant_identities(issuer,subject,user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING").bind(c["iss"].as_str().unwrap()).bind(c["sub"].as_str().unwrap()).bind(&user).execute(&mut *tx).await?;
    let linked:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM merchant_identities WHERE issuer=$1 AND subject=$2 AND user_id=$3)").bind(c["iss"].as_str().unwrap()).bind(c["sub"].as_str().unwrap()).bind(&user).fetch_one(&mut *tx).await?;
    if !linked {
        return Err(Error(
            StatusCode::UNAUTHORIZED,
            "Merchant identity unavailable".into(),
        ));
    }
    sqlx::query("UPDATE merchant_users SET email_verified_at=now() WHERE id=$1")
        .bind(&user)
        .execute(&mut *tx)
        .await?;
    let rows=sqlx::query("SELECT t.id,t.name FROM membership_grants m JOIN tenants t ON t.id=m.tenant WHERE m.user_id=$1 AND m.active AND t.status='active' ORDER BY t.name LIMIT 100").bind(user).fetch_all(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(
        json!({"credentialRevision":revision,"workspaces":rows.iter().map(|r|json!({"id":r.get::<String,_>("id"),"name":r.get::<String,_>("name")})).collect::<Vec<_>>()}),
    ))
}
