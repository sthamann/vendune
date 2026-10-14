//! Personal MFA enrollment and one-use sign-in challenges share the native session and encryption owners.
use crate::*;
pub(super) async fn personal<'a>(a: &App, h: &'a RequestContext) -> Result<&'a str> {
    let user = header(h, "x-rac-user")
        .filter(|u| *u != "bootstrap" && h.principal.app.is_none())
        .ok_or(bad("Personal account required"))?;
    let token = header(h, "authorization")
        .and_then(|s| s.strip_prefix("Bearer "))
        .ok_or(bad("Personal session required"))?;
    let personal:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM user_sessions WHERE digest=$1 AND user_id=$2 AND expires_at>now())").bind(hash(token)).bind(user).fetch_one(&a.db).await?;
    if !personal {
        return Err(bad("Personal session required"));
    }
    Ok(user)
}
fn unavailable() -> Error {
    Error(
        StatusCode::SERVICE_UNAVAILABLE,
        "Account encryption is unavailable".into(),
    )
}
fn invalid() -> Error {
    Error(
        StatusCode::UNAUTHORIZED,
        "Invalid or expired authentication code".into(),
    )
}
pub(super) async fn trusted_session_tx(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user: &str,
    token: Option<&str>,
) -> Result<bool> {
    let Some(token) = token else {
        return Ok(false);
    };
    Ok(sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM user_sessions WHERE user_id=$1 AND digest=$2 AND expires_at>now())").bind(user).bind(hash(token)).fetch_one(&mut **tx).await?)
}
pub(crate) fn router() -> Router<App> {
    Router::new()
        .secure_route("/api/auth/mfa", &[("GET", "read")], get(status))
        .secure_route("/api/auth/mfa/enroll", &[("POST", "read")], post(enroll))
        .secure_route("/api/auth/mfa/confirm", &[("POST", "read")], post(confirm))
        .secure_route("/api/auth/mfa/disable", &[("POST", "read")], post(disable))
        .secure_route("/api/auth/mfa/verify", &[("POST", "public")], post(verify))
}
pub(super) async fn challenge_tx(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user: &str,
    t: &str,
) -> Result<Option<Value>> {
    let enabled: bool = sqlx::query_scalar(
        "SELECT coalesce((SELECT enabled FROM merchant_mfa WHERE user_id=$1),false)",
    )
    .bind(user)
    .fetch_one(&mut **tx)
    .await?;
    if !enabled {
        return Ok(None);
    }
    sqlx::query("DELETE FROM merchant_mfa_challenges WHERE user_id=$1 AND expires_at<=now()")
        .bind(user)
        .execute(&mut **tx)
        .await?;
    let count: i64 =
        sqlx::query_scalar("SELECT count(*) FROM merchant_mfa_challenges WHERE user_id=$1")
            .bind(user)
            .fetch_one(&mut **tx)
            .await?;
    if count >= 12 {
        return Err(Error(
            StatusCode::TOO_MANY_REQUESTS,
            "Too many pending sign-ins. Wait five minutes.".into(),
        ));
    }
    let token = format!("{}{}", uid(), uid());
    sqlx::query("INSERT INTO merchant_mfa_challenges(digest,user_id,tenant) VALUES($1,$2,$3)")
        .bind(hash(&token))
        .bind(user)
        .bind(t)
        .execute(&mut **tx)
        .await?;
    Ok(Some(
        json!({"mfaRequired":true,"challengeToken":token,"expiresIn":300}),
    ))
}
async fn status(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    let row=sqlx::query("SELECT enabled,revision,jsonb_array_length(recovery_digests) AS remaining FROM merchant_mfa WHERE user_id=$1").bind(personal(&a,&h).await?).fetch_optional(&a.db).await?;
    Ok(Json(row.map(|r|json!({"enabled":r.get::<bool,_>("enabled"),"revision":r.get::<i64,_>("revision"),"recoveryCodesRemaining":r.get::<i32,_>("remaining")})).unwrap_or(json!({"enabled":false,"revision":0,"recoveryCodesRemaining":0}))))
}
async fn password_tx(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user: &str,
    v: &Value,
) -> Result<()> {
    let saved: String =
        sqlx::query_scalar("SELECT password_hash FROM merchant_users WHERE id=$1 FOR UPDATE")
            .bind(user)
            .fetch_one(&mut **tx)
            .await?;
    if !super::verify_password(super::password(v)?, saved).await? {
        return Err(invalid());
    }
    Ok(())
}
fn live(h: &RequestContext) -> Result<()> {
    if h.principal.app.is_some() || h.principal.user.as_deref() == Some("bootstrap") {
        return Err(bad("Personal account required"));
    }
    Ok(())
}
async fn enroll(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    live(&h)?;
    let user = personal(&a, &h).await?;
    if staging::parent(&a, &tenant(&h)?).await?.is_some() {
        return Err(bad(
            "Account security is available only in a live workspace",
        ));
    }
    let secret = super::totp::secret().map_err(|_| unavailable())?;
    let cipher = veyndo::inference::settings::seal(&format!("mfa:{user}"), &secret)
        .map_err(|_| unavailable())?;
    let mut tx = a.db.begin().await?;
    password_tx(&mut tx, user, &v).await?;
    let row=sqlx::query("INSERT INTO merchant_mfa(user_id,pending_ciphertext,pending_expires_at) VALUES($1,$2,now()+interval '10 minutes') ON CONFLICT(user_id) DO UPDATE SET pending_ciphertext=EXCLUDED.pending_ciphertext,pending_expires_at=EXCLUDED.pending_expires_at WHERE NOT merchant_mfa.enabled RETURNING revision").bind(user).bind(cipher).fetch_optional(&mut *tx).await?.ok_or(conflict("MFA is already enabled"))?;
    let email: String = sqlx::query_scalar("SELECT email FROM merchant_users WHERE id=$1")
        .bind(user)
        .fetch_one(&mut *tx)
        .await?;
    tx.commit().await?;
    let mut url = reqwest::Url::parse("otpauth://totp/Veyndo").unwrap();
    url.set_path(&format!("Veyndo:{email}"));
    url.query_pairs_mut()
        .append_pair("secret", &secret)
        .append_pair("issuer", "Veyndo")
        .append_pair("algorithm", "SHA1")
        .append_pair("digits", "6")
        .append_pair("period", "30");
    Ok(Json(
        json!({"secret":secret,"uri":url.to_string(),"revision":row.get::<i64,_>("revision"),"expiresIn":600}),
    ))
}
async fn confirm(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let user = personal(&a, &h).await?;
    if staging::parent(&a, &tenant(&h)?).await?.is_some() {
        return Err(bad(
            "Account security is available only in a live workspace",
        ));
    }
    let mut tx = a.db.begin().await?;
    password_tx(&mut tx, user, &v).await?;
    let row=sqlx::query("SELECT pending_ciphertext,revision FROM merchant_mfa WHERE user_id=$1 AND NOT enabled AND pending_expires_at>now() FOR UPDATE").bind(user).fetch_optional(&mut *tx).await?.ok_or(invalid())?;
    if v["revision"].as_i64() != Some(row.get("revision")) {
        return Err(conflict("Security settings changed; reload"));
    }
    let cipher: String = row.get("pending_ciphertext");
    let secret = veyndo::inference::settings::open(&format!("mfa:{user}"), &cipher)
        .map_err(|_| unavailable())?;
    let step = super::totp::matched(
        &secret,
        v["code"].as_str().unwrap_or(""),
        chrono::Utc::now().timestamp(),
        -1,
    )
    .ok_or(invalid())?;
    let codes: Vec<String> = (0..8).map(|_| uid()).collect();
    let digests: Vec<String> = codes.iter().map(|c| hash(c)).collect();
    sqlx::query("UPDATE merchant_mfa SET ciphertext=$2,enabled=true,pending_ciphertext=NULL,pending_expires_at=NULL,recovery_digests=$3,last_step=$4,revision=revision+1,updated_at=now() WHERE user_id=$1").bind(user).bind(cipher).bind(json!(digests)).bind(step).execute(&mut *tx).await?;
    revoke_tx(&mut tx, user).await?;
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,'account.security.updated',$2)")
        .bind(tenant(&h)?)
        .bind(
            json!({"userId":user,"action":"mfa.enabled","revision":row.get::<i64,_>("revision")+1}),
        )
        .execute(&mut *tx)
        .await?;
    let session = super::sessions::issue_verified_tx(
        &a,
        &mut tx,
        user,
        &tenant(&h)?,
        super::sessions::SessionProof::SecondFactor,
    )
    .await?;
    tx.commit().await?;
    Ok(Json(
        json!({"enabled":true,"recoveryCodes":codes,"session":session}),
    ))
}
async fn revoke_tx(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>, user: &str) -> Result<()> {
    for sql in [
        "DELETE FROM user_sessions WHERE user_id=$1",
        "DELETE FROM merchant_handoffs WHERE user_id=$1",
        "DELETE FROM merchant_mfa_challenges WHERE user_id=$1",
    ] {
        sqlx::query(sql).bind(user).execute(&mut **tx).await?;
    }
    Ok(())
}
async fn consume_code(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user: &str,
    code: &str,
) -> Result<()> {
    let row=sqlx::query("SELECT ciphertext,last_step,recovery_digests FROM merchant_mfa WHERE user_id=$1 AND enabled FOR UPDATE").bind(user).fetch_optional(&mut **tx).await?.ok_or(invalid())?;
    let mut codes: Vec<String> =
        serde_json::from_value(row.get("recovery_digests")).map_err(|_| invalid())?;
    if code.len() == 32
        && let Some(i) = codes.iter().position(|digest| digest == &hash(code))
    {
        codes.remove(i);
        sqlx::query("UPDATE merchant_mfa SET recovery_digests=$2 WHERE user_id=$1")
            .bind(user)
            .bind(json!(codes))
            .execute(&mut **tx)
            .await?;
        return Ok(());
    }
    let secret = veyndo::inference::settings::open(
        &format!("mfa:{user}"),
        &row.get::<String, _>("ciphertext"),
    )
    .map_err(|_| unavailable())?;
    let step = super::totp::matched(
        &secret,
        code,
        chrono::Utc::now().timestamp(),
        row.get("last_step"),
    )
    .ok_or(invalid())?;
    sqlx::query("UPDATE merchant_mfa SET last_step=$2 WHERE user_id=$1")
        .bind(user)
        .bind(step)
        .execute(&mut **tx)
        .await?;
    Ok(())
}
async fn disable(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let user = personal(&a, &h).await?;
    if staging::parent(&a, &tenant(&h)?).await?.is_some() {
        return Err(bad(
            "Account security is available only in a live workspace",
        ));
    }
    let mut tx = a.db.begin().await?;
    password_tx(&mut tx, user, &v).await?;
    consume_code(&mut tx, user, v["code"].as_str().unwrap_or("")).await?;
    let changed=sqlx::query("UPDATE merchant_mfa SET enabled=false,ciphertext=NULL,recovery_digests='[]',pending_ciphertext=NULL,pending_expires_at=NULL,revision=revision+1,updated_at=now() WHERE user_id=$1 AND revision=$2").bind(user).bind(v["revision"].as_i64().ok_or(bad("Revision required"))?).execute(&mut *tx).await?.rows_affected();
    if changed != 1 {
        return Err(conflict("Security settings changed; reload"));
    }
    revoke_tx(&mut tx, user).await?;
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,'account.security.updated',$2)").bind(tenant(&h)?).bind(json!({"userId":user,"action":"mfa.disabled","revision":v["revision"].as_i64().unwrap()+1})).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(json!({"enabled":false,"signInRequired":true})))
}
async fn verify(State(a): State<App>, Json(v): Json<Value>) -> Result<Json<Value>> {
    let token = v["challengeToken"]
        .as_str()
        .filter(|s| s.len() == 64)
        .ok_or(invalid())?;
    let row=sqlx::query("UPDATE merchant_mfa_challenges SET attempts=attempts+1 WHERE digest=$1 AND expires_at>now() AND attempts<5 RETURNING user_id,tenant").bind(hash(token)).fetch_optional(&a.db).await?.ok_or(invalid())?;
    let user: String = row.get("user_id");
    let t: String = row.get("tenant");
    let mut tx = a.db.begin().await?;
    sqlx::query("SELECT id FROM merchant_users WHERE id=$1 FOR UPDATE")
        .bind(&user)
        .fetch_one(&mut *tx)
        .await?;
    let valid:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM merchant_mfa_challenges WHERE digest=$1 AND expires_at>now()) AND EXISTS(SELECT 1 FROM membership_grants WHERE user_id=$2 AND tenant=$3 AND active)").bind(hash(token)).bind(&user).bind(&t).fetch_one(&mut *tx).await?;
    if !valid {
        return Err(invalid());
    }
    consume_code(&mut tx, &user, v["code"].as_str().unwrap_or("")).await?;
    sqlx::query("DELETE FROM merchant_mfa_challenges WHERE digest=$1")
        .bind(hash(token))
        .execute(&mut *tx)
        .await?;
    let session = super::sessions::issue_verified_tx(
        &a,
        &mut tx,
        &user,
        &t,
        super::sessions::SessionProof::SecondFactor,
    )
    .await?;
    tx.commit().await?;
    Ok(Json(session))
}
