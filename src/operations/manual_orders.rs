//! Actor-private manual-order quotes reuse native cart, legal, pricing, inventory and checkout; no second order ledger.
use super::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Draft {
    channel_id: String,
    customer_id: String,
    locale: String,
    currency: String,
    items: Vec<Item>,
    checkout: commerce::CheckoutSelection,
    #[serde(default)]
    codes: Vec<String>,
}
fn context(a: &App, h: &RequestContext, channel: &str) -> Result<RequestContext> {
    merchant(a, h)?;
    for right in [
        "orders.write",
        "customers.read",
        "customers.pii",
        "catalog.read",
    ] {
        auth::permit(h, right)?;
    }
    if !apps::identifier(channel) {
        return Err(bad("Sales channel required"));
    }
    let mut h = h.clone();
    h.admin_order = Some(
        header(&h, "x-rac-user")
            .ok_or(bad("Merchant identity required"))?
            .into(),
    );
    h.insert(
        "sw-sales-channel-id",
        channel.parse().map_err(|_| bad("Invalid sales channel"))?,
    );
    h.remove("sw-context-token");
    h.remove("x-customer-token");
    Ok(h)
}
pub(super) async fn route(
    State(a): State<App>,
    h: RequestContext,
    Path(operation): Path<String>,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    Ok(Json(invoke(&a, &h, &operation, &v).await?))
}
pub(crate) async fn invoke(
    a: &App,
    original: &RequestContext,
    operation: &str,
    v: &Value,
) -> Result<Value> {
    let channel = v["channelId"]
        .as_str()
        .ok_or(bad("Sales channel required"))?;
    let mut h = context(a, original, channel)?;
    let (cfg, _) = commerce::scoped_config(a, &tenant(&h)?, channel).await?;
    let locale = v["locale"].as_str().unwrap_or(&cfg.main_locale);
    h.insert(
        "x-commerce-locale",
        locale.parse().map_err(|_| bad("Invalid order language"))?,
    );
    if !cfg.locales.iter().any(|l| l == locale) {
        return Err(bad("Order language unavailable"));
    }
    let data = marketing::channel(a, &h, channel, locale).await?;
    if data
        .as_ref()
        .is_some_and(|c| !c.active || c.visibility != "public")
    {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Sales channel is paused or private; open an authorized merchant preview".into(),
        ));
    }
    if data.is_some_and(|c| c.kind != "storefront" && c.kind != "headless") {
        return Err(bad(
            "Choose a storefront or API sales channel; use the dedicated POS or marketplace workflow otherwise",
        ));
    }
    if operation == "context" {
        let channels: Vec<Value> = sqlx::query_scalar("SELECT jsonb_build_object('id',id,'name',data->'name') FROM sales_channels WHERE tenant=$1 AND data->>'kind' IN ('storefront','headless') AND data->>'active'='true' AND coalesce(data->>'visibility','public')='public' ORDER BY id LIMIT 100").bind(tenant(&h)?).fetch_all(&a.db).await?;
        return Ok(
            json!({"options":commerce::options(State(a.clone()),h.clone()).await?.0,"currencies":currencies::invoke(a,&h,"currency.list",&json!({})).await?,"policy":legal::invoke(a,&h,"privacy.policy",&json!({})).await?,"channels":channels,"customerGroups":cfg.customer_groups,"mainLocale":cfg.main_locale}),
        );
    }
    if operation == "review" {
        let draft: Draft = serde_json::from_value(v.clone())
            .map_err(|_| bad("Customer, items and checkout selection required"))?;
        validate_items(&draft.items)?;
        if draft.items.is_empty() {
            return Err(bad("Add at least one product"));
        }
        h.insert(
            "x-commerce-currency",
            draft
                .currency
                .parse()
                .map_err(|_| bad("Invalid currency"))?,
        );
        let row=sqlx::query("SELECT id,email,group_name,company FROM customers WHERE tenant=$1 AND id=$2 AND active").bind(tenant(&h)?).bind(&draft.customer_id).fetch_optional(&a.db).await?.ok_or(Error(StatusCode::NOT_FOUND,"Active customer unavailable".into()))?;
        let mut c = new_cart_context(a, &h, "", "admin").await?;
        c.data.admin_actor = h.admin_order.clone();
        c.data.customer_id = Some(row.get("id"));
        c.data.email = Some(row.get("email"));
        c.data.group = row.get("group_name");
        c.data.company = row.get("company");
        sqlx::query("UPDATE carts SET data=$1 WHERE tenant=$2 AND id=$3")
            .bind(json!(c.data))
            .bind(&c.tenant)
            .bind(&c.id)
            .execute(&a.db)
            .await?;
        h.insert("sw-context-token", c.token.parse().unwrap());
        c = set_items(a, &h, draft.items, Some(c.revision)).await?;
        let mut selection = draft.checkout;
        if selection.billing_address_id.is_some() || selection.shipping_address_id.is_some() {
            return Err(bad(
                "Supply the reviewed address snapshot, not account address IDs",
            ));
        }
        selection.customer_email = c.data.email.clone();
        let quote = commerce::select_checkout(
            State(a.clone()),
            h.clone(),
            Json(json!({"revision":c.revision,"checkout":selection})),
        )
        .await?
        .0;
        let c = load_cart(a, &h).await?;
        let quote = if draft.codes.is_empty() {
            quote
        } else {
            marketing::coupons(
                State(a.clone()),
                h.clone(),
                Json(json!({"revision":c.revision,"codes":draft.codes})),
            )
            .await?
            .0
        };
        if !matches!(
            quote["paymentMethod"]["mode"].as_str(),
            Some("simulated" | "manual")
        ) {
            return Err(bad(
                "Manual orders require a configured manual or simulated payment; real provider payment must be completed by the buyer",
            ));
        }
        return Ok(
            json!({"cart":quote,"policy":legal::invoke(a,&h,"privacy.policy",&json!({})).await?,"channelId":draft.channel_id,"locale":draft.locale}),
        );
    }
    if operation != "complete" || v["approve"] != true {
        return Err(bad("Explicit reviewed order approval required"));
    }
    h.insert(
        "sw-context-token",
        v["cartToken"]
            .as_str()
            .ok_or(bad("Reviewed cart required"))?
            .parse()
            .map_err(|_| bad("Invalid cart token"))?,
    );
    let c = load_cart(a, &h).await?;
    if c.data.admin_actor.is_none() {
        return Err(bad("Not an admin order draft"));
    }
    if c.data.locale != locale {
        return Err(conflict("Order language changed; review again"));
    }
    if c.status == "open" {
        let quote = cart_json(a, &c).await?;
        if !matches!(
            quote["paymentMethod"]["mode"].as_str(),
            Some("simulated" | "manual")
        ) {
            return Err(bad("Buyer payment required for this provider"));
        }
        if v["customerAcknowledgement"] != true {
            return Err(bad(
                "Confirm the customer's authorization before creating the order",
            ));
        }
        legal::invoke(a,&h,"legal.accept",&json!({"policyVersion":v["policyVersion"],"terms":v["terms"],"digitalImmediate":v["digitalImmediate"]})).await?;
    }
    h.insert(
        "x-commerce-cart-revision",
        v["revision"]
            .as_i64()
            .ok_or(bad("Reviewed revision required"))?
            .to_string()
            .parse()
            .unwrap(),
    );
    h.insert(
        "x-commerce-total-minor",
        v["totalMinor"]
            .as_str()
            .ok_or(bad("Reviewed exact total required"))?
            .parse()
            .map_err(|_| bad("Invalid exact total"))?,
    );
    Box::pin(checkout(
        a,
        &h,
        v["requestKey"]
            .as_str()
            .ok_or(bad("Order request key required"))?,
    ))
    .await
}
