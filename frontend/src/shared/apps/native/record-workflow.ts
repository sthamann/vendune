/** Pure form projections of an app-owned workflow; the server remains authoritative. */
import type { AppRecord, Entity, Field } from "./types";
export function recordFields(
  entity: Entity,
  record?: AppRecord,
  bound?: Record<string, string>,
) {
  return {
    ...(entity.workflow
      ? { [entity.workflow.field]: entity.workflow.initial }
      : {}),
    ...Object.fromEntries(
      entity.fields
        .filter((f) => record?.[f.name] != null)
        .map((f) => [f.name, record![f.name]]),
    ),
    ...bound,
  };
}
export function workflowField(
  entity: Entity,
  field: Field,
  record?: AppRecord,
): Field {
  const w = entity.workflow;
  if (!w || w.field !== field.name) return field;
  const from = record?.[w.field];
  const allowed =
    from == null
      ? [w.initial]
      : [
          from,
          ...w.transitions.filter((t) => t.from === from).map((t) => t.to),
        ];
  return {
    ...field,
    choices: field.choices?.filter((c) => allowed.includes(c.value)),
  };
}
