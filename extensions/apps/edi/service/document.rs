//! Protocol-neutral requisitions preserve partner identity and SKUs; commerce prices remain native.
use serde::{Deserialize, Serialize};
#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Line {
    pub sku: String,
    pub quantity: u32,
}
#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Document {
    pub number: String,
    pub sender: String,
    pub receiver: String,
    pub currency: String,
    pub lines: Vec<Line>,
}
pub type Result<T> = std::result::Result<T, String>;
impl Document {
    pub fn validate(self) -> Result<Self> {
        for id in [&self.number, &self.sender, &self.receiver] {
            if id.trim().is_empty() || id.len() > 100 || id.chars().any(char::is_control) {
                return Err("Document number and sender/receiver IDs must contain 1..100 printable characters".into());
            }
        }
        if self.currency.len() != 3 || !self.currency.bytes().all(|c| c.is_ascii_uppercase()) {
            return Err("ISO currency required".into());
        }
        if self.lines.is_empty() || self.lines.len() > 100 {
            return Err("Document must contain 1..100 lines".into());
        }
        let mut seen = std::collections::HashSet::new();
        for l in &self.lines {
            if l.sku.is_empty()
                || l.sku.len() > 100
                || l.sku.chars().any(char::is_control)
                || l.quantity == 0
                || l.quantity > 10000
                || !seen.insert(&l.sku)
            {
                return Err(
                    "Duplicate/invalid SKU or unsupported quantity; use unique whole-unit lines"
                        .into(),
                );
            }
        }
        Ok(self)
    }
}
pub fn quantity(s: &str) -> Result<u32> {
    let (whole, fraction) = s.split_once('.').unwrap_or((s, ""));
    if whole.is_empty()
        || !whole.bytes().all(|c| c.is_ascii_digit())
        || !fraction.bytes().all(|c| c == b'0')
    {
        return Err("Only positive whole-unit quantities are supported".into());
    }
    whole.parse().map_err(|_| "Quantity out of range".into())
}
pub fn parse(format: &str, s: &str) -> Result<Document> {
    if s.len() > 32000 {
        return Err("EDI document exceeds 32 KB; split the document".into());
    }
    match format {
        "edifact" => super::edifact::parse(s),
        "ubl" | "cxml" => super::xml::parse(format, s),
        _ => Err("Unsupported format: use edifact, ubl or cxml".into()),
    }
}
