import { defineCommand } from "citty";

import { buildCommand } from "./build.ts";
import { devCommand } from "./dev.ts";
import { checkCommand } from "./check.ts";
import { previewCommand } from "./preview.ts";
import { readPackageVersion } from "./version.ts";

export const mainCommand = defineCommand({
  meta: async () => ({
    name: "brandtree",
    version: await readPackageVersion(),
    description: "Build and publish living brand guidelines.",
  }),
  subCommands: {
    build: buildCommand,
    dev: devCommand,
    check: checkCommand,
    preview: previewCommand,
  },
});
