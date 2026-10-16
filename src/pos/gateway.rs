//! HTTP/MCP POS operations construct a trusted cashier context, then call existing commerce owners.
use super::input::Input;
use super::*;
pub(super) async fn channels(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    auth::permit(&h, "pos.use")?;
    let rows=sqlx::query("SELECT id,data,revision FROM sales_channels WHERE tenant=$1 AND data->>'kind'='pos' ORDER BY id LIMIT 100").bind(&t).fetch_all(&a.db).await?;
    let config = commerce::config(&a, &t).await?.0;
    Ok(Json(
        json!({"channels":rows.iter().map(|r|json!({"id":r.get::<String,_>("id"),"data":r.get::<Value,_>("data"),"revision":r.get::<i64,_>("revision")})).collect::<Vec<_>>(),"mainLocale":config.main_locale}),
    ))
}
pub(super) async fn route(
    State(a): State<App>,
    h: RequestContext,
    Path((channel, operation)): Path<(String, String)>,
    Json(mut v): Json<Value>,
) -> Result<Json<Value>> {
    if v.get("channelId").is_some_and(|id| id != &json!(channel)) {
        return Err(bad("POS channel context differs"));
    }
    v["channelId"] = json!(channel);
    Ok(Json(invoke(&a, &h, &operation, &v).await?))
}
pub(crate) async fn invoke(
    a: &App,
    original: &RequestContext,
    op: &str,
    v: &Value,
) -> Result<Value> {
    let input: Input = serde_json::from_value(v.clone()).map_err(|_| bad("Invalid POS input"))?;
    let t = merchant(a, original)?;
    auth::permit(original, "pos.use")?;
    auth::permit(original, "catalog.read")?;
    if op == "channels" {
        return Ok(channels(State(a.clone()), original.clone()).await?.0);
    }
    let channel = input
        .channel_id
        .as_deref()
        .filter(|id| apps::identifier(id))
        .ok_or(bad("POS channel required"))?;
    let mut h = original.clone();
    h.insert(
        "sw-sales-channel-id",
        channel.parse().map_err(|_| bad("Invalid POS channel"))?,
    );
    let actor = header(&h, "x-rac-user")
        .ok_or(bad("Cashier identity required"))?
        .to_owned();
    let tender = input
        .tender_minor
        .as_deref()
        .map(|v| {
            if v.is_empty() || v.len() > 13 || !v.bytes().all(|b| b.is_ascii_digit()) {
                return Err(bad("Invalid cash tender"));
            }
            v.parse::<u64>().map_err(|_| bad("Invalid cash tender"))
        })
        .transpose()?;
    h.pos = Some(Admission {
        actor: actor.clone(),
        tender_minor: tender,
    });
    let data = marketing::channel(a, &h, channel, &language_context(a, &h).await?.0)
        .await?
        .ok_or(bad("POS channel unavailable"))?;
    if data.kind != "pos" || !data.active {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "POS channel is paused or unavailable".into(),
        ));
    }
    if let Some(token) = &input.cart_token {
        h.insert(
            "sw-context-token",
            token.parse().map_err(|_| bad("Invalid POS cart token"))?,
        );
    }
    if ["customers", "customer", "discount", "receipt"].contains(&op) {
        // Bound the additional cashier futures so the shared MCP dispatcher retains a small stack frame.
        return Box::pin(super::workspace_gateway::invoke(
            a, h, channel, op, v, &input,
        ))
        .await;
    }
    match op {
        "currency" | "coupons" => {
            auth::permit(&h, "orders.write")?;
            load_cart(a, &h).await?;
            let revision = input.revision.ok_or(bad("Cart revision required"))?;
            if op == "currency" {
                currencies::invoke(
                    a,
                    &h,
                    "currency.select",
                    &json!({"revision":revision,"currency":input.currency}),
                )
                .await
            } else {
                Ok(marketing::coupons(
                    State(a.clone()),
                    h,
                    Json(json!({"revision":revision,"codes":input.codes})),
                )
                .await?
                .0)
            }
        }
        "payment" | "reconcile" => {
            let c = load_cart(a, &h).await?;
            let order = c.data.order.as_ref().ok_or(bad("POS sale not completed"))?;
            let id = order["payment"]["attemptId"]
                .as_str()
                .ok_or(bad("Sale has no provider attempt"))?;
            payments::customer(a, &h, id).await?;
            if op == "reconcile" {
                auth::permit(&h, "payments.manage")?;
                payments::enqueue(
                    a,
                    &h,
                    id,
                    "reconcile",
                    input
                        .request_key
                        .as_deref()
                        .ok_or(bad("Request key required"))?,
                    &json!({}),
                )
                .await?;
            }
            payments::read_sale(a, &t, id, &c.id).await
        }
        "context" => Ok(
            json!({"channel":data,"options":commerce::options(State(a.clone()),h.clone()).await?.0,"policy":legal::invoke(a,&h,"privacy.policy",&json!({})).await?,"currencies":currencies::invoke(a,&h,"currency.list",&json!({})).await?}),
        ),
        "detail" => Ok(commerce::product_detail(
            State(a.clone()),
            h,
            Path(input.product_id.ok_or(bad("Product required"))?),
            axum::extract::Query(CatalogCriteria {
                after: input.after,
                limit: Some(40),
                ..Default::default()
            }),
        )
        .await?
        .0),
        "create" => {
            auth::permit(&h, "orders.write")?;
            let mut c = new_cart_context(a, &h, "", "pos").await?;
            c.data.pos_actor = Some(actor);
            let selection = c.data.checkout.as_mut().unwrap();
            selection.country = data
                .pos
                .as_ref()
                .ok_or(bad("POS location required"))?
                .country
                .clone();
            selection.shipping_method_id = "pickup".into();
            selection.payment_method_id = "pos-cash".into();
            sqlx::query("UPDATE carts SET data=$1 WHERE tenant=$2 AND id=$3")
                .bind(json!(c.data))
                .bind(&t)
                .bind(&c.id)
                .execute(&a.db)
                .await?;
            Ok(
                json!({"cart":cart_json(a,&c).await?,"channel":data,"options":commerce::options(State(a.clone()),h.clone()).await?.0,"policy":legal::invoke(a,&h,"privacy.policy",&json!({})).await?,"currencies":currencies::invoke(a,&h,"currency.list",&json!({})).await?}),
            )
        }
        "cart" => Ok(cart_json(a, &load_cart(a, &h).await?).await?),
        "replace" => {
            auth::permit(&h, "orders.write")?;
            let c = set_items(
                a,
                &h,
                input.items.ok_or(bad("POS items required"))?,
                Some(input.revision.ok_or(bad("Cart revision required"))?),
            )
            .await?;
            cart_json(a, &c).await
        }
        "select" => {
            auth::permit(&h, "orders.write")?;
            load_cart(a, &h).await?;
            let selected = input.checkout.ok_or(bad("Checkout selection required"))?;
            if selected.country != data.pos.as_ref().unwrap().country
                || selected.shipping_method_id != "pickup"
            {
                return Err(bad(
                    "POS checkout requires its location country and collection",
                ));
            }
            Ok(commerce::select_checkout(
                State(a.clone()),
                h,
                Json(json!({"revision":input.revision,"checkout":selected})),
            )
            .await?
            .0)
        }
        "accept" => {
            auth::permit(&h, "orders.write")?;
            load_cart(a, &h).await?;
            legal::invoke(a,&h,"legal.accept",&json!({"policyVersion":input.policy_version,"terms":input.terms,"digitalImmediate":input.digital_immediate})).await
        }
        "complete" => {
            auth::permit(&h, "orders.write")?;
            if tender.is_some() {
                auth::permit(&h, "payments.manage")?;
            }
            let c = load_cart(a, &h).await?;
            if c.data.pos_actor.is_none() {
                return Err(bad("Not a POS cart"));
            }

            h.insert(
                "x-commerce-cart-revision",
                input
                    .revision
                    .ok_or(bad("Cart revision required"))?
                    .to_string()
                    .parse()
                    .unwrap(),
            );
            h.insert(
                "x-commerce-total-minor",
                input
                    .total_minor
                    .as_deref()
                    .ok_or(bad("POS reviewed total required"))?
                    .parse()
                    .map_err(|_| bad("Invalid POS reviewed total"))?,
            );
            Box::pin(checkout(
                a,
                &h,
                input
                    .request_key
                    .as_deref()
                    .ok_or(bad("POS request key required"))?,
            ))
            .await
        }
        "held" => {
            let rows=sqlx::query("SELECT token,revision,data FROM carts WHERE tenant=$1 AND status='open' AND data->>'sales_channel'=$2 AND data->>'pos_actor'=$3 AND jsonb_array_length(data->'items')>0 ORDER BY created_at DESC LIMIT 40").bind(&t).bind(channel).bind(actor).fetch_all(&a.db).await?;
            Ok(
                json!({"elements":rows.iter().map(|r|json!({"token":r.get::<String,_>("token"),"revision":r.get::<i64,_>("revision"),"items":r.get::<Value,_>("data")["items"]})).collect::<Vec<_>>() }),
            )
        }
        "sales" => {
            auth::permit(&h, "orders.read")?;
            let rows=sqlx::query("SELECT id,data->>'orderNumber' AS number,data->'money' AS money,data->'payment'->>'state' AS payment,data->'pos' AS pos,created_at::text AS created FROM orders WHERE tenant=$1 AND data->>'salesChannelId'=$2 ORDER BY created_at DESC LIMIT 30").bind(&t).bind(channel).fetch_all(&a.db).await?;
            Ok(
                json!({"elements":rows.iter().map(|r|json!({"id":r.get::<String,_>("id"),"number":r.get::<String,_>("number"),"money":r.get::<Value,_>("money"),"paymentState":r.get::<String,_>("payment"),"pos":r.get::<Option<Value>,_>("pos"),"createdAt":r.get::<String,_>("created")})).collect::<Vec<_>>() }),
            )
        }
        "catalog" => {
            let mut criteria = CatalogCriteria {
                search: input.query,
                after: input.after,
                limit: Some(40),
                ..Default::default()
            };
            if let Some(barcode) = input.barcode {
                if barcode.is_empty() || barcode.len() > 100 {
                    return Err(bad("Invalid barcode"));
                }
                let ids:Vec<String>=sqlx::query_scalar("SELECT id FROM products WHERE tenant=$1 AND active AND (id=$2 OR product_number=$2 OR extra->>'ean'=$2) ORDER BY id LIMIT 2").bind(t).bind(barcode).fetch_all(&a.db).await?;
                if ids.len() != 1 {
                    return Err(bad("Barcode is missing or ambiguous in this shop"));
                }
                marketing::admit_product(a, &h, &ids[0]).await?;
                criteria.product_ids = Some(ids);
            }
            Ok(catalog_page(State(a.clone()), h, criteria).await?.0)
        }
        _ => Err(bad("Unknown POS operation")),
    }
}
