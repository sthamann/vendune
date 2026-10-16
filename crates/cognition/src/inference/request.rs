//! One provider request owns native wire translation, bounded model admission and network egress.
use super::*;
impl Inference {
    #[tracing::instrument(skip_all,fields(trace_id=%veyndo_runtime::trace::current()))]
    pub(super) async fn structured_resolved(
        &self,
        choice: Option<&Choice>,
        system: &str,
        user: &str,
        schema: &Value,
        images: &[String],
    ) -> Result<Output, InferenceError> {
        let provider = match choice.map(|c| c.provider.clone()) {
            Some(Provider::Platform) | None => self.default_provider.clone(),
            Some(value) => value,
        };
        let id = serde_json::to_value(&provider).unwrap();
        if self
            .disabled
            .iter()
            .any(|v| Some(v.as_str()) == id.as_str())
        {
            return Err("Provider disabled by platform operator".into());
        }
        let default_model = match provider {
            Provider::Ollama => &self.local_model,
            Provider::Openai => &self.openai_model,
            Provider::Anthropic => &self.anthropic_model,
            Provider::Platform => return Err("Invalid platform provider".into()),
        };
        let model = choice
            .filter(|c| !matches!(c.provider, Provider::Platform))
            .and_then(|c| c.model.as_ref())
            .unwrap_or(default_model);
        if model.is_empty()
            || model.len() > 128
            || !model.is_ascii()
            || model.chars().any(char::is_control)
        {
            return Err("Invalid model identifier".into());
        }
        let mut visual = vec![json!({"type":"input_text","text":user})];
        visual.extend(
            images
                .iter()
                .map(|s| json!({"type":"input_image","image_url":s})),
        );
        let mut claude = vec![json!({"type":"text","text":user})];
        for image in images {
            let (mime, data) = image
                .strip_prefix("data:")
                .and_then(|s| s.split_once(";base64,"))
                .ok_or("Invalid image data")?;
            claude.push(
                json!({"type":"image","source":{"type":"base64","media_type":mime,"data":data}}),
            );
        }
        let (mut request, path) = match provider {
            Provider::Platform => return Err("Invalid platform provider".into()),
            Provider::Ollama => (
                json!({"model":model,"stream":false,"think":false,"format":schema,"options":{"temperature":0,"num_predict":if schema["properties"].get("manifest").is_some() || schema["properties"].get("patch").is_some(){8192}else{2000}},"messages":[{"role":"system","content":system},{"role":"user","content":user,"images":images.iter().filter_map(|s|s.split_once(";base64,").map(|(_,b)|b)).collect::<Vec<_>>()}]}),
                format!("{}/api/chat", self.ollama.trim_end_matches('/')),
            ),
            Provider::Openai if env::var("OPENAI_PROTOCOL").as_deref() == Ok("chat") => (
                protocol::chat_request(model, system, user, schema, images),
                format!("{}/chat/completions", self.openai_url.trim_end_matches('/')),
            ),
            Provider::Openai => (
                json!({"model":model,"store":false,"instructions":system,"input":if images.is_empty(){json!(user)}else{json!([{"role":"user","content":visual}])},"max_output_tokens":8192,"text":{"format":{"type":"json_schema","name":"commerce_result","strict":true,"schema":strict_schema(schema.clone())}}}),
                format!("{}/responses", self.openai_url.trim_end_matches('/')),
            ),
            Provider::Anthropic => (
                json!({"model":model,"max_tokens":8192,"system":system,"messages":[{"role":"user","content":if images.is_empty(){json!(user)}else{json!(claude)}}],"output_config":{"format":{"type":"json_schema","schema":schema}}}),
                format!("{}/messages", self.anthropic_url.trim_end_matches('/')),
            ),
        };
        let native_tools = schema.get("x-veyndo-tools").is_some();
        if native_tools {
            tools::request(&provider, schema, &mut request)?;
        }
        protocol::prompt_cache(&provider, &mut request, system);
        let mut req = self.http.post(path).json(&request);
        req = match provider {
            Provider::Platform => return Err("Invalid platform provider".into()),
            Provider::Ollama => {
                if let Some(key) = &self.ollama_key {
                    req.bearer_auth(key)
                } else {
                    req
                }
            }
            Provider::Openai => req.bearer_auth(
                self.openai_key
                    .as_ref()
                    .ok_or("OpenAI is not configured: set OPENAI_API_KEY on the server")?,
            ),
            Provider::Anthropic => req
                .header(
                    "x-api-key",
                    self.anthropic_key
                        .as_ref()
                        .ok_or("Claude is not configured: set ANTHROPIC_API_KEY on the server")?,
                )
                .header("anthropic-version", "2023-06-01"),
        };
        Box::pin(budget::reserve(
            self.budget_db.as_ref(),
            &request,
            !images.is_empty(),
            id.as_str().unwrap(),
        ))
        .await?;
        let response = req
            .send()
            .await
            .map_err(|_| "Model service unavailable".to_string())?;
        if !response.status().is_success() {
            return Err(format!(
                "Model service rejected the request (HTTP {})",
                response.status().as_u16()
            )
            .into());
        }
        let raw = crate::http_json::bounded(response, 2 * 1024 * 1024).await?;
        let (native_value, continuation) = if native_tools {
            let (v, c) = tools::parse(&provider, schema, &raw)?;
            (Some(v), Some(c))
        } else {
            (None, None)
        };
        let value = if let Some(value) = native_value {
            value
        } else if matches!(provider, Provider::Openai)
            && env::var("OPENAI_PROTOCOL").as_deref() == Ok("chat")
        {
            protocol::chat_response(&raw)?
        } else {
            parse(&provider, &raw)?
        };
        let value = if matches!(provider, Provider::Openai) && !native_tools {
            schema::restore(schema, value)?
        } else {
            value
        };
        let mut usage = raw
            .get("usage")
            .filter(|v| v.is_object())
            .cloned()
            .unwrap_or_else(|| json!({"output_tokens":raw["eval_count"]}));
        usage["prompt"] = crate::prompts::evidence(system);
        if let Some(continuation) = continuation {
            usage["toolContinuation"] = continuation;
        }
        Ok(Output {
            value,
            model: model.clone(),
            provider,
            usage,
        })
    }
}
