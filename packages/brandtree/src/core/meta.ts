import { basename, dirname, relative } from "node:path";
import { glob } from "tinyglobby";

import { createModuleLoader } from "./load-module.ts";
import { folderMetaSchema, type FolderMeta } from "./schema.ts";
import type { Diagnostic } from "./types.ts";
import { trimChar } from "./trim.ts";
import { diagnosticsFromZod } from "./diagnostics.ts";

const META_FILES = [
  "**/meta.ts",
  "**/meta.js",
  "**/meta.mjs",
  // Shared, locale-agnostic folder meta (applies to every locale).
  "**/meta.$.ts",
  "**/meta.$.js",
  "**/meta.$.mjs",
];

/**
 * A meta module's default export before validation: `folderMetaSchema` parses
 * it only after any factory is resolved, so it carries the loader's raw type.
 */
type MetaModuleExport = Awaited<
  ReturnType<ReturnType<typeof createModuleLoader>>
>;

/** A factory-style meta module default-exports a function returning the meta. */
const isMetaFactory = (
  mod: MetaModuleExport,
): mod is () => MetaModuleExport | Promise<MetaModuleExport> =>
  typeof mod === "function";

/** Resolve a meta module's default export, calling it if it is a factory. */
const resolveMeta = async (mod: MetaModuleExport) =>
  isMetaFactory(mod) ? await mod() : mod;

const META_FILENAME = /^meta(?:\.\$)?\.(?:ts|js|mjs)$/u;

/** A filesystem content source to scan for folder meta: its on-disk root and
 * optional route prefix. The prefix is folded into every key so meta lines up
 * with the sidebar group path, which carries the same prefix. */
export interface FolderMetaSource {
  root: string;
  prefix?: string;
}

/**
 * The folder-meta key for a directory. Mirrors the sidebar group path: the
 * source's route prefix (`docs`) followed by the directory relative to the
 * source root (`provider`) — so `docs/provider/meta.ts` under a `prefix: "docs"`
 * source keys to `docs/provider`, exactly the group path navigation builds.
 */
const metaKeyFor = (prefix: string | undefined, dir: string): string => {
  const clean = prefix ? trimChar(prefix, "/") : "";
  if (!clean) {
    return dir;
  }
  return dir ? `${clean}/${dir}` : clean;
};

/** Resolve Vite-loaded defaults and factories, then validate their metadata.
 * Keys retain numeric folder prefixes. Version and locale directories precede
 * the source prefix; shared meta.$.* files omit the locale segment. */
export const discoverFolderMeta = async (
  sources: readonly FolderMetaSource[],
  options: {
    localeDirs?: readonly string[];
    versionDirs?: readonly string[];
  } = {},
): Promise<{
  meta: Map<string, FolderMeta>;
  shared: Map<string, FolderMeta>;
  diagnostics: Diagnostic[];
}> => {
  const localeDirs = new Set(options.localeDirs);
  const versionDirs = new Set(options.versionDirs);

  const load = createModuleLoader();
  const meta = new Map<string, FolderMeta>();
  const shared = new Map<string, FolderMeta>();
  const diagnostics: Diagnostic[] = [];

  const owners = {
    meta: new Map<string, string>(),
    shared: new Map<string, string>(),
  };

  const perSource = await Promise.all(
    sources.map(async (source) => {
      const files = await glob(META_FILES, {
        absolute: true,
        cwd: source.root,
        // Never descend into dependencies or build output — relevant when the
        // root is the project root (e.g. a `.`-rooted or all-staged project).
        ignore: [
          "**/node_modules/**",
          "**/.blume/**",
          "**/dist/**",
          "**/_*/**",
        ],
        onlyFiles: true,
      });
      const loaded = await Promise.all(
        files.map(
          async (
            file,
          ): Promise<
            | { ok: true; file: string; value: unknown }
            | { ok: false; file: string; error: Error }
          > => {
            try {
              return {
                file,
                ok: true,
                value: await resolveMeta(await load(file)),
              };
            } catch (error) {
              return { error: error as Error, file, ok: false };
            }
          },
        ),
      );
      return { loaded, source };
    }),
  );

  for (const { loaded, source } of perSource) {
    for (const entry of loaded) {
      const dir = relative(source.root, dirname(entry.file));

      const [head, ...tail] = dir.split("/");

      const version = head && versionDirs.has(head) ? head : "";
      const afterVersion = version ? tail : [head, ...tail];
      const [localeHead, ...loacaleTail] = afterVersion;
      const locale = head && localeDirs.has(head) ? head : "";
      const rest = (locale ? loacaleTail : afterVersion)
        .filter(Boolean)
        .join("/");

      const key = [version, locale, metaKeyFor(source.prefix, rest)]
        .filter(Boolean)
        .join("/");

      if (!entry.ok) {
        diagnostics.push({
          code: "BLUME_META_LOAD_FAILED",
          file: entry.file,
          message: `Could not load meta file: ${entry.error.message}`,
          severity: "error",
        });
        continue;
      }

      const result = folderMetaSchema.safeParse(entry.value);
      if (result.success) {
        const target = basename(entry.file).startsWith("meta.$.")
          ? shared
          : meta;
        target.set(key, result.data);
      } else {
        diagnostics.push(
          ...diagnosticsFromZod(result.error, {
            code: "BLUME_META_INVALID",
            file: entry.file,
          }),
        );
      }
    }
  }

  return { meta, shared, diagnostics };
};
