import { readFile } from "node:fs/promises";
import { extname, relative } from "node:path";
import { parse as parseYaml } from "yaml";

import { normalizeEntry, type SourceEntry } from "./entries.ts";
import { loadConfig } from "./config.ts";

import { discoverFolderMeta } from "./meta.ts";
import { normalizeBasePath } from "./paths.ts";
import type { FolderMeta, ResolvedConfig } from "./schema.ts";
import { buildContentTree } from "./tree.ts";
import type {
  ContentTree,
  Diagnostic,
  PageRecord,
  ProjectContext,
} from "./types.ts";
import { resolveProjectContext } from "./project.ts";
import { glob } from "tinyglobby";

const IGNORED_DIRECTORIES = [
  ".astro",
  ".brandtree",
  ".git",
  "coverage",
  "dist",
  "node_modules",
];

/** Build mode: drafts are kept in `dev` and dropped in `build`. */
export type BuildMode = "dev" | "build";

/** Everything Brandtree derives from a project after reading its config and files. */
export interface BrandtreeProject {
  context: ProjectContext;
  config: ResolvedConfig;
  diagnostics: Diagnostic[];
  /** Entries excluded from the graph because their frontmatter failed validation. */
  droppedPages: number;
  mode: BuildMode;
  /** The instantiated content sources, for lazy entry reads (search/AI/raw). */
  sources: { name: string }[];
  tree: ContentTree;
}

/** Default include glob for filesystem-backed content sources. */
const DEFAULT_CONTENT_GLOB = "**/*.{md,mdx}";

/** A leading `---` fenced YAML block, as Astro/gray-matter delimit it. */
const FRONTMATTER_BLOCK =
  /^---[^\S\r\n]*\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?:\r?\n|$)/u;

interface ParsedSource {
  content: string;
  data: Record<string, unknown>;
}

/**
 * Split a Markdown/MDX source into its YAML frontmatter and body. A source with
 * no frontmatter is all body, and a frontmatter block that is empty or parses to
 * a non-mapping (a list, a bare scalar) contributes no data. Matches Astro's own
 * delimiter rules: the opening `---` must be the first line, and the closing
 * fence may carry trailing whitespace.
 */
const parseFrontmatter = (text: string): ParsedSource => {
  const block = FRONTMATTER_BLOCK.exec(text);
  if (!block) return { content: text, data: {} };

  const data = parseYaml(block[1] ?? "");
  return {
    content: text.slice(block[0].length),
    data:
      data !== null && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {},
  };
};

/**
 * The frontmatter parser, resolved per call so a `matter` global (test adapter,
 * host-provided parser) takes precedence over the built-in shim.
 */
const matter = (text: string): ParsedSource => {
  const override = (globalThis as { matter?: (text: string) => ParsedSource })
    .matter;
  return override ? override(text) : parseFrontmatter(text);
};

const loadFilesystemSource = async (source: {
  contentRoot: string;
}): Promise<{
  entries: SourceEntry[];
  /** Source-level diagnostics (e.g. an offline cache fallback warning). */
  diagnostics: Diagnostic[];
  /**
   * Folder meta the source derives for the sidebar groups its entries create,
   * keyed by locale-stripped group path (the `meta.ts` key space). The OpenAPI
   * source labels each tag directory with the spec's own tag name, so the
   * sidebar shows `OAuth2`/`Größe` instead of a re-humanized slug. Merged
   * beneath user-authored meta files, which always win.
   */
  folderMeta?: Record<string, FolderMeta>;
}> => {
  const contentRoot = source.contentRoot;

  const files = await glob(DEFAULT_CONTENT_GLOB, {
    absolute: true,
    cwd: contentRoot,
    ignore: [
      ...IGNORED_DIRECTORIES.map((directory) => `**/${directory}/**`),
      "**/_*",
      "**/_*/**",
    ],
    onlyFiles: true,
  });
  files.sort();

  const entries = await Promise.all(
    files.map(async (file): Promise<SourceEntry> => {
      const source = await readFile(file, "utf-8");
      const ext = extname(file).toLowerCase();
      const format = ext === ".mdx" ? "mdx" : "md";
      const parsed = matter(source);
      return {
        body: { format, text: parsed.content },
        data: parsed.data,
        // The unstripped text: lets `normalizeEntry` offset link line numbers
        // by the frontmatter block's height, so diagnostics point at the real
        // file line (and spares a re-read on the frontmatter-error path).
        raw: source,
        ref: relative(contentRoot, file),
        sourcePath: file,
      };
    }),
  );

  return { entries, diagnostics: [] };
};

/**
 * Discover and fully scan one Brandtree project below `root` (the current
 * working directory by default). Config, page frontmatter, folder metadata,
 * normalized routes, locale fallbacks, and navigation are resolved in one pass.
 */
export const scanProject = async (
  root = process.cwd(),
  options: {
    devServerUrl?: string;
    mode?: BuildMode;
    preview?: boolean;
    refresh?: boolean;
    /** Relocate the generated runtime (e.g. `.brandtree-verify` for isolation). */
    runtimeDir?: string;
  } = {},
): Promise<BrandtreeProject> => {
  const mode = options.mode ?? "dev";
  const preview = options.preview ?? false;
  const configResult = await loadConfig(root);

  const config = configResult.config;

  const context = resolveProjectContext(root, {
    runtimeDir: options.runtimeDir,
  });

  const source = {
    name: "filesystem",
    prefix: "",
    contentRoot: context.contentRoot,
  };

  const localeDirs =
    config.i18n?.parser === "dir"
      ? config.i18n.locales.flatMap((locale) =>
          locale.code === config.i18n?.defaultLocale ? [] : [locale.code],
        )
      : [];

  const [loaded, folderMeta] = await Promise.all([
    loadFilesystemSource(source),
    discoverFolderMeta([{ ...source, root: source.contentRoot }], {
      localeDirs,
    }),
  ]);

  // Folder meta contributed by the sources themselves (the OpenAPI source
  // labels each tag directory with the spec's own tag name). It applies to
  // every locale, so it merges into the shared map — beneath user-authored
  // entries, which are spread last and win.
  const sharedFolderMeta = new Map([
    ...Object.entries(loaded.folderMeta ?? {}),
    ...folderMeta.shared,
  ]);

  const basePath = normalizeBasePath(config.basePath);

  const allPages: PageRecord[] = [];
  const contentDiagnostics: Diagnostic[] = [];
  let droppedPages = 0;

  for (const entry of loaded.entries) {
    const normalized = normalizeEntry(entry, {
      basePath,
      i18n: config.i18n,
      source,
    });
    if (normalized.pages.length === 0 && normalized.diagnostics.length > 0) {
      droppedPages += 1;
    }
    allPages.push(...normalized.pages);
    contentDiagnostics.push(...normalized.diagnostics);
  }

  // Drafts render in dev and in preview, but are excluded from production builds.
  const pages =
    mode === "build" && !preview
      ? allPages.filter((page) => !page.meta.draft)
      : allPages;

  const tree = buildContentTree(pages, {
    basePath,
    folderMeta: folderMeta.meta,
    i18n: config.i18n,
    navigation: config.navigation,
    sharedFolderMeta,
  });

  return {
    mode,
    context,
    config,
    diagnostics: [
      ...configResult.diagnostics,
      ...contentDiagnostics,
      ...folderMeta.diagnostics,
    ],
    sources: [source],
    droppedPages,
    tree,
  };
};
