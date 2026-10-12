//! Minimal behavioral envelope: no URLs, search text, raw user agents, IPs or caller customer identities.
use crate::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Event {
    pub event_id: String,
    pub kind: String,
    pub product_id: Option<String>,
    pub surface: String,
    pub viewport: String,
    pub referrer_host: Option<String>,
}
impl Event {
    pub fn validate(&self) -> Result<()> {
        if self.event_id.len() != 32
            || !self.event_id.bytes().all(|b| b.is_ascii_hexdigit())
            || ![
                "page_view",
                "product_view",
                "cart_add",
                "checkout_start",
                "search",
                "product_question",
            ]
            .contains(&self.kind.as_str())
            || ![
                "collection",
                "product",
                "checkout",
                "account",
                "content",
                "experience",
            ]
            .contains(&self.surface.as_str())
            || !["mobile", "tablet", "desktop"].contains(&self.viewport.as_str())
            || self
                .product_id
                .as_ref()
                .is_some_and(|v| v.is_empty() || v.len() > 100)
            || ["product_view", "cart_add", "product_question"].contains(&self.kind.as_str())
                && self.product_id.is_none()
            || self.referrer_host.as_ref().is_some_and(|v| {
                v.len() > 253
                    || v.is_empty()
                    || v.bytes()
                        .any(|b| !(b.is_ascii_alphanumeric() || b == b'.' || b == b'-'))
            })
        {
            return Err(bad(
                "Invalid behavioral event; use the documented minimal envelope",
            ));
        }
        Ok(())
    }
}
pub(super) fn browser(ua: &str) -> &'static str {
    if ua.contains("Edg/") {
        "Edge"
    } else if ua.contains("OPR/") {
        "Opera"
    } else if ua.contains("Firefox/") {
        "Firefox"
    } else if ua.contains("Chrome/") || ua.contains("CriOS/") {
        "Chrome"
    } else if ua.contains("Safari/") {
        "Safari"
    } else {
        "Other"
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn bounded_input_rejects_identity_and_forged_purchases() {
        let v = json!({"eventId":"a".repeat(32),"kind":"product_view","productId":"tee","surface":"product","viewport":"mobile","referrerHost":"example.test"});
        assert!(
            serde_json::from_value::<Event>(v.clone())
                .unwrap()
                .validate()
                .is_ok()
        );
        for (key, value) in [
            ("kind", json!("purchase")),
            ("referrerHost", json!("user@example.test/path")),
            ("eventId", json!("not-a-uuid")),
            ("productId", Value::Null),
        ] {
            let mut bad_value = v.clone();
            bad_value[key] = value;
            assert!(
                serde_json::from_value::<Event>(bad_value)
                    .unwrap()
                    .validate()
                    .is_err()
            );
        }
        let mut identity = v;
        identity["customerId"] = json!("foreign");
        assert!(serde_json::from_value::<Event>(identity).is_err());
    }
    #[test]
    fn browser_order_and_unknown_are_coarse() {
        assert_eq!(browser("Chrome/150 Safari/1 Edg/150"), "Edge");
        assert_eq!(browser("Chrome/150 OPR/1"), "Opera");
        assert_eq!(browser("Safari/1"), "Safari");
        assert_eq!(browser(""), "Other");
    }
}
