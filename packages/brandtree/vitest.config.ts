import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globalSetup: [
      fileURLToPath(new URL("./test/global-setup.ts", import.meta.url)),
    ],
    exclude: [...configDefaults.exclude, "tmp/**"],
  },
});
