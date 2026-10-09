import { stat } from "node:fs/promises";
import { join } from "node:path";
import { defineCommand } from "citty";

import { onShutdown } from "./shutdown.ts";
import { serverArgs, serverOptions } from "./server-options.ts";

export const previewCommand = defineCommand({
  args: serverArgs,
  meta: {
    name: "preview",
    description: "Serve the existing production build without regeneration.",
  },
  async run({ args }) {
    const network = serverOptions(args);
    const root = process.cwd();
    const outDir = join(root, "dist");
    if (!(await stat(outDir).catch(() => undefined))?.isDirectory()) {
      throw new Error(
        `No production build at ${outDir}. Run brandtree build first.`,
      );
    }
    const { preview } = await import("astro");
    const server = await preview({
      ...network,
      root,
      outDir,
      configFile: false,
      output: "static",
    });
    onShutdown(() => server.stop());
  },
});
