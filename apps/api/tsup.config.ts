import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/instrumentation.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  splitting: true,
  clean: true,
  // Bundle les packages internes workspace (leurs sources .ts)
  noExternal: ["@kubeasy/api-schemas", "@kubeasy/jobs", "@kubeasy/logger"],
});
