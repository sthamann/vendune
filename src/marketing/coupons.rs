//! Revision-safe coupon selection for shared storefront/POS carts; pricing remains in promotions.
use super::*;
pub(crate) async fn coupons(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let codes = v["codes"]
        .as_array()
        .filter(|v| v.len() <= 5)
        .ok_or(bad("Maximum five coupon codes"))?;
    let codes = codes
        .iter()
        .map(|c| {
            c.as_str()
                .filter(|s| !s.is_empty() && s.len() <= 64 && s.is_ascii())
                .map(str::to_string)
                .ok_or(bad("Invalid coupon code"))
        })
        .collect::<Result<Vec<_>>>()?;
    let t = tenant(&h)?;
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, &h, "merchant").await?;
    let r = sqlx::query("SELECT * FROM carts WHERE tenant=$1 AND token=$2 FOR UPDATE")
        .bind(&t)
        .bind(token(&h)?)
        .fetch_one(&mut *tx)
        .await?;
    let mut c = stored(&r)?;
    pos::guard_cart(&h, &c)?;
    if c.status != "open" || Some(c.revision) != v["revision"].as_i64() {
        return Err(conflict("Cart changed or terminal"));
    }
    c.data.coupons = codes;
    sqlx::query("UPDATE carts SET data=$1,revision=revision+1 WHERE tenant=$3 AND id=$2")
        .bind(json!(c.data))
        .bind(&c.id)
        .bind(&t)
        .execute(&mut *tx)
        .await?;
    c.revision += 1;
    tx.commit().await?;
    Ok(Json(cart_json(&a, &c).await?))
}
