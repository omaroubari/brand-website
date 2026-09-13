import { folderMetaSchema, type FolderMeta } from "./schema";
import { pathParts, splitContentScope } from "./paths";

/** Source-relative filenames mapped to loaders of their default export.
 * Astro supplies a Vite glob so metadata is bundled and watched, and never
 * requires filesystem access from a deployed adapter. */
export type FolderMetaModules = Record<string, () => Promise<unknown>>;

/** A source discovered by Vite. Its root identifies files in diagnostics;
 * its optional prefix is included in navigation metadata keys. */
export interface FolderMetaSource {
  root: string;
  prefix?: string;
  modules: FolderMetaModules;
}

/** Resolve Vite-loaded defaults and factories, then validate their metadata.
 * Keys retain numeric folder prefixes. Version and locale directories precede
 * the source prefix; shared meta.$.* files omit the locale segment. */
export const resolveFolderMeta = async (
  sources: readonly FolderMetaSource[],
  options: {
    localeDirs?: readonly string[];
    versionDirs?: readonly string[];
  } = {},
): Promise<{
  meta: Map<string, FolderMeta>;
  shared: Map<string, FolderMeta>;
}> => {
  const meta = new Map<string, FolderMeta>();
  const shared = new Map<string, FolderMeta>();
  const owners = {
    meta: new Map<string, string>(),
    shared: new Map<string, string>(),
  };
  for (const source of sources) {
    const modules = source.modules;
    for (const filename of Object.keys(modules).sort()) {
      const parts = pathParts(filename);
      if (parts.includes(".."))
        throw new Error(`Unsafe folder metadata path: ${filename}.`);
      const name = parts.pop() ?? "";
      if (!/^meta(?:\.\$)?\.(?:ts|js|mjs)$/.test(name)) continue;
      const isShared = name.startsWith("meta.$.");
      const scope = splitContentScope(parts, options);
      const path = `${source.root}/${filename}`;
      if (isShared && scope.locale) {
        throw new Error(
          `Shared folder metadata must be outside locale directories: ${path}.`,
        );
      }
      const key = [
        scope.version,
        scope.locale,
        ...pathParts(source.prefix ?? ""),
        ...scope.parts,
      ]
        .filter(Boolean)
        .join("/");
      const kind = isShared ? "shared" : "meta";
      const previous = owners[kind].get(key);
      if (previous)
        throw new Error(
          `Duplicate folder metadata for "${key || "/"}": ${previous} and ${path}.`,
        );
      owners[kind].set(key, path);
      try {
        const definition = await modules[filename]!();
        const resolved: unknown =
          typeof definition === "function" ? await definition() : definition;
        (isShared ? shared : meta).set(key, folderMetaSchema.parse(resolved));
      } catch (cause) {
        throw new Error(
          `Invalid folder metadata in ${path}: ${cause instanceof Error ? cause.message : String(cause)}`,
          { cause },
        );
      }
    }
  }
  return { meta, shared };
};
