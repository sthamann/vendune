//! Private journey drilldown uses the same current receipt, tenant predicates and bounded event projection.
use super::*;
// SQL composition uses only bundled static clauses; every request value remains a bind parameter.
pub(super) async fn read(a: &App, h: &RequestContext, t: &str, v: &Value) -> Result<Value> {
    apps::validate_input(&super::schema("knowledge.behavior.journey").unwrap(), v)?;
    let session = v["session"].as_str().ok_or(bad("Session required"))?;
    let row=sqlx::query("SELECT channel_id FROM session_signal_events WHERE tenant=$1 AND session=$2 AND purpose='analytics' AND expires_at>now() ORDER BY created_at DESC LIMIT 1").bind(t).bind(session).fetch_optional(&a.db).await?.ok_or(Error(StatusCode::NOT_FOUND,"Behavioral journey not found".into()))?;
    let channel: String = row.get("channel_id");
    let (s, _) = commerce::scoped_config(a, t, &channel).await?;
    if !s.legal.behavior_analytics.enabled || s.legal.purposes.get("analytics") != Some(&true) {
        return Err(Error(
            StatusCode::NOT_FOUND,
            "Behavioral journey not found".into(),
        ));
    }
    let q = format!(
        "WITH events AS ({}) SELECT e.id,e.kind,e.product_id,e.customer_id,e.dimensions,e.created_at::text AS time,coalesce(c.email,o.data->'orderCustomer'->>'email') AS customer_ref,o.id AS order_id,o.data->>'orderNumber' AS order_number FROM events e LEFT JOIN orders o ON o.tenant=e.tenant AND o.cart_id=e.cart_id LEFT JOIN customers c ON c.tenant=e.tenant AND c.id=e.customer_id WHERE e.session=$5 ORDER BY e.created_at,e.id LIMIT 101",
        include_str!("eligible.sql")
    );
    let rows = sqlx::query(sqlx::AssertSqlSafe(q.as_str()))
        .bind(t)
        .bind(&channel)
        .bind(s.legal.behavior_analytics.retention_days as i32)
        .bind(legal::policy_version(&s.legal))
        .bind(session)
        .fetch_all(&a.db)
        .await?;
    if rows.is_empty() {
        return Err(Error(
            StatusCode::NOT_FOUND,
            "Behavioral journey not found".into(),
        ));
    }
    Ok(
        json!({"session":session,"salesChannelId":channel,"truncated":rows.len()>100,"canOpenCustomers":auth::allowed(h,"customers.read"),"canOpenOrders":auth::allowed(h,"orders.read"),"events":rows.iter().take(100).map(|r|json!({"id":r.get::<String,_>("id"),"kind":r.get::<String,_>("kind"),"productId":r.get::<Option<String>,_>("product_id"),"customerId":r.get::<Option<String>,_>("customer_id"),"customerRef":if auth::allowed(h,"customers.read"){r.get::<Option<String>,_>("customer_ref")}else{None},"dimensions":r.get::<Value,_>("dimensions"),"time":r.get::<String,_>("time"),"orderId":if auth::allowed(h,"orders.read"){r.get::<Option<String>,_>("order_id")}else{None},"orderNumber":if auth::allowed(h,"orders.read"){r.get::<Option<String>,_>("order_number")}else{None}})).collect::<Vec<_>>()}),
    )
}
