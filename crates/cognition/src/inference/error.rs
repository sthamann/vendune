//! Typed admission failures survive provider adapters; HTTP status never depends on parsing message text.
#[derive(Clone, Debug)]
pub enum Admission {
    Exhausted,
    Denied(&'static str),
    Unavailable(&'static str),
    Invalid(String),
}
impl Admission {
    pub fn status(&self) -> u16 {
        match self {
            Self::Exhausted => 429,
            Self::Denied(_) => 403,
            Self::Unavailable(_) => 503,
            Self::Invalid(_) => 400,
        }
    }
    pub fn detail(&self) -> &str {
        match self {
            Self::Exhausted => {
                "Agent allocation budget exhausted; review its usage before issuing new authority"
            }
            Self::Denied(s) | Self::Unavailable(s) => s,
            Self::Invalid(s) => s,
        }
    }
}
impl From<&'static str> for Admission {
    fn from(s: &'static str) -> Self {
        Self::Unavailable(s)
    }
}
impl From<String> for Admission {
    fn from(s: String) -> Self {
        Self::Invalid(s)
    }
}
#[derive(Clone, Debug)]
pub enum InferenceError {
    Provider(String),
    Admission(Admission),
}
impl From<Admission> for InferenceError {
    fn from(e: Admission) -> Self {
        Self::Admission(e)
    }
}
impl From<String> for InferenceError {
    fn from(s: String) -> Self {
        Self::Provider(s)
    }
}
impl From<&str> for InferenceError {
    fn from(s: &str) -> Self {
        Self::Provider(s.into())
    }
}
impl From<InferenceError> for String {
    fn from(e: InferenceError) -> Self {
        e.to_string()
    }
}
impl std::fmt::Display for InferenceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Provider(s) => f.write_str(s),
            Self::Admission(e) => f.write_str(e.detail()),
        }
    }
}
impl std::error::Error for InferenceError {}
