//! Indexed channel report and a derived semantic graph; observations never imply causation or model learning.
use super::*;
// SQL composition uses only bundled static clauses; every request value remains a bind parameter.
pub(super) async fn read(a: &App, h: &RequestContext, t: &str, v: &Value) -> Result<Value> {
    apps::validate_input(&super::schema("knowledge.behavior").unwrap(), v)?;
    let requested_days = v["days"].as_i64().unwrap_or(7) as i32;
    let channel = v["salesChannelId"].as_str().unwrap_or("default");
    let (settings, _) = commerce::scoped_config(a, t, channel).await?;
    let policy = &settings.legal.behavior_analytics;
    let days = requested_days.min(policy.retention_days as i32);
    let exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM sales_channels WHERE tenant=$1 AND id=$2)")
            .bind(t)
            .bind(channel)
            .fetch_one(&a.db)
            .await?;
    if !exists {
        return Err(Error(
            StatusCode::NOT_FOUND,
            "Sales channel not found".into(),
        ));
    }
    let version = if policy.enabled && settings.legal.purposes.get("analytics") == Some(&true) {
        legal::policy_version(&settings.legal)
    } else {
        String::new()
    };
    let (locale, chain) = language_context(a, h).await?;
    let mut tx = a.db.begin_read_snapshot().await?;
    let prefix = format!("WITH events AS ({}) ", include_str!("eligible.sql"));
    let q = format!(
        "{prefix} SELECT count(*)::bigint AS events,count(DISTINCT session)::bigint AS contexts,count(DISTINCT session) FILTER(WHERE customer_id IS NOT NULL)::bigint AS identified,count(DISTINCT session) FILTER(WHERE kind='product_view')::bigint AS viewed,count(DISTINCT session) FILTER(WHERE kind='cart_add')::bigint AS added,count(DISTINCT session) FILTER(WHERE kind='checkout_start')::bigint AS checkout,(SELECT count(DISTINCT o.id) FROM orders o JOIN events e ON e.tenant=o.tenant AND e.cart_id=o.cart_id WHERE o.created_at>=now()-make_interval(days=>$3))::bigint AS ordered FROM events"
    );
    let r = sqlx::query(sqlx::AssertSqlSafe(q.as_str()))
        .bind(t)
        .bind(channel)
        .bind(days)
        .bind(&version)
        .fetch_one(&mut *tx)
        .await?;
    let totals = json!({"events":r.get::<i64,_>("events"),"contexts":r.get::<i64,_>("contexts"),"identified":r.get::<i64,_>("identified"),"viewed":r.get::<i64,_>("viewed"),"added":r.get::<i64,_>("added"),"checkout":r.get::<i64,_>("checkout"),"ordered":r.get::<i64,_>("ordered")});
    let q = format!(
        "{prefix} SELECT dimension, label,count(*)::bigint AS events,count(DISTINCT session)::bigint AS contexts FROM events CROSS JOIN LATERAL (VALUES ('browser',coalesce(dimensions->>'browser','Other')),('viewport',coalesce(dimensions->>'viewport','unknown')),('country',coalesce(dimensions->>'country','unknown')),('geoCountry',coalesce(dimensions->>'geoCountry','unknown')),('referrer',coalesce(dimensions->>'referrerHost','direct')),('kind',kind),('locale',coalesce(dimensions->>'locale','unknown'))) d(dimension,label) GROUP BY dimension,label ORDER BY contexts DESC,label LIMIT 100"
    );
    let dimensions=sqlx::query(sqlx::AssertSqlSafe(q.as_str())).bind(t).bind(channel).bind(days).bind(&version).fetch_all(&mut *tx).await?.iter().map(|r|json!({"dimension":r.get::<String,_>("dimension"),"label":r.get::<String,_>("label"),"events":r.get::<i64,_>("events"),"contexts":r.get::<i64,_>("contexts")})).collect::<Vec<_>>();
    let q = format!(
        "{prefix} SELECT (created_at AT TIME ZONE 'UTC')::date::text AS day,count(*)::bigint AS events,count(DISTINCT session)::bigint AS contexts FROM events GROUP BY day ORDER BY day"
    );
    let daily=sqlx::query(sqlx::AssertSqlSafe(q.as_str())).bind(t).bind(channel).bind(days).bind(&version).fetch_all(&mut *tx).await?.iter().map(|r|json!({"day":r.get::<String,_>("day"),"events":r.get::<i64,_>("events"),"contexts":r.get::<i64,_>("contexts")})).collect::<Vec<_>>();
    let q = format!(
        "{prefix} SELECT e.product_id,p.name,p.category,count(*) FILTER(WHERE kind='product_view')::bigint AS views,count(*) FILTER(WHERE kind='cart_add')::bigint AS adds,count(*) FILTER(WHERE kind='product_question')::bigint AS questions,count(DISTINCT session)::bigint AS contexts FROM events e JOIN products p ON p.tenant=e.tenant AND p.id=e.product_id GROUP BY e.product_id,p.name,p.category ORDER BY contexts DESC,e.product_id LIMIT 20"
    );
    let mut products=sqlx::query(sqlx::AssertSqlSafe(q.as_str())).bind(t).bind(channel).bind(days).bind(&version).fetch_all(&mut *tx).await?.iter().map(|r|json!({"id":r.get::<String,_>("product_id"),"name":r.get::<String,_>("name"),"category":r.get::<String,_>("category"),"views":r.get::<i64,_>("views"),"adds":r.get::<i64,_>("adds"),"questions":r.get::<i64,_>("questions"),"contexts":r.get::<i64,_>("contexts")})).collect::<Vec<_>>();
    let ids = products
        .iter()
        .map(|p| p["id"].as_str().unwrap().to_string())
        .collect::<Vec<_>>();
    let translations=sqlx::query("SELECT product_id,name FROM product_translations WHERE tenant=$1 AND product_id=ANY($2) AND language_id=ANY($3) AND name IS NOT NULL ORDER BY array_position($3,language_id)").bind(t).bind(&ids).bind(&chain).fetch_all(&mut *tx).await?;
    for product in &mut products {
        if let Some(r) = translations
            .iter()
            .find(|r| r.get::<String, _>("product_id") == product["id"].as_str().unwrap())
        {
            product["name"] = json!(r.get::<String, _>("name"));
        }
    }
    let q = format!(
        "{prefix} SELECT product_id,coalesce(dimensions->>'browser','Other') AS browser,count(DISTINCT session)::bigint AS contexts FROM events WHERE product_id=ANY($5) GROUP BY product_id,browser ORDER BY contexts DESC LIMIT 60"
    );
    let edges=sqlx::query(sqlx::AssertSqlSafe(q.as_str())).bind(t).bind(channel).bind(days).bind(&version).bind(&ids).fetch_all(&mut *tx).await?.iter().map(|r|json!({"source":format!("browser:{}",r.get::<String,_>("browser")),"target":format!("product:{}",r.get::<String,_>("product_id")),"kind":"observed","count":r.get::<i64,_>("contexts")})).collect::<Vec<_>>();
    let relations=sqlx::query("SELECT source_id,target_id,kind,state FROM knowledge_relations WHERE tenant=$1 AND source_id=ANY($2) AND kind='SERVES' AND state IN ('confirmed','evidenced') AND (valid_from IS NULL OR valid_from<=now()) AND (valid_until IS NULL OR valid_until>now()) ORDER BY source_id,target_id LIMIT 60").bind(t).bind(&ids).fetch_all(&mut *tx).await?.iter().map(|r|json!({"source":format!("product:{}",r.get::<String,_>("source_id")),"target":format!("intent:{}",r.get::<String,_>("target_id")),"kind":r.get::<String,_>("kind"),"state":r.get::<String,_>("state")})).collect::<Vec<_>>();
    let mut journeys = vec![];
    if auth::allowed(h, "customers.pii") {
        let q = format!(
            "{prefix} SELECT session,max(created_at)::text AS last,count(*)::bigint AS events,bool_or(customer_id IS NOT NULL) AS identified FROM events GROUP BY session ORDER BY max(created_at) DESC LIMIT 20"
        );
        journeys=sqlx::query(sqlx::AssertSqlSafe(q.as_str())).bind(t).bind(channel).bind(days).bind(&version).fetch_all(&mut *tx).await?.iter().map(|r|json!({"session":r.get::<String,_>("session"),"last":r.get::<String,_>("last"),"events":r.get::<i64,_>("events"),"identified":r.get::<bool,_>("identified")})).collect();
    }
    let channels = sqlx::query("SELECT id,data->'name' AS name FROM sales_channels WHERE tenant=$1 ORDER BY id LIMIT 100")
        .bind(t).fetch_all(&mut *tx).await?.iter().map(|r| {
            let names: Value = r.get("name");
            let name = [locale.as_str(), locale.split('-').next().unwrap_or(&locale), settings.main_locale.as_str(), settings.main_locale.split('-').next().unwrap_or(&settings.main_locale)].iter().find_map(|key| names[*key].as_str());
            json!({"id":r.get::<String,_>("id"),"name":name.unwrap_or(r.get::<String,_>("id").as_str())})
        }).collect::<Vec<_>>();
    tx.commit().await?;
    Ok(
        json!({"salesChannelId":channel,"channels":channels,"days":days,"retentionDays":policy.retention_days,"enabled":policy.enabled,"eventsPerHour":policy.events_per_hour,"totals":totals,"dimensions":dimensions,"daily":daily,"products":products,"graph":{"observations":edges,"semantic":relations},"journeys":journeys,"canInspectJourneys":auth::allowed(h,"customers.pii"),"basis":"consent-bound cart contexts; client observations, native orders; not unique humans or causal attribution","modelLearning":false,"geoConfigured":geography::configured()}),
    )
}
