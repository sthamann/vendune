//! A freshly verified external identity may request its existing personal session; MFA remains mandatory.
use crate::*;
pub(crate) async fn session(State(a): State<App>, Json(v): Json<Value>) -> Result<Json<Value>> {
    let c = super::broker::assertion(&a, "/api/identity/session", &v).await?;
    let email = super::email(&c)?;
    let row=sqlx::query("SELECT u.id,m.tenant FROM merchant_users u JOIN membership_grants m ON m.user_id=u.id AND m.active JOIN tenants t ON t.id=m.tenant AND t.status='active' WHERE u.email=$1 ORDER BY m.tenant LIMIT 1").bind(email).fetch_optional(&a.db).await?;
    let Some(row) = row else {
        return Ok(Json(json!({"newAccount":true})));
    };
    sqlx::query(
        "UPDATE merchant_users SET email_verified_at=COALESCE(email_verified_at,now()) WHERE id=$1",
    )
    .bind(row.get::<String, _>("id"))
    .execute(&a.db)
    .await?;
    Ok(Json(
        super::sessions::issue_session_with_proof(
            &a,
            &row.get::<String, _>("id"),
            &row.get::<String, _>("tenant"),
            c["sessionToken"].as_str(),
        )
        .await?,
    ))
}
