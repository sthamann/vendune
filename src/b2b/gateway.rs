//! One native command contract for Store API, merchant API and MCP; actor identity never comes from arguments.
use super::*;
pub(crate) const CAPABILITIES: &[(&str, &str)] = &[
    (
        "b2b.configuration",
        "Read shared purchasing configuration without unrelated settings authority",
    ),
    (
        "b2b.requisition.import",
        "Import a mapped requisition as a native owned order list",
    ),
    (
        "b2b.unit.orders",
        "Read orders admitted by explicit unit-order permission",
    ),
    (
        "b2b.catalog.save",
        "Revise the purchasing unit product catalog",
    ),
    ("b2b.quotes", "List your company quote requests"),
    ("b2b.quotes.merchant", "Read merchant quote inbox"),
    ("b2b.quote.request", "Request a native company cart quote"),
    ("b2b.quote.offer", "Send a currency-bound merchant offer"),
    ("b2b.quote.message", "Continue a scoped quote negotiation"),
    ("b2b.quote.reject", "Reject your pending quote"),
    (
        "b2b.quote.accept",
        "Bind an offered quote to its original native cart",
    ),
    (
        "b2b.quote.release",
        "Remove the accepted offer from an open cart",
    ),
    ("b2b.lists", "Read private or unit-shared procurement lists"),
    ("b2b.list.save", "Revise an owned procurement list"),
    ("b2b.list.delete", "Delete an owned procurement list"),
    (
        "b2b.list.apply",
        "Apply an admitted list to the native cart",
    ),
    (
        "b2b.quick-order",
        "Resolve SKU lines into a native company cart",
    ),
    ("b2b.companies", "List merchant companies"),
    ("b2b.company", "Read company, units and employee grants"),
    ("b2b.company.save", "Create or revise a merchant company"),
    ("b2b.unit.save", "Create or revise a purchasing unit"),
    (
        "b2b.member.save",
        "Grant or pause a current customer's unit purchasing rights",
    ),
    (
        "b2b.contexts",
        "Discover the signed-in customer's active company units",
    ),
    (
        "b2b.select",
        "Bind an owned native cart to a purchasing unit and purchase-order reference",
    ),
    (
        "b2b.approval.request",
        "Request approval of a revision-bound native quote",
    ),
    ("b2b.approvals", "Read the employee's unit approval inbox"),
    (
        "b2b.approval.decide",
        "Approve or reject another employee's pending purchase",
    ),
];
pub(crate) fn permission(name: &str) -> Option<&str> {
    match name.strip_prefix("b2b.")? {
        "companies" | "company" | "configuration" => Some("b2b.read"),
        "requisition.import" | "company.save" | "unit.save" | "member.save" | "catalog.save"
        | "quotes.merchant" | "quote.offer" => Some("b2b.manage"),
        _ => None,
    }
}
pub(crate) fn schema(name: &str) -> Option<Value> {
    if !CAPABILITIES.iter().any(|(n, _)| *n == name) {
        return None;
    }
    let properties = json!({"id":{"type":"string","maxLength":100},"unitId":{"type":"string","maxLength":100},"companyId":{"type":"string","maxLength":100},"parentId":{"type":["string","null"]},"customerId":{"type":"string","maxLength":100},"purchaseOrder":{"type":"string","maxLength":100},"revision":{"type":"integer","minimum":0},"state":{"type":"string","enum":["approved","rejected"]},"message":{"type":"string","maxLength":4000},"cartRevision":{"type":"integer","minimum":0},"lines":{"type":"array","maxItems":100,"items":{"type":"object","required":["sku","quantity"],"properties":{"sku":{"type":"string"},"quantity":{"type":"integer","minimum":1,"maximum":10000}},"additionalProperties":false}},"productIds":{"type":"array","maxItems":1000,"items":{"type":"string"}},"data":{"type":"object"}});
    Some(json!({"type":"object","properties":properties,"additionalProperties":false}))
}
pub(super) async fn admin(
    State(a): State<App>,
    h: RequestContext,
    Path(op): Path<String>,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let name = format!("b2b.{op}");
    let permission = permission(&name).ok_or(bad(
        "Use the authenticated customer API for employee operations",
    ))?;
    merchant(&a, &h)?;
    auth::permit(&h, permission)?;
    Ok(Json(invoke(&a, &h, &name, &v).await?))
}
pub(super) async fn customer(
    State(a): State<App>,
    h: RequestContext,
    Path(op): Path<String>,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let name = format!("b2b.{op}");
    if permission(&name).is_some() {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Merchant operation requires Studio authorization".into(),
        ));
    }
    Ok(Json(invoke(&a, &h, &name, &v).await?))
}
pub(crate) async fn invoke(a: &App, h: &RequestContext, name: &str, v: &Value) -> Result<Value> {
    if v.as_object().is_none_or(|o| {
        o.len() > 13
            || o.keys().any(|k| {
                ![
                    "id",
                    "unitId",
                    "companyId",
                    "parentId",
                    "customerId",
                    "productIds",
                    "cartRevision",
                    "lines",
                    "message",
                    "purchaseOrder",
                    "revision",
                    "state",
                    "data",
                ]
                .contains(&k.as_str())
            })
    }) || v.to_string().len() > 64_000
    {
        return Err(bad("Invalid B2B command fields"));
    }
    if let Some(scope) = permission(name) {
        merchant(a, h)?;
        auth::permit(h, scope)?;
    } else {
        accounts::identity(a, h).await?;
    }
    match name
        .strip_prefix("b2b.")
        .ok_or(bad("Unknown company command"))?
    {
        "configuration" => {
            let (settings, _) = commerce::config(a, &tenant(h)?).await?;
            let s = json!(settings);
            let methods = |key: &str| {
                json!(s[key].as_array().map(|v|v.iter().map(|m|json!({"id":m["id"],"name":m["name"],"translations":m["translations"],"active":m["active"]})).collect::<Vec<_>>()).unwrap_or_default())
            };
            Ok(
                json!({"mainLocale":s["mainLocale"],"locales":s["locales"],"currencies":{"defaultCurrency":s["currencies"]["defaultCurrency"],"enabled":s["currencies"]["enabled"]},"shipping":methods("shipping"),"payments":methods("payments")}),
            )
        }
        "companies" => organization::list(a, &tenant(h)?).await,
        "company" => {
            auth::permit(h, "customers.pii")?;
            organization::detail(
                a,
                &tenant(h)?,
                v["id"].as_str().ok_or(bad("Company required"))?,
            )
            .await
        }
        op @ ("company.save" | "unit.save") => organization::save(a, h, op, v).await,
        "member.save" => organization::member(a, h, v).await,
        "catalog.save" => catalog::save(a, h, v).await,
        op @ ("lists" | "list.save" | "list.delete" | "list.apply") => {
            lists::invoke(a, h, op, v).await
        }
        op @ ("quotes" | "quotes.merchant" | "quote.request" | "quote.offer" | "quote.message"
        | "quote.reject") => quotes::invoke(a, h, op, v).await,
        "quote.accept" => quote_contract::select(a, h, v, true).await,
        "quote.release" => quote_contract::select(a, h, v, false).await,
        "requisition.import" => requisition::import(a, h, v).await,
        "unit.orders" => orders::read(a, h, v).await,
        "quick-order" => quick_order::apply(a, h, v).await,
        "contexts" => contexts(a, h).await,
        "select" => select(a, h, v).await,
        "approval.request" => approval::request(a, h, v).await,
        "approvals" => approval::inbox(a, h, v).await,
        "approval.decide" => approval::decide(a, h, v).await,
        _ => Err(bad("Unknown B2B command")),
    }
}
async fn contexts(a: &App, h: &RequestContext) -> Result<Value> {
    let t = tenant(h)?;
    let (settings, _) = commerce::config(a, &t).await?;
    let mut tx = a.db.begin().await?;
    let customer = identity(&mut tx, h).await?;
    history::customer_context(&mut tx, &customer).await?;
    let rows=sqlx::query("SELECT u.id,u.company_id,u.data,c.data AS company,m.data AS member FROM b2b_members m JOIN b2b_units u ON u.tenant=m.tenant AND u.id=m.unit_id JOIN b2b_companies c ON c.tenant=u.tenant AND c.id=u.company_id WHERE m.tenant=$1 AND m.customer_id=$2 AND m.data->>'active'='true' AND u.data->>'active'='true' AND c.data->>'active'='true' ORDER BY u.id LIMIT 100").bind(t).bind(customer).fetch_all(&mut *tx).await?;
    Ok(
        json!({"mainLocale":settings.main_locale,"locales":settings.locales,"elements":rows.iter().map(|r|json!({"id":r.get::<String,_>("id"),"companyId":r.get::<String,_>("company_id"),"data":r.get::<Value,_>("data"),"company":r.get::<Value,_>("company"),"member":r.get::<Value,_>("member")})).collect::<Vec<_>>()}),
    )
}
async fn select(a: &App, h: &RequestContext, v: &Value) -> Result<Value> {
    let mut c = load_cart(a, h).await?;
    if c.data.pos_actor.is_some() {
        return Err(bad("POS carts cannot select procurement units"));
    }
    let unit = v["unitId"].as_str().ok_or(bad("Unit required"))?;
    let po = v["purchaseOrder"].as_str().unwrap_or("");
    if po.len() > 130 || po.chars().any(char::is_control) {
        return Err(bad("Invalid purchase order reference"));
    }
    let mut tx = a.db.begin().await?;
    let row = sqlx::query("SELECT * FROM carts WHERE tenant=$1 AND token=$2 FOR UPDATE")
        .bind(&c.tenant)
        .bind(&c.token)
        .fetch_one(&mut *tx)
        .await?;
    c = stored(&row)?;
    pos::guard_cart(h, &c)?;
    if c.status != "open" || v["revision"].as_i64() != Some(c.revision) {
        return Err(conflict("Cart changed or is terminal"));
    }
    if c.data.b2b.as_ref().is_some_and(|b| b.quote_id.is_some()) {
        return Err(conflict(
            "Release the accepted quote before changing purchasing units",
        ));
    }
    let customer = identity(&mut tx, h).await?;
    history::customer_context(&mut tx, &customer).await?;
    if c.data.customer_id.as_deref() != Some(&customer) {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Sign in to your own cart before selecting a company".into(),
        ));
    }
    let policy = access(&mut tx, &c.tenant, unit, &customer).await?;
    require(&policy, "buy")?;
    c.data.b2b = Some(Context {
        unit_id: unit.into(),
        customer_id: customer,
        purchase_order: po.into(),
        quote_id: None,
    });
    catalog_guard(&mut tx, &c, &policy).await?;
    let (config, _) = commerce::scoped_locked(&mut tx, &c.tenant, &c.data.sales_channel).await?;
    config.currencies.selected(&policy.unit.currency)?;
    // Keep customer-group pricing under the native configured group owner.
    if !config.is_business("business") {
        return Err(bad(
            "Configure an enabled business customer group before company purchases",
        ));
    }
    c.data.group = "business".into();
    c.data.currency = policy.unit.currency;
    c.data.company = Some(
        policy
            .company
            .name
            .get(&config.main_locale)
            .or_else(|| {
                policy
                    .company
                    .name
                    .get(config.main_locale.split('-').next().unwrap_or(""))
            })
            .cloned()
            .unwrap_or_default(),
    );
    c.revision += 1;
    sqlx::query("UPDATE carts SET data=$3,revision=$4 WHERE tenant=$1 AND id=$2")
        .bind(&c.tenant)
        .bind(&c.id)
        .bind(json!(c.data))
        .bind(c.revision)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    cart_json(a, &c).await
}
