//! Provider-native messages and correlated tool results, including opaque reasoning continuation.
use super::*;
pub(in crate::inference) fn request(
    provider: &Provider,
    schema: &Value,
    request: &mut Value,
) -> Result<(), String> {
    if schema.to_string().len() > 300000 {
        return Err("Native tool request budget exceeded".into());
    }
    let defs = definitions(schema)?;
    let chat = matches!(provider, Provider::Openai)
        && env::var("OPENAI_PROTOCOL").as_deref() == Ok("chat");
    let responses = matches!(provider, Provider::Openai) && !chat;
    let tools: Vec<_> = defs.iter().enumerate().map(|(i,t)| {
        let name=alias(i);
        let description=format!("{}: {}",t["name"].as_str().unwrap_or(""),t["description"].as_str().unwrap_or("Authorized read"));
        match provider {
            Provider::Anthropic => json!({"name":name,"description":description,"input_schema":t["inputSchema"]}),
            Provider::Openai if responses => json!({"type":"function","name":name,"description":description,"parameters":t["inputSchema"],"strict":false}),
            _ => json!({"type":"function","function":{"name":name,"description":description,"parameters":t["inputSchema"]}})
        }
    }).collect();
    request["tools"] = json!(tools);
    for key in ["format", "response_format", "output_config", "text"] {
        request.as_object_mut().unwrap().remove(key);
    }
    if responses {
        request["input"] = json!([{"role":"user","content":request["input"]}]);
        request["include"] = json!(["reasoning.encrypted_content"]);
        request["parallel_tool_calls"] = json!(true);
    }
    let history = schema["x-veyndo-history"]
        .as_array()
        .ok_or("Missing native tool history")?;
    for turn in history {
        if turn["provider"] != json!(provider) {
            return Err("Model provider changed during tool continuation".into());
        }
        let results = turn["results"].as_array().ok_or("Invalid native results")?;
        if responses {
            let input = request["input"].as_array_mut().unwrap();
            input.extend(
                turn["assistant"]
                    .as_array()
                    .ok_or("Invalid model continuation")?
                    .iter()
                    .cloned(),
            );
            for result in results {
                input.push(json!({"type":"function_call_output","call_id":result["id"],"output":result["result"].to_string()}));
            }
        } else {
            let messages = request["messages"]
                .as_array_mut()
                .ok_or("Missing tool messages")?;
            match provider {
                Provider::Anthropic => {
                    messages.push(json!({"role":"assistant","content":turn["assistant"]}));
                    messages.push(json!({"role":"user","content":results.iter().map(|r|json!({"type":"tool_result","tool_use_id":r["id"],"content":r["result"].to_string()})).collect::<Vec<_>>()}));
                }
                _ => {
                    messages.push(turn["assistant"].clone());
                    for r in results {
                        messages.push(if chat {json!({"role":"tool","tool_call_id":r["id"],"content":r["result"].to_string()})}else{json!({"role":"tool","tool_name":r["alias"],"content":r["result"].to_string()})});
                    }
                }
            }
        }
    }
    Ok(())
}
