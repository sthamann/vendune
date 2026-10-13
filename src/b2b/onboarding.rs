//! Atomic company setup delegates to the same company/unit/member writers; foreign customers roll back the whole setup.
use super::*;
pub(super) async fn create(a: &App, h: &RequestContext, v: &Value) -> Result<Value> {
    let t = merchant(a, h)?;
    auth::permit(h, "b2b.manage")?;
    auth::permit(h, "customers.pii")?;
    let customer = v["customerId"].as_str().filter(|s| !s.is_empty());
    if customer.is_some() {
        auth::permit(h, "customers.read")?;
        auth::permit(h, "customers.write")?;
    }
    let id = v["id"].as_str().ok_or(bad("Company ID required"))?;
    if v["revision"].as_i64() != Some(0) {
        return Err(bad("New company revision must be zero"));
    }
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "b2b.onboarding").await?;
    let company = organization::save_tx(&mut tx, &t, "company.save", v).await?;
    let (settings, _) = commerce::scoped_locked(&mut tx, &t, "default").await?;
    let unit = format!("b{}", &uid()[..31]);
    organization::save_tx(&mut tx,&t,"unit.save",&json!({"id":unit,"companyId":id,"parentId":null,"revision":0,"data":{"name":v["data"]["name"],"active":true,"currency":settings.currencies.default_currency,"costCenter":"","approvalAboveMinor":null,"budgetMinor":null,"budgetPeriod":"month","restrictedCatalog":false,"requirePurchaseOrder":false,"allowedShipping":[],"allowedPayments":[]}})).await?;
    if let Some(customer) = customer {
        organization::member_tx(&mut tx,&t,&json!({"unitId":unit,"customerId":customer,"revision":0,"data":{"active":true,"permissions":["buy","lists"],"approvalAboveMinor":null}})).await?;
    }
    tx.commit().await?;
    Ok(
        json!({"id":id,"revision":company["revision"],"unitId":unit,"customerLinked":customer.is_some()}),
    )
}
