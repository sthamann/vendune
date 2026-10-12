/** Load app-owned patterns; Studio only clones and compiles the canonical plugin Manifest. */
import type { Manifest } from "../../shared/apps/native/types";
import { compile } from "./app-model";
import advisor from "../../../../extensions/apps/product-advisor/manifest.json";
import returns from "../../../../extensions/apps/returns-workspace/manifest.json";
import erp from "../../../../extensions/apps/erp-handoff/manifest.json";
import edi from "../../../../extensions/apps/edi/manifest.json";
export const recipeIds = ["advisor", "returns", "erp", "edi"] as const;
export type RecipeId = (typeof recipeIds)[number];
const packages = { advisor, returns, erp, edi };
export function appRecipe(kind: RecipeId, id: string): Manifest {
  const manifest = structuredClone(packages[kind]) as Manifest;
  manifest.id = id;
  return compile(manifest);
}
