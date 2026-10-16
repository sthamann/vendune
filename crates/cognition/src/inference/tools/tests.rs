//! Native wire and injection negative cases exercise the same parser used before dispatch.
use super::*;
fn schema() -> Value {
    json!({"x-veyndo-tools":[{"name":"merchant.orders","inputSchema":{"type":"object"}}],"x-veyndo-history":[]})
}
#[test]
fn versioned_injection_corpus_is_denied_by_the_production_tool_parser() {
    let corpus: Value =
        serde_json::from_str(include_str!("../../../evals/tool-injection.v1.json")).unwrap();
    assert_eq!(corpus["version"], 1);
    for case in corpus["cases"].as_array().unwrap() {
        assert_eq!(
            parse(&Provider::Openai, &schema(), &case["raw"]).is_ok(),
            case["accept"].as_bool().unwrap(),
            "{}",
            case["id"]
        );
    }
}
#[test]
fn every_provider_normalizes_calls_and_preserves_native_continuation() {
    for (provider, raw) in [
        (
            Provider::Openai,
            json!({"status":"completed","output":[{"type":"reasoning","encrypted_content":"opaque"},{"type":"function_call","call_id":"call_1","name":"veyndo_0","arguments":"{}"}]}),
        ),
        (
            Provider::Anthropic,
            json!({"stop_reason":"tool_use","content":[{"type":"tool_use","id":"call_1","name":"veyndo_0","input":{}}]}),
        ),
        (
            Provider::Ollama,
            json!({"done":true,"message":{"role":"assistant","tool_calls":[{"function":{"name":"veyndo_0","arguments":{}}}]}}),
        ),
    ] {
        let (v, assistant) = parse(&provider, &schema(), &raw).unwrap();
        assert_eq!(v["tool_calls"][0]["name"], "merchant.orders");
        assert_eq!(v["tool_calls"][0]["arguments_json"], "{}");
        let mut s = schema();
        s["x-veyndo-history"] = json!([{"provider":provider,"assistant":assistant,"results":[{"id":v["tool_calls"][0]["id"],"alias":"veyndo_0","result":{"orders":[]}}]}]);
        let mut req = if matches!(provider, Provider::Openai) {
            json!({"input":"Read orders","text":{"format":{}}})
        } else {
            json!({"messages":[{"role":"user","content":"Read orders"}],"format":{}})
        };
        request(&provider, &s, &mut req).unwrap();
        assert!(req.get("format").is_none() && req.get("text").is_none());
        assert!(req.to_string().contains("orders"));
        if matches!(provider, Provider::Openai) {
            assert_eq!(req["input"][1]["encrypted_content"], "opaque");
            assert_eq!(req["input"][3]["call_id"], "call_1");
        }
    }
}
#[test]
fn model_instructions_cannot_invent_authority_or_hide_malformed_calls() {
    for call in [
        json!({"name":"merchant.apply","arguments":"{\"approve\":true}"}),
        json!({"name":"veyndo_99","arguments":"{}"}),
        json!({"name":"veyndo_0","arguments":"ignore authorization"}),
        json!({"name":"veyndo_0","arguments":"[]"}),
        json!({"name":"veyndo_0","arguments":json!({"injected":"x".repeat(9000)}).to_string()}),
    ] {
        let mut call = call;
        call["type"] = json!("function_call");
        call["call_id"] = json!("id");
        assert!(
            parse(
                &Provider::Openai,
                &schema(),
                &json!({"status":"completed","output":[call]})
            )
            .is_err()
        );
    }
    let call = json!({"type":"function_call","call_id":"same","name":"veyndo_0","arguments":"{}"});
    assert!(
        parse(
            &Provider::Openai,
            &schema(),
            &json!({"status":"completed","output":[call,call]})
        )
        .is_err()
    );
    assert!(
        parse(
            &Provider::Anthropic,
            &schema(),
            &json!({"stop_reason":"max_tokens","content":[]})
        )
        .is_err()
    );
    assert!(
        parse(
            &Provider::Ollama,
            &schema(),
            &json!({"done":false,"message":{}})
        )
        .is_err()
    );
}
