//! Shared wire description for native operations and installed app actions; hints never grant execution rights.
use crate::*;
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ToolContract<'a> {
    name: &'a str,
    description: &'a str,
    input_schema: &'a Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    output_schema: Option<&'a Value>,
    read_only: bool,
    annotations: Safety,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Safety {
    read_only_hint: bool,
    destructive_hint: bool,
    idempotent_hint: bool,
    open_world_hint: bool,
}
impl<'a> ToolContract<'a> {
    pub(crate) fn describe(
        name: &'a str,
        description: &'a str,
        input: &'a Value,
        output: Option<&'a Value>,
        read_only: bool,
    ) -> Value {
        json!(Self {
            name,
            description,
            input_schema: input,
            output_schema: output,
            read_only,
            annotations: Safety {
                read_only_hint: read_only,
                destructive_hint: !read_only,
                idempotent_hint: false,
                open_world_hint: true
            }
        })
    }
}
