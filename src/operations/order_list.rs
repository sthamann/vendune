//! Parameter-bound global order filters and stable tuple cursors; query text never becomes SQL.
use super::*;
pub(super) async fn rows(
    a: &App,
    t: &str,
    c: &Criteria,
    n: i64,
    filters: &[apps::extension_filter::Filter],
) -> Result<Vec<sqlx::postgres::PgRow>> {
    let (sort, direction) = c.sort_for("orders")?;
    let mut q = sqlx::QueryBuilder::<sqlx::Postgres>::new(
        "SELECT o.data #- '{cart,token}' AS data,o.created_at::text AS created,coalesce(o.data->'orderCustomer'->>'email',c.data->>'email') AS email FROM orders o JOIN carts c ON c.tenant=o.tenant AND c.id=o.cart_id WHERE o.tenant=",
    );
    q.push_bind(t.to_string());
    if !c.after.is_empty() {
        q.push(format!(
            " AND ({sort},o.id) {} (SELECT {sort},o.id FROM orders o WHERE o.tenant=",
            if direction == "ASC" { ">" } else { "<" }
        ));
        q.push_bind(t.to_string())
            .push(" AND o.id=")
            .push_bind(c.after.clone())
            .push(")");
    }
    let customer = "coalesce(o.data->'orderCustomer'->>'email',c.data->>'email','')||' '||coalesce(o.data->'orderCustomer'->>'name','')||' '||coalesce(o.data->'orderCustomer'->>'firstName','')||' '||coalesce(o.data->'orderCustomer'->>'lastName','')||' '||coalesce(o.data->'billingAddress'->>'name','')";
    if !c.query.is_empty() {
        q.push(format!(
            " AND strpos(lower(coalesce(o.data->>'orderNumber','')||' '||{customer}),lower("
        ))
        .push_bind(c.query.clone())
        .push("))>0");
    }
    if !c.customer.is_empty() {
        q.push(format!(" AND strpos(lower({customer}),lower("))
            .push_bind(c.customer.clone())
            .push("))>0");
    }
    for (value, field) in [
        (&c.state, "o.data->>'state'"),
        (&c.payment_state, "o.data->'payment'->>'state'"),
        (
            &c.channel_id,
            "coalesce(o.data->>'salesChannelId',c.data->>'salesChannel','default')",
        ),
    ] {
        if !value.is_empty() {
            q.push(format!(" AND {field}=")).push_bind(value.clone());
        }
    }
    if !c.delivery_state.is_empty() {
        q.push(" AND EXISTS(SELECT 1 FROM jsonb_array_elements(o.data->'deliveries') d WHERE d->>'state'=").push_bind(c.delivery_state.clone()).push(")");
    }
    if let Some(from) = &c.from {
        q.push(" AND o.created_at>=")
            .push_bind(format!("{from}T00:00:00Z"))
            .push("::timestamptz");
    }
    if let Some(to) = &c.to {
        q.push(" AND o.created_at<(")
            .push_bind(format!("{to}T00:00:00Z"))
            .push("::timestamptz+interval '1 day')");
    }
    apps::extension_filter::predicate(&mut q, apps::core_extensions::Object::Order, t, filters);
    q.push(format!(
        " ORDER BY {sort} {direction},o.id {direction} LIMIT "
    ))
    .push_bind(n + 1);
    Ok(q.build().fetch_all(&a.db).await?)
}
