//! Native provider read-tool transport; normalization grants no execution authority.
use super::*;
mod request;
mod response;
#[cfg(test)]
mod tests;
pub(super) use request::request;
pub(super) use response::parse;

fn definitions(schema: &Value) -> Result<&Vec<Value>, String> {
    schema["x-veyndo-tools"]
        .as_array()
        .filter(|t| t.len() <= 96)
        .ok_or_else(|| "Invalid native tool catalogue".into())
}
fn alias(index: usize) -> String {
    format!("veyndo_{index}")
}
fn operation<'a>(schema: &'a Value, name: &str) -> Result<&'a Value, String> {
    definitions(schema)?
        .iter()
        .enumerate()
        .find(|(i, _)| alias(*i) == name)
        .map(|(_, v)| v)
        .ok_or_else(|| "Model called an undeclared tool".into())
}
