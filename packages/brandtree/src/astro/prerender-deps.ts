import { isBuiltin } from "node:module";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { createIdResolver, type Plugin, type ResolvedConfig } from "vite";

/** Preserve installed dependency locations in Astro's temporary prerender bundle. */
export const prerenderDeps = (): Plugin => {
  let config: ResolvedConfig;
  const resolvers = new Map<boolean, ReturnType<typeof createIdResolver>>();

  return {
    name: "brandtree:prerender-deps",
    apply: "build",
    enforce: "pre",
    applyToEnvironment: (environment) => environment.name === "prerender",
    configResolved(resolved) {
      config = resolved;
    },
    async resolveId(source, importer, options) {
      if (
        isBuiltin(source) ||
        source.startsWith(".") ||
        isAbsolute(source) ||
        source.includes("\0") ||
        source.includes(":") ||
        source.includes("?")
      )
        return null;

      // Preserve Vite's aliases and external/noExternal decisions first.
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      });
      if (!resolved?.external) return resolved;
      if (isBuiltin(resolved.id) || resolved.id.startsWith("file:"))
        return resolved;

      // External IDs are often still bare specifiers. Resolve them from the
      // original importer before the bundler merges modules into shared chunks.
      const isRequire = options.kind === "require-call";
      let resolveEntry = resolvers.get(isRequire);
      if (!resolveEntry) {
        resolveEntry = createIdResolver(config, {
          external: [],
          noExternal: true,
          isRequire,
          conditions: this.environment.config.resolve.externalConditions,
        });
        resolvers.set(isRequire, resolveEntry);
      }
      const entry = await resolveEntry(this.environment, resolved.id, importer);
      if (!entry || !isAbsolute(entry)) {
        this.error(
          `Cannot resolve prerender dependency ${JSON.stringify(source)} from ${JSON.stringify(importer ?? config.root)}.`,
        );
      }
      return {
        ...resolved,
        id: isRequire ? entry : pathToFileURL(entry).href,
        external: "absolute",
      };
    },
  };
};
