//! Stable safe error details shared by HTTP, MCP and agent streams; legacy constructors retain their wire message.
use crate::*;
#[derive(Debug)]
pub(crate) struct Failure(pub(crate) StatusCode, pub(crate) String, Problem);
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Problem {
    kind: Kind,
    retryable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    scope: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pointer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    current_revision: Option<i64>,
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
enum Kind {
    ValidationError,
    AuthenticationRequired,
    PermissionDenied,
    NotFound,
    Conflict,
    QuotaExceeded,
    RateLimited,
    TemporarilyUnavailable,
    ProviderUnavailable,
    InternalError,
    RevisionConflict,
    OutputContractError,
}
pub(crate) type Error = Failure;
/// Compatibility factory for domain errors; structured details never parse human messages.
#[allow(non_snake_case)]
pub(crate) fn Error(status: StatusCode, detail: String) -> Failure {
    Failure::new(status, detail)
}
impl Failure {
    pub(crate) fn inference(error: veyndo::inference::InferenceError) -> Self {
        let status = match &error {
            veyndo::inference::InferenceError::Admission(e) => {
                StatusCode::from_u16(e.status()).unwrap()
            }
            _ => StatusCode::BAD_GATEWAY,
        };
        let mut failure = Self::new(status, error.to_string());
        if matches!(
            error,
            veyndo::inference::InferenceError::Admission(veyndo::inference::Admission::Exhausted)
        ) {
            failure.2.kind = Kind::QuotaExceeded;
            failure.2.retryable = false;
            failure.2.pointer = Some("/agentBudget".into());
        }
        failure
    }
    fn new(status: StatusCode, detail: String) -> Self {
        let kind = match status {
            StatusCode::BAD_REQUEST | StatusCode::UNPROCESSABLE_ENTITY => Kind::ValidationError,
            StatusCode::UNAUTHORIZED => Kind::AuthenticationRequired,
            StatusCode::FORBIDDEN => Kind::PermissionDenied,
            StatusCode::NOT_FOUND => Kind::NotFound,
            StatusCode::CONFLICT => Kind::Conflict,
            StatusCode::PAYLOAD_TOO_LARGE => Kind::QuotaExceeded,
            StatusCode::TOO_MANY_REQUESTS => Kind::RateLimited,
            StatusCode::SERVICE_UNAVAILABLE => Kind::TemporarilyUnavailable,
            StatusCode::BAD_GATEWAY | StatusCode::GATEWAY_TIMEOUT => Kind::ProviderUnavailable,
            _ => Kind::InternalError,
        };
        Self(
            status,
            detail,
            Problem {
                kind,
                retryable: matches!(status.as_u16(), 429 | 503),
                scope: None,
                pointer: None,
                current_revision: None,
            },
        )
    }
    pub(crate) fn permission(scope: &str) -> Self {
        let mut error = Self::new(
            StatusCode::FORBIDDEN,
            "Role does not permit this action".into(),
        );
        error.2.scope = Some(crate::auth::scope(scope).into());
        error
    }
    pub(crate) fn validation(pointer: &str, detail: String) -> Self {
        let mut error = Self::new(StatusCode::BAD_REQUEST, detail);
        error.2.pointer = Some(pointer.into());
        error
    }
    pub(crate) fn revision(current: i64, detail: &str) -> Self {
        let mut error = Self::new(StatusCode::CONFLICT, detail.into());
        error.2.kind = Kind::RevisionConflict;
        error.2.current_revision = Some(current);
        error
    }
    pub(crate) fn revision_at(current: i64, pointer: &str, detail: &str) -> Self {
        let mut error = Self::revision(current, detail);
        error.2.pointer = Some(pointer.into());
        error
    }
    pub(crate) fn output_contract() -> Self {
        let mut error=Self::new(StatusCode::BAD_GATEWAY,"App result does not match its declared output contract; inspect the original action before retrying".into());
        error.2.kind = Kind::OutputContractError;
        error.2.retryable = false;
        error
    }
    pub(crate) fn problem(&self) -> Value {
        let mut problem = json!(self.2);
        problem["code"] = json!(self.0.as_u16().to_string());
        problem["status"] = json!(self.0.as_u16());
        problem["detail"] = json!(self.1);
        problem
    }
    pub(crate) fn tool_result(&self) -> Value {
        json!({"content":[{"type":"text","text":self.1}],"isError":true,
            "structuredContent":{"errors":[self.problem()]}})
    }
}
impl IntoResponse for Failure {
    fn into_response(self) -> Response {
        let retryable = self.2.retryable;
        let mut response = (self.0, Json(json!({"errors":[self.problem()]}))).into_response();
        if retryable {
            response
                .headers_mut()
                .insert("retry-after", "5".parse().unwrap());
        }
        response
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exhausted_lifetime_allocation_is_not_a_retryable_rate_limit() {
        let error = Failure::inference(veyndo::inference::Admission::Exhausted.into());
        assert_eq!(error.problem()["kind"], "quota_exceeded");
        assert_eq!(error.problem()["retryable"], false);
        assert_eq!(error.problem()["pointer"], "/agentBudget");
        let response = error.into_response();
        assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
        assert!(!response.headers().contains_key("retry-after"));
    }
    #[test]
    fn structured_failures_keep_legacy_messages_and_explicit_safe_context() {
        let permission = Failure::permission("catalog").problem();
        assert_eq!(permission["scope"], "catalog.write");
        assert_eq!(permission["kind"], "permission_denied");
        assert_eq!(
            Failure::revision(7, "Changed").problem()["currentRevision"],
            7
        );
        let result = Failure::validation("/items/0", "Invalid item".into()).tool_result();
        assert_eq!(result["content"][0]["text"], "Invalid item");
        assert_eq!(
            result["structuredContent"]["errors"][0]["pointer"],
            "/items/0"
        );
        assert_eq!(
            Error(StatusCode::TOO_MANY_REQUESTS, "Busy".into()).problem()["retryable"],
            true
        );
        assert_eq!(
            Error(StatusCode::CONFLICT, "Changed".into()).problem()["retryable"],
            false
        );
    }
}
