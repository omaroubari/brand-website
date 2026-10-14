import { isAbsolute, relative, resolve } from "node:path";
import { isRunnableDevEnvironment, normalizePath, type Plugin } from "vite";

/** Re-resolve deferred content imports when an author file disappears/returns. */
export const devContentModules = (contentRoot: string): Plugin => ({
  name: "brandtree:dev-content-modules",
  apply: "serve",
  configureServer(server) {
    const modulesFile = normalizePath(
      resolve(server.config.root, ".astro/content-modules.mjs"),
    );
    const invalidate = (path: string) => {
      const local = normalizePath(relative(contentRoot, path));
      if (
        isAbsolute(local) ||
        local === ".." ||
        local.startsWith("../") ||
        !/\.(?:md|mdx)$/u.test(local)
      )
        return;
      // Astro retains deferred import entries after unlink. If its import map
      // was transformed while a target was absent, it contains an unresolved
      // bare ID. Re-adding the same file doesn't change that map's contents.
      for (const environment of Object.values(server.environments)) {
        for (const module of environment.moduleGraph.getModulesByFile(
          modulesFile,
        ) ?? []) {
          environment.moduleGraph.invalidateModule(module);
        }
        if (isRunnableDevEnvironment(environment)) {
          const graph = environment.runner.evaluatedModules;
          for (const module of graph.getModulesByFile(modulesFile) ?? [])
            graph.invalidateModule(module);
        }
      }
    };
    server.watcher.on("add", invalidate);
    server.watcher.on("unlink", invalidate);
    server.httpServer?.once("close", () => {
      server.watcher.off("add", invalidate);
      server.watcher.off("unlink", invalidate);
    });
  },
});
