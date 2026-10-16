/** Export actual visual patterns for HTTP verification; no alternate production manifests. */
import { build } from "esbuild";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
const root = resolve(import.meta.dirname, "..");
const temp = await mkdtemp(join(root, "node_modules", ".recipe-check-"));
try {
  const result = await build({
    stdin: {
      contents: `export {appRecipe, recipeIds} from './src/admin/developer/app-recipes';
        export {compile, template} from './src/admin/developer/app-model';
        export {bindExtension} from './src/admin/developer/core-extension-model';`,
      resolveDir: root,
      sourcefile: "native-patterns-fixture.ts",
      loader: "ts",
    },
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    external: ["react"],
    jsx: "automatic",
  });
  const file = join(temp, "patterns.mjs");
  await writeFile(file, result.outputFiles[0].text);
  const { appRecipe, recipeIds, compile, template, bindExtension } =
    await import(pathToFileURL(file).href);
  console.log(
    JSON.stringify([
      ...recipeIds.map((id) => appRecipe(id, `${id}_fixture`)),
      ...["product", "customer", "order", "company"].map((object) => {
        const manifest = template();
        manifest.id = `native_${object}`;
        manifest.entities[0] = bindExtension(manifest.entities[0], object);
        return compile(manifest);
      }),
    ]),
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
