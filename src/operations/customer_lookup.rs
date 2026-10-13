//! Fast customer-only lookup for native identity bindings: tenant-scoped, indexed and bounded; no guest-order union.
use super::*;
pub(super) async fn lookup(
    State(a): State<App>,
    h: RequestContext,
    axum::extract::Query(c): axum::extract::Query<Criteria>,
) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    auth::permit(&h, "customers.read")?;
    auth::permit(&h, "customers.pii")?;
    let limit = c.validate()?;
    let query = c
        .query
        .trim()
        .to_lowercase()
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_");
    let rows=sqlx::query("SELECT id,email,customer_number,profile->>'name' AS name,profile->>'firstName' AS first,profile->>'lastName' AS last FROM customers WHERE tenant=$1 AND id>$2 AND ($3='' OR lower(email||' '||coalesce(profile->>'name','')||' '||coalesce(profile->>'firstName','')||' '||coalesce(profile->>'lastName','')||' '||coalesce(customer_number,'')) LIKE '%'||$3||'%') ORDER BY id LIMIT $4")
  .bind(t).bind(c.after).bind(query).bind(limit+1).fetch_all(&a.db).await?;
    let more = rows.len() > limit as usize;
    let elements:Vec<_>=rows.iter().take(limit as usize).map(|r|json!({"id":r.get::<String,_>("id"),"email":r.get::<String,_>("email"),"customerNumber":r.get::<Option<String>,_>("customer_number"),"profile":{"name":r.get::<Option<String>,_>("name"),"firstName":r.get::<Option<String>,_>("first"),"lastName":r.get::<Option<String>,_>("last")}})).collect();
    Ok(Json(
        json!({"elements":elements,"hasMore":more,"nextCursor":if more {elements.last().map(|e|e["id"].clone())} else {None}}),
    ))
}
