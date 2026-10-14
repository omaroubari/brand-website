import { defineCommand } from "citty";

import { logger } from "./log.ts";
import { acquireDevLock } from "./dev-lock.ts";
import { resolveRuntimeDir } from "../core/project.ts";

export const devCommand = defineCommand({
  args: {
    port: { description: "Port to listen on.", type: "string" },
  },
  meta: {
    name: "dev",
    description: "Run the brand guidelines development server.",
  },
  async run({ args }) {
    const root = process.cwd();
    const port = args.port === undefined ? 4321 : Number(args.port);
    if (
      args.port !== undefined &&
      (!/^\d+$/u.test(args.port) || !Number.isInteger(port) || port > 65535)
    ) {
      throw new Error("--port must be an integer between 0 and 65535.");
    }
    process.env.NODE_ENV ??= "development";
    const { prepareProject } = await import("./prepare.ts");
    const { dev } = await import("astro");
    const { release, updatePort } = acquireDevLock(
      resolveRuntimeDir(root),
      port,
    );
    // Preparation can terminate the CLI through process.exit.
    process.once("exit", release);
    const project = await prepareProject({
      root,
      mode: "dev",
    });
    const devServer = await dev({
      root: project.context.outDir,
      server: { port },
    });
    updatePort(devServer.address.port);

    const stop = () => {
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
      void devServer
        .stop()
        .then(() => {
          release();
          process.removeListener("exit", release);
        })
        .catch((error: unknown) => {
          logger.error(error);
          process.exitCode = 1;
        });
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  },
});
