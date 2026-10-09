import { defineCommand } from "citty";
import type { dev as astroDev } from "astro";

import { logger } from "./log.ts";
import { onShutdown } from "./shutdown.ts";
import { serverArgs, serverOptions } from "./server-options.ts";
import { watchProject } from "./watch.ts";

export const devCommand = defineCommand({
  args: serverArgs,
  meta: {
    name: "dev",
    description:
      "Watch authored inputs and run the brand guidelines development server.",
  },
  async run({ args }) {
    const network = serverOptions(args);
    process.env.NODE_ENV ??= "development";
    const { prepareProject, readProject, writeProject } =
      await import("./prepare.ts");
    const { dev } = await import("astro");
    const options = { root: process.cwd(), mode: "dev" as const };
    const project = await prepareProject(options);
    let server: Awaited<ReturnType<typeof astroDev>> | undefined = await dev({
      ...network,
      root: project.context.outDir,
    });
    let closed = false;
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running: Promise<void> | undefined;

    const regenerate = async () => {
      while (pending && !closed) {
        pending = false;
        try {
          // Config loading/validation must succeed before changing the runtime
          // or stopping the last successful server (ADR 0017).
          const next = await readProject(options);
          if (closed) return;
          await server?.stop();
          server = undefined;
          if (closed) return;
          await writeProject(next);
          if (closed) return;
          server = await dev({ ...network, root: next.context.outDir });
          logger.info("Regenerated authored inputs.");
        } catch (error) {
          logger.error(
            `Regeneration failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    };
    const changed = () => {
      if (closed) return;
      pending = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        if (!running) {
          running = regenerate().finally(() => {
            running = undefined;
          });
        }
      }, 150);
    };
    let watcher: ReturnType<typeof watchProject>;
    try {
      watcher = watchProject(options.root, changed, (error) =>
        logger.error(error),
      );
    } catch (error) {
      await server.stop();
      throw error;
    }
    onShutdown(async () => {
      closed = true;
      clearTimeout(timer);
      watcher.close();
      // If shutdown arrives while Astro starts, stop that new instance as well.
      await running;
      await server?.stop();
      server = undefined;
    });
  },
});
