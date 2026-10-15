import { defineCommand } from "citty";

import { readPackageVersion } from "./version.ts";

export const mainCommand = defineCommand({
  meta: async () => ({
    name: "brandtree",
    version: await readPackageVersion(),
    description: "Build and publish living brand guidelines.",
  }),
  subCommands: {
    build: async () => (await import("./build.ts")).buildCommand,
    check: async () => (await import("./check.ts")).checkCommand,
    dev: async () => (await import("./dev.ts")).devCommand,
    preview: async () => (await import("./preview.ts")).previewCommand,
  },
});
