//! Credential-free local coding-agent connection shared by native editors.
use crate::*;
pub(crate) fn configuration(tenant: &str) -> Result<Value> {
    let origin =
        env::var("COMMERCE_PUBLIC_ORIGIN").unwrap_or_else(|_| "http://127.0.0.1:8787".into());
    let url = reqwest::Url::parse(&origin).map_err(|_| bad("Invalid public commerce origin"))?;
    let local = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
    if (url.scheme() != "https" && !(url.scheme() == "http" && local))
        || !url.username().is_empty()
        || url.password().is_some()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(bad("Invalid public commerce origin"));
    }
    Ok(
        json!({"mcpServers":{"rust-commerce-dev":{"command":"python3","args":["scripts/mcp_stdio.py"],"env":{"COMMERCE_URL":url.origin().ascii_serialization(),"COMMERCE_TENANT":tenant,"COMMERCE_SESSION_TOKEN":"<personal session token; store locally only>"}}}}),
    )
}
