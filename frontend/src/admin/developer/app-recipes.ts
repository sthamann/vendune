/** Working domain patterns compile into the existing visual/coding Manifest and gateway. */
import type { Manifest } from "../../shared/apps/native/types";
import { assistedManifest } from "./assistant-model";
import { compile } from "./app-model";
import { modelWorkspace } from "./model-workspace";
import { buildingText } from "../../shared/i18n/app-building-i18n";
export const recipeIds = ["advisor", "returns", "erp"] as const;
export type RecipeId = (typeof recipeIds)[number];
export function appRecipe(kind: RecipeId, id: string): Manifest {
  let m = assistedManifest({
    kind:
      kind === "erp"
        ? "integration"
        : kind === "advisor"
          ? "combined"
          : "admin",
    id,
    name: buildingText(kind),
    location:
      kind === "advisor"
        ? "product.detail"
        : kind === "returns"
          ? "admin.order"
          : "admin.navigation",
    mcp: false,
    publicRead: kind === "advisor",
    event: "order.placed",
    cron: "0 */15 * * * *",
  });
  const e = m.entities[0];
  e.fields = e.fields.filter((f) => f.name !== "segment");
  e.fields.find((f) => f.name === "body")!.label = buildingText("contact");
  if (kind === "returns") {
    e.fields.push(
      {
        name: "status",
        label: buildingText("status"),
        kind: "string",
        required: true,
        indexed: true,
        choices: ["new", "review", "closed"].map((k) => ({
          value: k,
          label: buildingText(k as "new" | "review" | "closed"),
        })),
      },
      {
        name: "notes",
        label: buildingText("notes"),
        kind: "string",
        translatable: false,
      },
    );
  }
  m.presentation = {
    icon: kind === "advisor" ? "spark" : kind === "returns" ? "box" : "link",
    description: buildingText(`${kind}Hint`),
  };
  // Reuse the existing Visual Basic-style master/detail/save wizard, including its bounded AST.
  m = modelWorkspace(m, e.name);
  const workspace = m.views![m.views!.length - 1];
  const initial = m.views!.find((v) => v.id === "workspace")!;
  initial.layout = workspace.layout;
  initial.blocks = workspace.blocks;
  if (kind !== "erp") {
    const ref = kind === "returns" ? "order" : "product";
    initial.blocks = initial.blocks.map((b) =>
      b.entity
        ? {
            ...b,
            contextBinding: {
              field: `${ref}_id`,
              key: kind === "returns" ? "orderId" : "productId",
            },
          }
        : b,
    );
  }
  m.views = m.views!.filter((v) => v.id !== workspace.id);
  m.surfaces = m.surfaces!.filter((s) => s.uiPath !== `native/${workspace.id}`);
  return compile(m);
}
