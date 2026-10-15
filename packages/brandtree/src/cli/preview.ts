import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { defineCommand } from "citty";

import { logger } from "./log.ts";
import {
  InvalidPortError,
  normalizeHost,
  parsePort,
  parseServerArgs,
} from "./server-options.ts";

const previewArgs = {
  host: { description: "Network host to bind.", type: "string" },
  port: { description: "Port to listen on.", type: "string" },
  open: { description: "Open the browser on start.", type: "boolean" },
} as const;

export const previewCommand = defineCommand({
  meta: {
    name: "preview",
    description: "Serve the existing production build without rebuilding.",
  },
  args: previewArgs,
  setup(context) {
    context.args = parseServerArgs(context.rawArgs, previewArgs);
  },
  async run({ args }) {
    const root = process.cwd();
    let port: number;
    try {
      port = parsePort(args.port);
    } catch (error) {
      if (!(error instanceof InvalidPortError)) throw error;
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
      return;
    }
    const runtime = resolve(root, ".brandtree");
    const outDir = resolve(root, "dist");
    const inspect = (path: string) =>
      stat(path).catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT" || error.code === "ENOTDIR") return null;
        throw error;
      });
    const generated = await inspect(resolve(runtime, "astro.config.mjs"));
    const output = await inspect(outDir);
    if (
      !generated?.isFile() ||
      !output?.isDirectory() ||
      (await readdir(outDir)).length === 0
    ) {
      process.stderr.write("No build found. Run `brandtree build` first.\n");
      process.exitCode = 1;
      return;
    }

    // Reuse the generated Astro config; preview never prepares or rebuilds it.
    const { preview } = await import("astro");
    const server = await preview({
      root: runtime,
      server: {
        host: normalizeHost(args.host),
        port,
        open: args.open ?? false,
      },
    });

    const stop = () => {
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
      void Promise.resolve()
        .then(() => server.stop())
        .catch((error: unknown) => {
          logger.error(error);
          process.exitCode = 1;
        });
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  },
});
