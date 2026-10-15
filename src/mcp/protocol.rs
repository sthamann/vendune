//! JSON-RPC envelope errors differ from actionable domain/tool failures; no transport invents authorization.
use super::*;
pub(super) struct RpcError {
    code: i32,
    error: Error,
}
impl RpcError {
    pub(super) fn invalid(message: &str) -> Self {
        Self {
            code: -32602,
            error: bad(message),
        }
    }
    pub(super) fn method() -> Self {
        Self {
            code: -32601,
            error: bad("Method not supported"),
        }
    }
    pub(super) fn server(error: Error) -> Self {
        Self {
            code: -32603,
            error,
        }
    }
    pub(super) fn response(self, id: Value) -> Value {
        json!({"jsonrpc":"2.0","id":id,"error":{"code":self.code,"message":self.error.1,"data":self.error.problem()}})
    }
}
pub(super) fn envelope(value: &Value) -> std::result::Result<(Value, &str), RpcError> {
    let method = value["method"].as_str();
    let id = &value["id"];
    if !value.is_object()
        || value["jsonrpc"] != "2.0"
        || method.is_none_or(str::is_empty)
        || !(id.is_null() || id.is_string() || id.is_number())
        || value
            .get("params")
            .is_some_and(|params| !params.is_object())
    {
        return Err(RpcError {
            code: -32600,
            error: bad("Invalid JSON-RPC 2.0 request"),
        });
    }
    Ok((id.clone(), method.unwrap()))
}
pub(super) async fn call(
    a: &App,
    h: &RequestContext,
    params: &Value,
) -> std::result::Result<Value, RpcError> {
    let name = params["name"]
        .as_str()
        .filter(|name| !name.is_empty())
        .ok_or_else(|| RpcError::invalid("Tool name required"))?;
    let empty = json!({});
    let input = params.get("arguments").unwrap_or(&empty);
    if !input.is_object() {
        return Err(RpcError::invalid("Tool arguments must be an object"));
    }
    let native = capabilities::OPERATIONS
        .iter()
        .any(|operation| operation.name == name);
    if !native
        && (!name.starts_with("app.")
            || !apps::app_tools(a, h)
                .await
                .map_err(RpcError::server)?
                .iter()
                .any(|tool| tool["name"] == name))
    {
        return Err(RpcError::invalid("Unknown or unavailable tool"));
    }
    let result = super::transport::invoke_transport(a, h, name, input).await;
    Ok(match result {
        Ok(value) => {
            json!({"content":[{"type":"text","text":value.to_string()}],"structuredContent":value,"isError":false})
        }
        Err(error) => error.tool_result(),
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn request_errors_are_distinct_and_null_id_is_a_request() {
        for request in [
            json!([]),
            json!({"jsonrpc":"2.0","id":{},"method":"ping"}),
            json!({"jsonrpc":"2.0","method":true}),
            json!({"jsonrpc":"2.0","method":"ping","params":[]}),
        ] {
            assert_eq!(
                envelope(&request).err().unwrap().response(Value::Null)["error"]["code"],
                -32600
            );
        }
        assert!(envelope(&json!({"jsonrpc":"2.0","method":"ping","id":null})).is_ok());
        assert_eq!(
            RpcError::method().response(json!(1))["error"]["code"],
            -32601
        );
        assert_eq!(
            RpcError::invalid("Unknown").response(json!(1))["error"]["code"],
            -32602
        );
        assert_eq!(
            RpcError::server(bad("Failed")).response(json!(1))["error"]["code"],
            -32603
        );
    }
}
