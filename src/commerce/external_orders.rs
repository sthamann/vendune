//! Generic authorized external order intake reuses native stock, customer snapshots, documents, history and outbox.
use super::external_order_input::Input;
use crate::*;
pub(crate) async fn import_external(
    a: &App,
    h: &RequestContext,
    app: &str,
    digest: &str,
    v: Value,
) -> Result<Value> {
    auth::permit(h, "orders.write")?;
    auth::permit(h, "payments.manage")?;
    auth::permit(h, "customers.pii")?;
    let t = merchant(a, h)?;
    let mut input: Input =
        serde_json::from_value(v).map_err(|_| bad("Invalid external order snapshot"))?;
    input.validate()?;
    if staging::parent(a, &t).await?.is_some() {
        return Err(bad("External orders are disabled in sandboxes"));
    }
    let key = format!(
        "external:{}",
        hash(&format!(
            "{app}:{}:{}",
            input.sales_channel_id, input.external_id
        ))
    );
    let fingerprint = hash(&json!(input).to_string());
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, h, "external_order").await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(format!("{t}:{key}"))
        .execute(&mut *tx)
        .await?;
    // Lock the native package to preserve callback authorization across uninstall/upgrade races.
    let current: Option<String> = sqlx::query_scalar(
        "SELECT digest FROM app_packages WHERE tenant=$1 AND id=$2 AND active FOR SHARE",
    )
    .bind(&t)
    .bind(app)
    .fetch_optional(&mut *tx)
    .await?;
    if current.as_deref() != Some(digest) {
        return Err(conflict("App package changed during import"));
    }
    if let Some(r) =
        sqlx::query("SELECT data,fingerprint FROM orders WHERE tenant=$1 AND idempotency_key=$2")
            .bind(&t)
            .bind(&key)
            .fetch_optional(&mut *tx)
            .await?
    {
        if r.get::<String, _>("fingerprint") != fingerprint {
            return Err(conflict(
                "External order already imported with another snapshot",
            ));
        }
        return Ok(json!({"order":r.get::<Value,_>("data"),"replayed":true}));
    }
    let channel: Value =
        sqlx::query_scalar("SELECT data FROM sales_channels WHERE tenant=$1 AND id=$2 FOR SHARE")
            .bind(&t)
            .bind(&input.sales_channel_id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or(bad("Unknown external sales channel"))?;
    if channel["kind"] != "marketplace"
        || channel["active"] != true
        || channel["visibility"] == "private"
    {
        return Err(conflict("External sales channel must be active and public"));
    }
    let (settings, _) = super::scoped_locked(&mut tx, &t, &input.sales_channel_id).await?;
    let currency = settings.currencies.selected(&input.currency)?.clone();
    if !channel["locales"]
        .as_array()
        .is_some_and(|ls| ls.iter().any(|l| l == &input.locale))
    {
        return Err(bad("External order language is not enabled in channel"));
    }
    super::validate_address_geography(&input.billing_address, &settings)?;
    super::validate_address_geography(&input.shipping_address, &settings)?;
    let ids = input
        .lines
        .iter()
        .map(|l| l.product_id.clone())
        .collect::<Vec<_>>();
    let mut locks:Vec<String>=sqlx::query_scalar("SELECT DISTINCT parent_id FROM products WHERE tenant=$1 AND id=ANY($2) AND parent_id IS NOT NULL").bind(&t).bind(&ids).fetch_all(&mut *tx).await?;
    locks.extend(ids.clone());
    locks.sort();
    locks.dedup();
    let rows =
        sqlx::query("SELECT * FROM products WHERE tenant=$1 AND id=ANY($2) ORDER BY id FOR UPDATE")
            .bind(&t)
            .bind(&locks)
            .fetch_all(&mut *tx)
            .await?;
    if rows.iter().any(|r| !r.get::<bool, _>("active")) {
        return Err(bad("Inactive imported product"));
    }
    let hidden:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM product_channel_visibility WHERE tenant=$1 AND channel_id=$2 AND product_id=ANY($3) AND NOT visible)").bind(&t).bind(&input.sales_channel_id).bind(&locks).fetch_one(&mut *tx).await?;
    if hidden {
        return Err(bad("Imported product is hidden in this channel"));
    }
    let selected = channel["productIds"]
        .as_array()
        .ok_or(bad("Invalid channel selection"))?;
    let factor = 10_i64.pow(currency.scale.into()) as f64;
    let mut lines = Vec::new();
    for l in &input.lines {
        let r = rows
            .iter()
            .find(|r| r.get::<String, _>("id") == l.product_id)
            .ok_or(bad("Imported product does not belong to this shop"))?;
        let parent = r.get::<Option<String>, _>("parent_id");
        if !selected.is_empty()
            && !selected
                .iter()
                .any(|s| s == &l.product_id || parent.as_ref().is_some_and(|p| s == p))
        {
            return Err(bad("Imported product is outside channel catalog"));
        }
        if !u64::try_from(r.get::<i32, _>("stock"))
            .is_ok_and(|stock| verified_kernel::stock_admissible(stock, u64::from(l.quantity)))
        {
            return Err(conflict(
                "Insufficient stock for imported order; review required",
            ));
        }
        let chain = vec![
            input.locale.clone(),
            input
                .locale
                .split('-')
                .next()
                .unwrap_or(&input.locale)
                .to_owned(),
            settings.main_locale.clone(),
            settings
                .main_locale
                .split('-')
                .next()
                .unwrap_or(&settings.main_locale)
                .to_owned(),
        ];
        let name:Option<String>=sqlx::query_scalar("SELECT p.name FROM product_translations p JOIN languages lang ON lang.id=p.language_id WHERE p.tenant=$1 AND p.product_id=ANY($2) AND lang.locale=ANY($3) AND p.name IS NOT NULL AND btrim(p.name)<>'' ORDER BY array_position($3,lang.locale), CASE WHEN p.product_id=$4 THEN 0 ELSE 1 END LIMIT 1").bind(&t).bind(vec![l.product_id.clone(),parent.clone().unwrap_or_else(||l.product_id.clone())]).bind(&chain).bind(&l.product_id).fetch_optional(&mut *tx).await?;
        let label = name
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| r.get("name"));
        lines.push(json!({"id":l.product_id,"referencedId":l.product_id,"label":label,"quantity":l.quantity,"productNumber":r.get::<Option<String>,_>("product_number"),"price":l.amount.price(currency.scale,l.quantity)}));
    }
    let tax =
        input.lines.iter().map(|l| l.amount.tax_minor).sum::<i64>() + input.shipping.tax_minor;
    let totals = json!({"currency":currency.code,"currencyScale":currency.scale,"totalMinor":input.total_minor.to_string(),"totalPrice":input.total_minor as f64/factor,"netPrice":(input.total_minor-tax) as f64/factor,"taxStatus":"gross","tax":tax as f64/factor,"taxMinor":tax.to_string()});
    let method = json!({"id":"external-marketplace","mode":"external_recorded","name":{"en":"Marketplace payment"}});
    let delivery = json!({"id":uid(),"state":"open","shippingMethodId":"external-marketplace","trackingCodes":[],"shippingCosts":input.shipping.price(currency.scale,1)});
    let quote = json!({"lineItems":lines,"price":totals,"shippingCosts":input.shipping.price(currency.scale,1),"paymentMethod":method,"deliveries":[delivery],"currencyContext":{"code":currency.code,"scale":currency.scale,"factor":currency.rate,"strategy":"external_snapshot"}});
    let data:Cart=serde_json::from_value(json!({"items":ids.iter().zip(&input.lines).map(|(id,l)|json!({"id":id,"quantity":l.quantity})).collect::<Vec<_>>(),"group":"retail","email":input.email,"company":null,"session":key,"buyer":null,"order":null,"currency":currency.code,"sales_channel":input.sales_channel_id,"locale":input.locale,"channel":"marketplace"})).map_err(|_|bad("Invalid external cart"))?;
    let c = StoredCart {
        id: uid(),
        tenant: t.clone(),
        token: uid(),
        data,
        revision: 1,
        status: "completed".into(),
    };
    let selection:super::CheckoutSelection=serde_json::from_value(json!({"country":input.shipping_address.country,"address":input.shipping_address,"billingAddress":input.billing_address,"shippingMethodId":"external-marketplace","paymentMethodId":"external-marketplace"})).map_err(|_|bad("Invalid source addresses"))?;
    let customer = accounts::order_snapshot(&mut tx, &c, &selection).await?;
    let id = uid();
    let mut order = json!({"id":id,"orderNumber":format!("RAC-{}",&id[..8]),"cart":quote,"state":"placed","revision":1,"channel":"marketplace","customerGroup":"retail","deliveries":[delivery],"payment":{"method":method,"provider":"external_marketplace","state":"captured","realMoneyCharged":false,"externallyPaid":true},"money":{"minor":input.total_minor,"currency":{"code":currency.code,"scale":currency.scale}},"external":{"appId":app,"orderId":input.external_id},"currencyContext":quote["currencyContext"]});
    order
        .as_object_mut()
        .unwrap()
        .extend(customer.as_object().unwrap().clone());
    super::order_fields(&mut order);
    let mut cart = json!(c.data);
    cart["order"] = order.clone();
    sqlx::query("INSERT INTO carts(id,tenant,token,data,status) VALUES($1,$2,$3,$4,'completed')")
        .bind(&c.id)
        .bind(&t)
        .bind(&c.token)
        .bind(cart)
        .execute(&mut *tx)
        .await?;
    sqlx::query("INSERT INTO orders(id,tenant,cart_id,idempotency_key,fingerprint,data) VALUES($1,$2,$3,$4,$5,$6)").bind(&id).bind(&t).bind(&c.id).bind(key).bind(fingerprint).bind(&order).execute(&mut *tx).await?;
    super::inventory::allocate(&mut tx, &c, &id).await?;
    super::inventory::consume(&mut tx, &c).await?;
    assets::snapshot(&mut tx, &c, &id).await?;
    {
        let kind = "order.placed";
        sqlx::query("INSERT INTO outbox(tenant,kind,data) VALUES($1,$2,$3)").bind(&t).bind(kind).bind(json!({"orderId":id,"totalMinor":input.total_minor,"salesChannelId":input.sales_channel_id,"appId":app})).execute(&mut *tx).await?;
    }
    tx.commit().await?;
    // Customer/order reads must never expose the private completed-cart token.
    Ok(json!({"order":order,"replayed":false}))
}
