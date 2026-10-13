//! Re-resolves active customer sessions, company policy and unit membership at every procurement boundary.
use super::*;
pub(crate) async fn identity(conn: &mut sqlx::PgConnection, h: &RequestContext) -> Result<String> {
    let token = header(h, "x-customer-token").ok_or(Error(
        StatusCode::UNAUTHORIZED,
        "Customer login required".into(),
    ))?;
    sqlx::query_scalar("SELECT c.id FROM customer_sessions s JOIN customers c ON c.tenant=s.tenant AND c.email=s.email WHERE s.tenant=$1 AND s.digest=$2 AND s.expires_at>now() AND c.active FOR SHARE OF c,s")
        .bind(tenant(h)?).bind(hash(token)).fetch_optional(conn).await?.ok_or(Error(StatusCode::UNAUTHORIZED,"Customer session expired".into()))
}
pub(crate) async fn access(
    conn: &mut sqlx::PgConnection,
    t: &str,
    unit: &str,
    customer: &str,
) -> Result<Access> {
    let config: Value =
        sqlx::query_scalar("SELECT data FROM commerce_settings WHERE tenant=$1 FOR SHARE")
            .bind(t)
            .fetch_one(&mut *conn)
            .await?;
    let features = commerce::decode_config(config)?.b2b;
    features.admit("select")?;
    let r=sqlx::query("SELECT u.company_id,u.data AS unit,u.revision AS ur,c.data AS company,c.revision AS cr,m.data AS member,m.revision AS mr FROM b2b_units u JOIN b2b_companies c ON c.tenant=u.tenant AND c.id=u.company_id JOIN b2b_members m ON m.tenant=u.tenant AND m.unit_id=u.id WHERE u.tenant=$1 AND u.id=$2 AND m.customer_id=$3 FOR SHARE OF u,c,m")
        .bind(t).bind(unit).bind(customer).fetch_optional(conn).await?.ok_or(Error(StatusCode::FORBIDDEN,"Company unit membership required".into()))?;
    let company: Company =
        serde_json::from_value(r.get("company")).map_err(|_| bad("Invalid company policy"))?;
    let unit: Unit =
        serde_json::from_value(r.get("unit")).map_err(|_| bad("Invalid unit policy"))?;
    let member: Member =
        serde_json::from_value(r.get("member")).map_err(|_| bad("Invalid employee policy"))?;
    if !company.active || !unit.active || !member.active {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Company, unit or employee is paused".into(),
        ));
    }
    Ok(Access {
        company_id: r.get("company_id"),
        company,
        unit,
        member,
        version: format!(
            "{}:{}:{}",
            r.get::<i64, _>("cr"),
            r.get::<i64, _>("ur"),
            r.get::<i64, _>("mr")
        ),
    })
}
pub(crate) async fn guard_conn(
    conn: &mut sqlx::PgConnection,
    h: &RequestContext,
    c: &StoredCart,
) -> Result<Option<Access>> {
    let Some(context) = &c.data.b2b else {
        return Ok(None);
    };
    let customer = identity(conn, h).await?;
    if customer != context.customer_id || c.data.customer_id.as_deref() != Some(&customer) {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Company cart belongs to another employee".into(),
        ));
    }
    let policy = access(conn, &c.tenant, &context.unit_id, &customer).await?;
    require(&policy, "buy")?;
    if context.quote_id.is_some() {
        let raw: Value = sqlx::query_scalar("SELECT data FROM commerce_settings WHERE tenant=$1")
            .bind(&c.tenant)
            .fetch_one(&mut *conn)
            .await?;
        commerce::decode_config(raw)?.b2b.admit("quote.accept")?;
    }
    catalog_guard(conn, c, &policy).await?;
    Ok(Some(policy))
}
pub(crate) async fn guard(a: &App, h: &RequestContext, c: &StoredCart) -> Result<()> {
    if c.data.b2b.is_some() {
        guard_conn(&mut *a.db.begin().await?, h, c).await?;
    }
    Ok(())
}
pub(crate) fn require(access: &Access, permission: &str) -> Result<()> {
    if !access.member.allows(permission) {
        return Err(Error(
            StatusCode::FORBIDDEN,
            format!("Company permission required: {permission}"),
        ));
    }
    Ok(())
}
pub(crate) async fn catalog_guard(
    conn: &mut sqlx::PgConnection,
    c: &StoredCart,
    policy: &Access,
) -> Result<()> {
    let context = c.data.b2b.as_ref().ok_or(bad("Company context required"))?;
    if policy.unit.restricted_catalog {
        let ids = c
            .data
            .items
            .iter()
            .map(|i| i.id.clone())
            .collect::<Vec<_>>();
        let denied:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM products p WHERE p.tenant=$1 AND p.id=ANY($3) AND NOT EXISTS(SELECT 1 FROM b2b_catalog b WHERE b.tenant=p.tenant AND b.unit_id=$2 AND (b.product_id=p.id OR b.product_id=p.parent_id)))")
            .bind(&c.tenant).bind(&context.unit_id).bind(ids).fetch_one(conn).await?;
        if denied {
            return Err(Error(
                StatusCode::NOT_FOUND,
                "Product unavailable in company catalog".into(),
            ));
        }
    }
    Ok(())
}

/// Current customer identity admits only its own company surface context; no record-write authority is granted.
pub(crate) async fn surface_context(
    a: &App,
    h: &RequestContext,
    key: &str,
    id: &str,
) -> Result<()> {
    let mut tx = a.db.begin().await?;
    let customer = identity(&mut tx, h).await?;
    if key == "customerId" {
        if id != customer {
            return Err(Error(
                StatusCode::FORBIDDEN,
                "Surface customer differs from the current account".into(),
            ));
        }
    } else {
        access(&mut tx, &tenant(h)?, id, &customer).await?;
    }
    Ok(())
}
