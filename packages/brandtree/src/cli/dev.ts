import { defineCommand } from "citty";

import { logger } from "./log.ts";

export const devCommand = defineCommand({
  meta: {
    name: "dev",
    description: "Run the brand guidelines development server.",
  },
  async run() {
    process.env.NODE_ENV ??= "development";
    const { prepareProject } = await import("./prepare.ts");
    const { dev } = await import("astro");
    const project = await prepareProject({
      root: process.cwd(),
      mode: "dev",
    });
    const devServer = await dev({ root: project.context.outDir });

    const stop = () => {
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
      void devServer.stop().catch((error: unknown) => {
        logger.error(error);
        process.exitCode = 1;
      });
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  },
});
