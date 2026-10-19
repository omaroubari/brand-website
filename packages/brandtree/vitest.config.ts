import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Route cases spawn full Astro builds; keep their internal concurrency
    // modest while Vitest continues to run separate test files in parallel.
    maxConcurrency: 2,
    globalSetup: [
      fileURLToPath(new URL("./test/global-setup.ts", import.meta.url)),
    ],
    exclude: [...configDefaults.exclude, "tmp/**"],
  },
});
