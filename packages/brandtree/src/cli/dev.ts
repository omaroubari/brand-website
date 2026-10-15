import { defineCommand } from "citty";
import { logger, reportDiagnostics } from "./log.ts";
import { createRegenerationQueue, type WatchEvent } from "./regenerate.ts";

import { isAbsolute, relative, resolve, sep } from "node:path";
import { generateRuntime } from "../astro/generate.ts";
import { prepareProject } from "./prepare.ts";
import { scanProject } from "../core/project-tree.ts";
import { BrandtreeError } from "../core/diagnostics.ts";
import { watch } from "chokidar";
import { CONFIG_FILENAMES, resolveRuntimeDir } from "../core/project.ts";
import { acquireDevLock } from "./dev-lock.ts";
import type { ProjectContext } from "../core/types.ts";
import {
  InvalidPortError,
  normalizeHost,
  parsePort,
  parseServerArgs,
} from "./server-options.ts";

/** Derive local watch targets without storing a second copy on the context. */
const referencedFiles = (context: ProjectContext): Set<string> =>
  new Set(
    context.assetReferences.flatMap(({ file }) =>
      file === null ? [] : [file],
    ),
  );

export { normalizeHost } from "./server-options.ts";

const devArgs = {
  debug: {
    description: "Verbose Astro/Vite logging for troubleshooting.",
    type: "boolean",
  },
  host: { description: "Network host to bind.", type: "string" },
  open: { description: "Open the browser on start.", type: "boolean" },
  port: { description: "Port to listen on.", type: "string" },
  preview: {
    description: "Include draft content.",
    type: "boolean",
  },
  strict: {
    description: "Abort startup on error diagnostics",
    type: "boolean",
  },
} as const;

export const devCommand = defineCommand({
  args: devArgs,
  setup(context) {
    context.args = parseServerArgs(context.rawArgs, devArgs);
  },
  meta: {
    name: "dev",
    description: "Run the Brandtree development server.",
  },
  async run({ args }) {
    const root = process.cwd();
    const preview = args.preview ?? false;

    let port: number;
    try {
      port = parsePort(args.port);
    } catch (error) {
      if (!(error instanceof InvalidPortError)) throw error;
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
      return;
    }
    let devServerUrl = `http://localhost:${port}`;

    process.env.NODE_ENV ??= "development";

    const { dev } = await import("astro");

    const { release, updatePort } = acquireDevLock(
      resolveRuntimeDir(root),
      port,
    );

    // A synchronous exit hook also covers preparation's process.exit paths.
    process.once("exit", release);

    const project = await prepareProject({
      devServerUrl,
      mode: "dev",
      root,
      preview,
      strict: args.strict,
    });

    const devServer = await dev({
      root: project.context.outDir,
      logLevel: args.debug ? "debug" : "info",
      server: {
        host: normalizeHost(args.host),
        open: args.open ?? false,
        port,
      },
    });

    updatePort(devServer.address.port);
    devServerUrl = `http://localhost:${devServer.address.port}`;

    let assetFiles = referencedFiles(project.context);

    const regenerate = async (events: WatchEvent[]) => {
      const reason = events
        .map(
          ({ event, path }) =>
            `${event} ${relative(root, resolve(path)) || "."}`,
        )
        .join(", ");

      const started = performance.now();
      logger.info(`Scanning project (${reason})`);

      try {
        const next = await scanProject(root, {
          devServerUrl,
          mode: "dev",
          preview: preview ?? false,
        });

        const result = await generateRuntime(next);

        const nextAssets = referencedFiles(next.context);
        const addedAssets = [...nextAssets].filter(
          (file) => !assetFiles.has(file),
        );
        const removedAssets = [...assetFiles].filter(
          (file) => !nextAssets.has(file),
        );
        // Publish the new dependencies only after successful regeneration.
        assetFiles = nextAssets;
        if (addedAssets.length) watcher.add(addedAssets);
        // Keep conventional input paths watched if an asset points into them.
        const unwatchAssets = removedAssets.filter(
          (file) =>
            !fileTargets.includes(file) &&
            !dirTargets.some((directory) => {
              const local = relative(directory, file);
              return (
                !isAbsolute(local) &&
                local !== ".." &&
                !local.startsWith(`..${sep}`)
              );
            }),
        );
        if (unwatchAssets.length) watcher.unwatch(unwatchAssets);

        for (const warning of result.warnings) logger.warn(warning);

        logger.info(
          `Runtime regenerated in ${Math.round(performance.now() - started)} ms${result.structuralChange ? " (structural changes)" : ""}`,
        );

        reportDiagnostics(next.diagnostics, root);
        return next;
      } catch (error) {
        if (error instanceof BrandtreeError)
          reportDiagnostics([error.diagnostic], root);
        // SAFETY: regeneration failures come from the generator
        // which raises Error instances; only the message is shown.
        logger.error(
          `Regeneration failed after ${Math.round(performance.now() - started)} ms: ${(error as Error).message}`,
        );
      }
    };

    const regeneration = createRegenerationQueue(regenerate, (error) =>
      logger.error(error),
    );

    // Astro/Vite watches author components through its module graph.
    const dirTargets = [project.context.contentRoot];

    const fileTargets = [
      project.context.configFile,
      project.context.themeFile,
      ...CONFIG_FILENAMES.map((file) => resolve(project.context.root, file)),
    ].filter((target) => target !== null);

    const watcher = watch([...fileTargets, ...dirTargets, ...assetFiles], {
      ignoreInitial: true,
      ignored: [
        // Ignore generated runtime
        { path: project.context.outDir, recursive: true },
        // Ignore production output
        ...(project.context.distDir
          ? [{ path: project.context.distDir, recursive: true }]
          : []),
        ...[".astro", ".git", "coverage", "dist", "node_modules"].map(
          (directory) => ({
            path: resolve(project.context.root, directory),
            recursive: true,
          }),
        ),
      ],
    });

    watcher.on("all", regeneration.change);
    watcher.on("error", (error) => logger.error(error));

    const stop = () => {
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
      void Promise.resolve()
        .then(() => watcher.close())
        .finally(() => regeneration.close())
        .finally(() => devServer?.stop())
        .then(() => {
          // Keep dev lock until regeneration and Astro have both stopped.
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
