/** Visual extension bindings compile into the canonical model and current native action scopes. */
import type { Entity } from "../../shared/apps/native/types";
export type CoreObject = NonNullable<Entity["extends"]>["object"];
export function extensionScopes(object: CoreObject, write: boolean): string[] {
  const rights = {
    product: ["catalog.read", "catalog.write"],
    customer: ["customers.read", "customers.pii", "customers.write"],
    order: ["orders.read", "customers.pii", "orders.write"],
    company: ["b2b.read", "b2b.manage"],
  }[object];
  return write ? rights : rights.slice(0, -1);
}
export function bindExtension(entity: Entity, object?: CoreObject): Entity {
  if (!object) {
    const next = { ...entity };
    delete next.extends;
    return next;
  }
  let field = entity.extends?.field ?? "native_id";
  let suffix = 2;
  while (!entity.extends && entity.fields.some((f) => f.name === field))
    field = `native_id_${suffix++}`;
  const reference = object === "company" ? "b2bCompany" : object;
  return {
    ...entity,
    publicRead: false,
    extends: { version: 1, object, field },
    fields: [
      ...entity.fields.filter((f) => f.name !== field),
      {
        name: field,
        label: {},
        kind: "string",
        required: true,
        indexed: true,
        unique: true,
        coreReference: reference,
      },
    ],
  };
}
