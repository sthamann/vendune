/** All executable frontend modules are measured, including files untouched by tests. */
import { coverageConfigDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ["react", "react-dom"] },
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: { url: "http://localhost/?shop=unit-shop#merchant" },
    },
    setupFiles: ["tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      allowExternal: true,
      exclude: [
        ...coverageConfigDefaults.exclude,
        "**/extensions/apps/**/tests/**",
      ],
      include: [
        "src/**/*.{ts,tsx}",
        fileURLToPath(
          new URL("../extensions/apps/", import.meta.url),
        ).replaceAll("\\", "/") + "**/*.{ts,tsx}",
      ],
      reporter: ["text-summary", "json", "json-summary", "html", "lcov"],
      reportsDirectory: "coverage",
      reportOnFailure: true,
    },
  },
});
