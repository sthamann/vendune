//! Persistent grounded conversations and tenant-scoped semantic knowledge HTTP adapters.
use super::*;
pub(crate) fn assistant_access(h: &RequestContext) -> Result<()> {
    for right in [
        "assistant.use",
        "catalog.read",
        "orders.read",
        "knowledge.read",
    ] {
        auth::permit(h, right)?;
    }
    Ok(())
}

pub(super) fn choice(v: &Value) -> Result<Option<Choice>> {
    v.get("inference")
        .filter(|v| !v.is_null())
        .map(|v| serde_json::from_value(v.clone()).map_err(|_| bad("Invalid inference selection")))
        .transpose()
}
pub(super) async fn model_providers(
    State(a): State<App>,
    h: RequestContext,
) -> Result<Json<Value>> {
    merchant(&a, &h)?;
    if ![
        "assistant.use",
        "developer.read",
        "knowledge.read",
        "ai.manage",
    ]
    .iter()
    .any(|s| auth::allowed(&h, s))
    {
        auth::permit(&h, "assistant.use")?;
    }
    Ok(Json(a.inference.public_providers().await.map_err(bad)?))
}
pub(super) async fn knowledge_graph(
    State(a): State<App>,
    h: RequestContext,
) -> Result<Json<Value>> {
    Ok(Json(knowledge::graph(&a.db, &tenant(&h)?).await?))
}
pub(super) async fn knowledge_status(
    State(a): State<App>,
    h: RequestContext,
) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    let rows = sqlx::query("SELECT product_id,embedding_model,content_hash,vector_digest FROM semantic_products WHERE tenant=$1 ORDER BY product_id LIMIT 200")
        .bind(&t).fetch_all(&a.db).await?;
    let status = sqlx::query(
        "SELECT indexed_products,pending_jobs FROM knowledge_index_status WHERE tenant=$1",
    )
    .bind(&t)
    .fetch_optional(&a.db)
    .await?;
    let errors:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('code',e.key,'count',e.value) FROM knowledge_index_status s CROSS JOIN LATERAL jsonb_each(s.errors) e WHERE tenant=$1 ORDER BY e.key LIMIT 16").bind(&t).fetch_all(&a.db).await?;
    Ok(Json(
        json!({"indexedProducts":status.as_ref().map(|r|r.get::<i64,_>("indexed_products")).unwrap_or(0),"pending":status.as_ref().map(|r|r.get::<i64,_>("pending_jobs")).unwrap_or(0),"errors":errors,"documentsLimit":200,"documents":rows.iter().map(|r|json!({"productId":r.get::<String,_>("product_id"),"model":r.get::<String,_>("embedding_model"),"contentHash":r.get::<String,_>("content_hash"),"vectorDigest":r.get::<String,_>("vector_digest")})).collect::<Vec<_>>()}),
    ))
}
fn embedding_model() -> String {
    env::var("EMBEDDING_MODEL").unwrap_or("qwen3-embedding:0.6b".into())
}
pub(super) async fn retrieve(a: &App, t: &str, q: &str) -> Result<Value> {
    if q.is_empty() || q.len() > 2000 {
        return Err(bad("Query must contain 1..2000 characters"));
    }
    let model = embedding_model();
    let count: i64 = sqlx::query_scalar(
        "SELECT CASE WHEN EXISTS(SELECT 1 FROM semantic_products WHERE tenant=$1 AND embedding_model=$2) THEN 1::bigint ELSE 0::bigint END",
    )
    .bind(t)
    .bind(&model)
    .fetch_one(&a.db)
    .await?;
    let vector = if count > 0 {
        cognition::indexing::query_embedding(
            a,
            t,
            &format!("Instruct: Retrieve suitable commerce products.\nQuery: {q}"),
        )
        .await
    } else {
        None
    };
    let mut result = knowledge::search(&a.db, t, q, vector, &model).await?;
    if env::var("RERANKER_URL").is_ok()
        && let Ok(_slot) = a.inference_slots.clone().try_acquire_owned()
        && let Ok(_lease) =
            crate::performance::cluster_lease::Lease::acquire(a, t, "reranker", 1).await
        && let Some(hits) = result["hits"].as_array_mut()
    {
        let reranked = knowledge::rerank::apply(t, q, hits, &a.db).await;
        result["reranked"] = json!(reranked);
    }
    result["embeddingModel"] = json!(model);
    result["hasIndexedProducts"] = json!(count > 0);
    Ok(result)
}
pub(super) async fn semantic_search(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    Ok(Json(
        retrieve(&a, &tenant(&h)?, v["query"].as_str().unwrap_or("")).await?,
    ))
}
pub(super) async fn reindex(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    auth::permit(&h, "knowledge.write")?;
    let t = merchant(&a, &h)?;
    let queued = cognition::indexing::enqueue(&a, &t, None).await?;
    Ok(Json(
        json!({"queued":queued,"indexed":0,"model":embedding_model(),"engine":"Qdrant","asynchronous":true}),
    ))
}
pub(super) async fn conversations(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    assistant_access(&h)?;
    let t = merchant(&a, &h)?;
    let rows=sqlx::query("SELECT id,title,created_at::text AS created_at FROM conversations WHERE tenant=$1 AND (owner_id=$2 OR (owner_id IS NULL AND $3)) AND NOT EXISTS(SELECT 1 FROM tasks k WHERE k.tenant=conversations.tenant AND k.conversation_id=conversations.id AND k.run_scopes IS NOT NULL AND NOT(k.run_scopes <@ $4)) ORDER BY created_at DESC LIMIT 40").bind(&t).bind(header(&h,"x-rac-user")).bind(header(&h,"x-rac-role")==Some("owner")).bind(json!(auth::SCOPES.iter().filter(|s|auth::allowed(&h,s)).collect::<Vec<_>>())).fetch_all(&a.db).await?;
    Ok(Json(
        json!({"conversations":rows.iter().map(|r|json!({"id":r.get::<String,_>("id"),"title":r.get::<String,_>("title"),"createdAt":r.get::<String,_>("created_at")})).collect::<Vec<_>>()}),
    ))
}
async fn messages(a: &App, t: &str, id: &str) -> Result<Vec<Value>> {
    // Task state is joined on read so approval remains visible after reload.
    let rows=sqlx::query("SELECT m.id,m.role,m.content,m.data,coalesce(k.applied,false) AS applied FROM (SELECT * FROM chat_messages WHERE tenant=$1 AND conversation_id=$2 ORDER BY id DESC LIMIT 200) m LEFT JOIN tasks k ON k.tenant=m.tenant AND k.id=m.data->>'taskId' WHERE m.tenant=$1 AND m.conversation_id=$2 ORDER BY m.id LIMIT 200").bind(t).bind(id).fetch_all(&a.db).await?;
    Ok(rows.iter().map(|r|json!({"id":r.get::<i64,_>("id"),"role":r.get::<String,_>("role"),"content":r.get::<String,_>("content"),"data":r.get::<Value,_>("data"),"applied":r.get::<bool,_>("applied")})).collect())
}
pub(super) async fn conversation(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
) -> Result<Json<Value>> {
    assistant_access(&h)?;
    let t = merchant(&a, &h)?;
    admit_conversation(&a, &t, &id, &h).await?;
    let run = agent_runs::conversation_run(&a, &h, &id).await?;
    Ok(Json(
        json!({"conversationId":id,"messages":messages(&a,&t,&id).await?,"run":run}),
    ))
}
pub(super) async fn merchant_chat(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    assistant_access(&h)?;
    let t = merchant(&a, &h)?;
    auth::permit(&h, "knowledge.read")?;
    let instruction = v["message"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() <= 4000)
        .ok_or(bad("Message must contain 1..4000 characters"))?;
    let selection = choice(&v)?;
    let id = if let Some(id) = v["conversationId"].as_str() {
        admit_conversation(&a, &t, id, &h).await?;
        id.to_string()
    } else {
        uid()
    };
    let previous = messages(&a, &t, &id).await?;
    let history = previous
        .iter()
        .rev()
        .take(16)
        .rev()
        .map(|v| {
            format!(
                "{}: {}",
                v["role"].as_str().unwrap_or(""),
                v["content"].as_str().unwrap_or("")
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let queued=agent_runs::enqueue(&a,&h,json!({"instruction":instruction,"inference":selection,"history":history,"locale":language_context(&a,&h).await?.0,"channel":marketing::channel_id(&h),"requestId":v["requestId"],"newConversation":v["conversationId"].is_null(),"requestedConversation":v["conversationId"]}),Some(&id)).await?;
    let id = queued["conversationId"].as_str().unwrap_or(&id).to_string();
    admit_conversation(&a, &t, &id, &h).await?;
    if v["background"] == true {
        return Ok(Json(
            json!({"conversationId":id,"messages":messages(&a,&t,&id).await?,"run":queued}),
        ));
    }
    complete_chat(&a, &h, queued).await
}
pub(crate) async fn complete_chat(
    a: &App,
    h: &RequestContext,
    queued: Value,
) -> Result<Json<Value>> {
    let t = merchant(a, h)?;
    let id = queued["conversationId"]
        .as_str()
        .ok_or(bad("Saved conversation required"))?;
    let run = agent_runs::wait(
        a,
        h,
        queued["taskId"].as_str().ok_or(bad("Saved run required"))?,
    )
    .await?;
    admit_conversation(a, &t, id, h).await?;
    Ok(Json(
        json!({"conversationId":id,"messages":messages(a,&t,id).await?,"run":run}),
    ))
}

/// GET and subsequent turns share the same current evidence/actor admission before reading any history.
async fn admit_conversation(a: &App, t: &str, id: &str, h: &RequestContext) -> Result<()> {
    let scopes = json!(
        auth::SCOPES
            .iter()
            .filter(|s| auth::allowed(h, s))
            .collect::<Vec<_>>()
    );
    let allowed:Option<bool>=sqlx::query_scalar("SELECT NOT EXISTS(SELECT 1 FROM tasks k WHERE k.tenant=c.tenant AND k.conversation_id=c.id AND k.run_scopes IS NOT NULL AND NOT(k.run_scopes <@ $5)) FROM conversations c WHERE tenant=$1 AND id=$2 AND (owner_id=$3 OR (owner_id IS NULL AND $4))")
        .bind(t).bind(id).bind(header(h,"x-rac-user")).bind(header(h,"x-rac-role")==Some("owner")).bind(scopes).fetch_optional(&a.db).await?;
    match allowed {
        None => Err(Error(
            StatusCode::NOT_FOUND,
            "Conversation not found".into(),
        )),
        Some(false) => Err(Error(
            StatusCode::FORBIDDEN,
            "Conversation evidence requires its original permissions".into(),
        )),
        Some(true) => Ok(()),
    }
}
