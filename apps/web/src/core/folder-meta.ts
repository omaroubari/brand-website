import {
  diagnosticsFromZod,
  folderMetaSchema,
  type Diagnostic,
  type FolderMeta,
  type FolderMetaSource,
} from "brandtree";

const contentRoot = "src/content/brand-guidelines";
const modules = import.meta.glob<unknown>(
  [
    "/src/content/brand-guidelines/**/meta{,.$}.{ts,js,mjs}",
    "!/src/content/brand-guidelines/**/{node_modules,dist,.brandtree,.blume}/**",
    "!/src/content/brand-guidelines/**/_*/**",
  ],
  { import: "default" },
);

/** Temporary adapter: Vite bundles metadata before Cloudflare prerenders. */
export async function discoverFolderMeta(
  sources: readonly FolderMetaSource[],
  options: {
    localeDirs?: readonly string[];
    versionDirs?: readonly string[];
  } = {},
): Promise<{
  meta: Map<string, FolderMeta>;
  shared: Map<string, FolderMeta>;
  diagnostics: Diagnostic[];
}> {
  const meta = new Map<string, FolderMeta>();
  const shared = new Map<string, FolderMeta>();
  const diagnostics: Diagnostic[] = [];
  const localeDirs = new Set(options.localeDirs);
  const versionDirs = new Set(options.versionDirs);

  for (const source of sources) {
    if (source.root.replace(/^\.\//u, "").replace(/\/$/u, "") !== contentRoot) {
      throw new Error(
        `The temporary metadata adapter only supports ${contentRoot}.`,
      );
    }
    for (const [file, load] of Object.entries(modules).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const parts = file.slice(`/${contentRoot}/`.length).split("/");
      const filename = parts.pop()!;
      const version = versionDirs.has(parts[0] ?? "") ? parts.shift()! : "";
      const locale = localeDirs.has(parts[0] ?? "") ? parts.shift()! : "";
      const prefix = source.prefix?.replace(/^\/+|\/+$/gu, "") ?? "";
      const key = [version, locale, prefix, ...parts].filter(Boolean).join("/");
      let value: unknown;
      try {
        const exported = await load();
        value = typeof exported === "function" ? await exported() : exported;
      } catch (error) {
        diagnostics.push({
          code: "BLUME_META_LOAD_FAILED",
          file,
          message: `Could not load meta file: ${error instanceof Error ? error.message : String(error)}`,
          severity: "error",
        });
        continue;
      }
      const result = folderMetaSchema.safeParse(value);
      if (result.success) {
        (filename.startsWith("meta.$.") ? shared : meta).set(key, result.data);
      } else {
        diagnostics.push(
          ...diagnosticsFromZod(result.error, {
            code: "BLUME_META_INVALID",
            file,
          }),
        );
      }
    }
  }
  return { meta, shared, diagnostics };
}
