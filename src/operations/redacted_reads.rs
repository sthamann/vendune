//! Explicit non-PII domain read views for separately scoped app callbacks; never elevate an identity.
use super::*;
fn projection(value: &Value, keys: &[&str]) -> Value {
    json!(
        keys.iter()
            .filter_map(|k| value.get(*k).map(|v| ((*k).to_owned(), v.clone())))
            .collect::<serde_json::Map<String, Value>>()
    )
}

pub(crate) async fn redacted_read(
    a: &App,
    h: &RequestContext,
    kind: &str,
    id: &str,
) -> Result<Value> {
    let tenant = merchant(a, h)?;
    match kind {
        "order" => {
            auth::permit(h, "orders.read")?;
            let row = sqlx::query(
                "SELECT data,created_at::text AS created FROM orders WHERE tenant=$1 AND id=$2",
            )
            .bind(&tenant)
            .bind(id)
            .fetch_optional(&a.db)
            .await?
            .ok_or(Error(StatusCode::NOT_FOUND, "Order not found".into()))?;
            let mut value: Value = row.get("data");
            commerce::order_fields(&mut value);
            value["createdAt"] = json!(row.get::<String, _>("created"));
            Ok(order_view(&value))
        }
        "customer" => {
            auth::permit(h, "customers.read")?;
            let row = sqlx::query("SELECT id,active,group_name,created_at::text AS created FROM customers WHERE tenant=$1 AND email=$2")
                .bind(&tenant).bind(id).fetch_optional(&a.db).await?
                .ok_or(Error(StatusCode::NOT_FOUND,"Customer not found".into()))?;
            Ok(
                json!({"id":row.get::<String,_>("id"),"active":row.get::<bool,_>("active"),"guest":false,"groupId":row.get::<String,_>("group_name"),"createdAt":row.get::<String,_>("created")}),
            )
        }
        _ => Err(bad("Unknown redacted read")),
    }
}
fn order_view(value: &Value) -> Value {
    let mut clean = projection(
        value,
        &[
            "id",
            "number",
            "orderNumber",
            "state",
            "paymentState",
            "deliveryState",
            "currency",
            "currencyScale",
            "totalMinor",
            "total",
            "createdAt",
        ],
    );
    clean["items"] = json!(
        value["lineItems"]
            .as_array()
            .map(|items| items
                .iter()
                .take(100)
                .map(|item| projection(
                    item,
                    &[
                        "referencedId",
                        "quantity",
                        "price",
                        "unitPrice",
                        "totalPrice"
                    ]
                ))
                .collect::<Vec<_>>())
            .unwrap_or_default()
    );
    clean
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_explicit_fields_survive_nested_personal_data() {
        let value = json!({"id":"order","customerEmail":"PRIVATE", "activity":["PRIVATE"], "cart":{"token":"PRIVATE"},"lineItems":[{"referencedId":"product","quantity":2,"label":"PRIVATE","payload":{"name":"PRIVATE"}}]});
        let clean = order_view(&value);
        assert_eq!(clean["items"][0]["quantity"], 2);
        assert!(!clean.to_string().contains("PRIVATE"));
        assert!(clean.get("cart").is_none());
    }
}
