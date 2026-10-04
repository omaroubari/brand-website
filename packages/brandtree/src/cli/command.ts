import { defineCommand } from "citty";

import { buildCommand } from "./build.ts";
import { readPackageVersion } from "./version.ts";

export const mainCommand = defineCommand({
  meta: async () => ({
    name: "brandtree",
    version: await readPackageVersion(),
    description: "Build and publish living brand guidelines.",
  }),
  subCommands: { build: buildCommand },
});
