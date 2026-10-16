/** Native model actions and extension scopes compile once for manual and agent-generated views. */
import type { Manifest, Entity } from "../../shared/apps/native/types";
import { extensionScopes } from "./core-extension-model";
export function modelActions(m: Manifest, e: Entity) {
  const suffix = e.name.slice(0, 27),
    old = m.actions?.find((a) => a.name === `save_${suffix}`),
    read = m.actions?.find((a) => a.name === `list_${suffix}`);
  return [
    {
      name: `list_${suffix}`,
      description: `List ${e.name}`,
      handler: "list",
      entity: e.name,
      public: e.publicRead,
      readOnly: true,
      mcp: read?.mcp,
      permission: e.publicRead
        ? undefined
        : (read?.permission ??
          (e.extends
            ? extensionScopes(e.extends.object, false)[0]
            : undefined)),
      requiredPermissions: e.extends
        ? [
            ...new Set([
              ...(read?.requiredPermissions ?? []),
              ...extensionScopes(e.extends.object, false),
            ]),
          ]
        : read?.requiredPermissions,
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", minLength: 1, maxLength: 100 },
          limit: { type: "integer", minimum: 1, maximum: 100 },
          after: { type: "string", maxLength: 100 },
          filter: { type: "object" },
        },
        additionalProperties: false,
      },
    },
    {
      name: `save_${suffix}`,
      description: `Save ${e.name}`,
      handler: "save",
      entity: e.name,
      public: false,
      flowAllowed: old?.flowAllowed ?? true,
      permission:
        old?.permission ??
        (e.extends
          ? extensionScopes(e.extends.object, true).at(-1)
          : undefined),
      requiredPermissions: e.extends
        ? [
            ...new Set([
              ...(old?.requiredPermissions ?? []),
              ...extensionScopes(e.extends.object, true),
            ]),
          ]
        : old?.requiredPermissions,
      mcp: old?.mcp,
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          revision: { type: "integer" },
          fields: { type: "object" },
        },
        required: ["id", "fields"],
        additionalProperties: false,
      },
    },
  ];
}
