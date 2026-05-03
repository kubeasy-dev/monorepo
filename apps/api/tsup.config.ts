import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/instrumentation.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  splitting: true,
  clean: true,
  shims: true,
  // Bundle les packages internes workspace (leurs sources .ts)
  noExternal: ["@kubeasy/api-schemas", "@kubeasy/jobs"],
  // Injecte createRequire pour que les deps CJS (pino, etc.) puissent utiliser dynamic require() dans le bundle ESM
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});
