//! Merchant-managed firms, unit hierarchies, employee grants and tenant-bound catalogs with optimistic revisions.
use super::*;
pub(super) async fn list(a: &App, t: &str) -> Result<Value> {
    let companies=sqlx::query("SELECT id,data,revision,created_at::text AS created FROM b2b_companies WHERE tenant=$1 ORDER BY id LIMIT 100").bind(t).fetch_all(&a.db).await?;
    Ok(
        json!({"companies":companies.iter().map(|r|json!({"id":r.get::<String,_>("id"),"data":r.get::<Value,_>("data"),"revision":r.get::<i64,_>("revision"),"createdAt":r.get::<String,_>("created")})).collect::<Vec<_>>()}),
    )
}
pub(super) async fn detail(a: &App, t: &str, id: &str) -> Result<Value> {
    let company = sqlx::query("SELECT data,revision FROM b2b_companies WHERE tenant=$1 AND id=$2")
        .bind(t)
        .bind(id)
        .fetch_optional(&a.db)
        .await?
        .ok_or(Error(StatusCode::NOT_FOUND, "Company not found".into()))?;
    let units=sqlx::query("SELECT id,parent_id,data,revision FROM b2b_units WHERE tenant=$1 AND company_id=$2 ORDER BY id LIMIT 100").bind(t).bind(id).fetch_all(&a.db).await?;
    let members=sqlx::query("SELECT m.unit_id,m.customer_id,m.data,m.revision,c.email,c.profile FROM b2b_members m JOIN b2b_units u ON u.tenant=m.tenant AND u.id=m.unit_id JOIN customers c ON c.tenant=m.tenant AND c.id=m.customer_id WHERE m.tenant=$1 AND u.company_id=$2 ORDER BY m.unit_id,m.customer_id LIMIT 500").bind(t).bind(id).fetch_all(&a.db).await?;
    let catalog:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('unit',b.unit_id,'id',b.product_id) FROM b2b_catalog b JOIN b2b_units u ON u.tenant=b.tenant AND u.id=b.unit_id WHERE b.tenant=$1 AND u.company_id=$2 ORDER BY b.unit_id,b.product_id LIMIT 100000").bind(t).bind(id).fetch_all(&a.db).await?;
    Ok(
        json!({"id":id,"data":company.get::<Value,_>("data"),"revision":company.get::<i64,_>("revision"),"units":units.iter().map(|r|json!({"id":r.get::<String,_>("id"),"parentId":r.get::<Option<String>,_>("parent_id"),"catalogIds":catalog.iter().filter(|c|c["unit"]==r.get::<String,_>("id")).map(|c|c["id"].clone()).collect::<Vec<_>>(),"data":r.get::<Value,_>("data"),"revision":r.get::<i64,_>("revision")})).collect::<Vec<_>>(),"members":members.iter().map(|r|json!({"unitId":r.get::<String,_>("unit_id"),"customerId":r.get::<String,_>("customer_id"),"data":r.get::<Value,_>("data"),"revision":r.get::<i64,_>("revision"),"email":r.get::<String,_>("email"),"profile":r.get::<Value,_>("profile")})).collect::<Vec<_>>()}),
    )
}
pub(super) fn name(values: &HashMap<String, String>, settings: &commerce::Settings) -> Result<()> {
    if values.is_empty()
        || values.len() > 100
        || values.iter().any(|(k, v)| {
            v.len() > 200
                || v.trim().is_empty()
                || !settings
                    .locales
                    .iter()
                    .any(|l| l == k || l.split('-').next() == Some(k.as_str()))
        })
        || !values.keys().any(|k| {
            k == &settings.main_locale || settings.main_locale.split('-').next() == Some(k.as_str())
        })
    {
        return Err(bad(
            "Company/unit name needs the shop main language; use enabled languages only",
        ));
    }
    Ok(())
}
pub(crate) async fn save(a: &App, h: &RequestContext, op: &str, v: &Value) -> Result<Value> {
    let t = merchant(a, h)?;
    auth::permit(h, "b2b.manage")?;
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "b2b.organization").await?;
    let result = save_tx(&mut tx, &t, op, v).await?;
    tx.commit().await?;
    Ok(result)
}
/// Shared validated writer for HTTP, history restore and selective staging publication.
pub(super) async fn save_tx(
    conn: &mut sqlx::PgConnection,
    t: &str,
    op: &str,
    v: &Value,
) -> Result<Value> {
    let id = v["id"]
        .as_str()
        .filter(|s| apps::identifier(s))
        .ok_or(bad("Valid company/unit ID required"))?;
    let expected = v["revision"]
        .as_i64()
        .filter(|n| *n >= 0)
        .ok_or(bad("Expected revision required (zero creates)"))?;
    let settings = commerce::decode_config(
        sqlx::query_scalar("SELECT data FROM commerce_settings WHERE tenant=$1 FOR UPDATE")
            .bind(t)
            .fetch_one(&mut *conn)
            .await?,
    )?;
    let data = if op == "company.save" {
        let company: Company =
            serde_json::from_value(v["data"].clone()).map_err(|_| bad("Invalid company fields"))?;
        name(&company.name, &settings)?;
        if company.vat_id.len() > 100 || company.external_id.len() > 100 {
            return Err(bad("Company identifiers are too long"));
        }
        json!(company)
    } else {
        let unit: Unit =
            serde_json::from_value(v["data"].clone()).map_err(|_| bad("Invalid unit fields"))?;
        unit.validate()?;
        name(&unit.name, &settings)?;
        settings.currencies.selected(&unit.currency)?;
        if unit
            .allowed_shipping
            .iter()
            .any(|id| !settings.shipping.iter().any(|m| &m.id == id))
            || unit
                .allowed_payments
                .iter()
                .any(|id| !settings.payments.iter().any(|m| &m.id == id))
        {
            return Err(bad("Unit references unknown shipping/payment methods"));
        }
        json!(unit)
    };
    let table = if op == "company.save" {
        "b2b_companies"
    } else {
        "b2b_units"
    };
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(format!("b2b:{t}:{table}:{id}"))
        .execute(&mut *conn)
        .await?;
    // Serialize hierarchy changes for the whole company before taking unit row locks.
    // Per-unit locks alone permit two concurrent edits to introduce a cycle.
    if op == "unit.save" {
        let company = v["companyId"].as_str().ok_or(bad("Company required"))?;
        sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
            .bind(format!("b2b:hierarchy:{t}:{company}"))
            .execute(&mut *conn)
            .await?;
    }
    let current: Option<i64> = sqlx::query_scalar(if op == "company.save" {
        "SELECT revision FROM b2b_companies WHERE tenant=$1 AND id=$2 FOR UPDATE"
    } else {
        "SELECT revision FROM b2b_units WHERE tenant=$1 AND id=$2 FOR UPDATE"
    })
    .bind(t)
    .bind(id)
    .fetch_optional(&mut *conn)
    .await?;
    if current.unwrap_or(0) != expected {
        return Err(conflict("Company/unit changed; reload before saving"));
    }
    if op == "company.save" {
        sqlx::query("INSERT INTO b2b_companies(tenant,id,data) VALUES($1,$2,$3) ON CONFLICT(tenant,id) DO UPDATE SET data=excluded.data,revision=b2b_companies.revision+1").bind(t).bind(id).bind(data).execute(&mut *conn).await?;
    } else {
        let company = v["companyId"].as_str().ok_or(bad("Company required"))?;
        let parent = v["parentId"].as_str();
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM b2b_companies WHERE tenant=$1 AND id=$2)",
        )
        .bind(t)
        .bind(company)
        .fetch_one(&mut *conn)
        .await?;
        if !exists {
            return Err(Error(StatusCode::NOT_FOUND, "Company not found".into()));
        }
        if let Some(parent) = parent {
            let valid:bool=sqlx::query_scalar("WITH RECURSIVE ancestors AS (SELECT id,parent_id FROM b2b_units WHERE tenant=$1 AND company_id=$2 AND id=$3 UNION ALL SELECT u.id,u.parent_id FROM b2b_units u JOIN ancestors a ON u.id=a.parent_id WHERE u.tenant=$1 AND u.company_id=$2) SELECT EXISTS(SELECT 1 FROM ancestors) AND NOT EXISTS(SELECT 1 FROM ancestors WHERE id=$4)").bind(t).bind(company).bind(parent).bind(id).fetch_one(&mut *conn).await?;
            if !valid {
                return Err(bad(
                    "Unit parent is missing, belongs to another company or creates a cycle",
                ));
            }
        }
        // Currency/period changes cannot erase already reserved spending. Cancel/release or use a new unit.
        let locked:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM b2b_units u WHERE u.tenant=$1 AND u.id=$2 AND (u.data->>'currency' IS DISTINCT FROM $3::text OR u.data->>'budgetPeriod' IS DISTINCT FROM $4::text) AND EXISTS(SELECT 1 FROM b2b_budget_allocations b WHERE b.tenant=u.tenant AND b.unit_id=u.id AND NOT b.released))").bind(t).bind(id).bind(data["currency"].as_str()).bind(data["budgetPeriod"].as_str()).fetch_one(&mut *conn).await?;
        if locked {
            return Err(conflict(
                "Currency and budget period cannot change while spending allocations remain active",
            ));
        }
        // Existing units cannot move companies: historical grants/approvals remain bound to their owner.
        let previous: Option<String> =
            sqlx::query_scalar("SELECT company_id FROM b2b_units WHERE tenant=$1 AND id=$2")
                .bind(t)
                .bind(id)
                .fetch_optional(&mut *conn)
                .await?;
        if previous.as_deref().is_some_and(|p| p != company) {
            return Err(bad("A purchasing unit cannot move to another company"));
        }
        sqlx::query("INSERT INTO b2b_units(tenant,id,company_id,parent_id,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(tenant,id) DO UPDATE SET parent_id=excluded.parent_id,data=excluded.data,revision=b2b_units.revision+1").bind(t).bind(id).bind(company).bind(parent).bind(data).execute(&mut *conn).await?;
    }
    event(
        conn,
        t,
        "b2b.organization_changed",
        json!({"id":id,"kind":table,"revision":expected+1}),
    )
    .await?;
    Ok(json!({"id":id,"revision":expected+1}))
}
pub(super) async fn member(a: &App, h: &RequestContext, v: &Value) -> Result<Value> {
    let t = merchant(a, h)?;
    auth::permit(h, "b2b.manage")?;
    auth::permit(h, "customers.write")?;
    let unit = v["unitId"].as_str().ok_or(bad("Unit required"))?;
    let customer = v["customerId"].as_str().ok_or(bad("Customer required"))?;
    let expected = v["revision"].as_i64().ok_or(bad("Revision required"))?;
    let member: Member =
        serde_json::from_value(v["data"].clone()).map_err(|_| bad("Invalid employee policy"))?;
    member.validate()?;
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "b2b.membership").await?;
    let found: Option<String> =
        sqlx::query_scalar("SELECT id FROM b2b_units WHERE tenant=$1 AND id=$2 FOR UPDATE")
            .bind(&t)
            .bind(unit)
            .fetch_optional(&mut *tx)
            .await?;
    let exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM customers WHERE tenant=$1 AND id=$2)")
            .bind(&t)
            .bind(customer)
            .fetch_one(&mut *tx)
            .await?;
    if found.is_none() || !exists {
        return Err(Error(
            StatusCode::NOT_FOUND,
            "Unit or customer not found".into(),
        ));
    }
    let current:Option<i64>=sqlx::query_scalar("SELECT revision FROM b2b_members WHERE tenant=$1 AND unit_id=$2 AND customer_id=$3 FOR UPDATE").bind(&t).bind(unit).bind(customer).fetch_optional(&mut *tx).await?;
    if current.unwrap_or(0) != expected {
        return Err(conflict("Employee grant changed; reload before saving"));
    }
    sqlx::query("INSERT INTO b2b_members(tenant,unit_id,customer_id,data) VALUES($1,$2,$3,$4) ON CONFLICT(tenant,unit_id,customer_id) DO UPDATE SET data=excluded.data,revision=b2b_members.revision+1").bind(&t).bind(unit).bind(customer).bind(json!(member)).execute(&mut *tx).await?;
    event(
        &mut tx,
        &t,
        "b2b.employee_changed",
        json!({"unitId":unit,"customerId":customer,"revision":expected+1}),
    )
    .await?;
    tx.commit().await?;
    Ok(json!({"revision":expected+1}))
}
pub(super) async fn event(
    conn: &mut sqlx::PgConnection,
    t: &str,
    kind: &str,
    data: Value,
) -> Result<()> {
    sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,$2,$3)")
        .bind(t)
        .bind(kind)
        .bind(data)
        .execute(conn)
        .await?;
    Ok(())
}
