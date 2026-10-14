//! One-time personal-session handoff to the Studio; no passwords or bearer tokens in links.
use super::permit;
use crate::{
    App, Error, Json, RequestContext, Result, Row, State, StatusCode, Value, bad, hash, header,
    json, tenant, uid,
};

pub(crate) async fn create(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    permit(&h, "read")?;
    let user = header(&h, "x-rac-user")
        .filter(|u| *u != "bootstrap")
        .ok_or(bad("Personal account required"))?;
    let initialized: bool =
        sqlx::query_scalar("SELECT password_initialized FROM merchant_users WHERE id=$1")
            .bind(user)
            .fetch_one(&a.db)
            .await?;
    if !initialized {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Merchant password setup required".into(),
        ));
    }
    let ticket = format!("{}{}", uid(), uid());
    sqlx::query("DELETE FROM merchant_handoffs WHERE expires_at<now()")
        .execute(&a.db)
        .await?;
    let token = header(&h, "authorization")
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or(bad("Personal session required"))?;
    let n=sqlx::query("INSERT INTO merchant_handoffs(digest,user_id,tenant,expires_at,session_digest) SELECT $1,$2,$3,now()+interval '60 seconds',digest FROM user_sessions WHERE digest=$4 AND user_id=$2 AND expires_at>now()")
        .bind(hash(&ticket)).bind(user).bind(tenant(&h)?).bind(hash(token)).execute(&a.db).await?.rows_affected();
    if n != 1 {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Personal session required".into(),
        ));
    }
    Ok(Json(json!({"ticket":ticket,"expiresIn":60})))
}
pub(crate) async fn redeem(State(a): State<App>, Json(v): Json<Value>) -> Result<Json<Value>> {
    let ticket = v["ticket"]
        .as_str()
        .filter(|s| s.len() == 64 && s.bytes().all(|c| c.is_ascii_hexdigit()))
        .ok_or(bad("Invalid login link"))?;
    let mut tx = a.db.begin().await?;
    let user: String = sqlx::query_scalar(
        "SELECT user_id FROM merchant_handoffs WHERE digest=$1 AND expires_at>now()",
    )
    .bind(hash(ticket))
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(Error(
        StatusCode::UNAUTHORIZED,
        "Login link expired or already used".into(),
    ))?;
    sqlx::query("SELECT id FROM merchant_users WHERE id=$1 FOR UPDATE")
        .bind(&user)
        .fetch_one(&mut *tx)
        .await?;
    let row=sqlx::query("DELETE FROM merchant_handoffs h USING user_sessions s WHERE h.digest=$1 AND h.expires_at>now() AND h.session_digest=s.digest AND s.expires_at>now() RETURNING h.user_id,h.tenant")
        .bind(hash(ticket)).fetch_optional(&mut *tx).await?.ok_or(Error(StatusCode::UNAUTHORIZED,"Login link expired or already used".into()))?;
    let user: String = row.get("user_id");
    let tenant: String = row.get("tenant");
    let active: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM membership_grants m JOIN merchant_users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.tenant=$2 AND m.active AND u.password_initialized)",
    )
    .bind(&user)
    .bind(&tenant)
    .fetch_one(&mut *tx)
    .await?;
    if !active {
        return Err(Error(StatusCode::FORBIDDEN, "Shop access revoked".into()));
    }
    let session = super::sessions::issue_verified_tx(
        &a,
        &mut tx,
        &user,
        &tenant,
        super::sessions::SessionProof::PersonalHandoff,
    )
    .await?;
    tx.commit().await?;
    Ok(Json(session))
}
