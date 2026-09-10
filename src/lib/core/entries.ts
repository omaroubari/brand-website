import type { CollectionEntry } from "astro:content";
import type { Heading, PageRecord } from "../types";
import {
  pageMetaSchema,
  type PageMeta,
  type ResolvedI18nConfig,
} from "./schema";
import { pathParts, withBasePath } from "./paths";
import { localePlacement, localizeRoute } from "./i18n";
import { trimChar } from "./trim";
import { extname } from "pathe";

const NUMERIC_PREFIX = /^\d+[-_.]/u;
const GROUP_FOLDER = /^\((?<label>.+)\)$/u;
const WORD_SPLIT = /[-_]/u;

/** Strip a leading numeric ordering prefix (`01-intro` -> `intro`). */
const stripNumericPrefix = (segment: string): string =>
  segment.replace(NUMERIC_PREFIX, "");

/** Detect a group folder `(name)` and return its label, else null. */
const groupLabel = (segment: string): string | null =>
  segment.match(GROUP_FOLDER)?.groups?.label ?? null;

/**
 * Slugify a content/route slug (Sanity, Notion, frontmatter `slug`). Heading
 * anchor ids are *not* slugged here — they use a `github-slugger` in
 * {@link extractHeadings}, matching the renderer (see `markdown/heading-anchors`)
 * so `blume validate` checks anchors against the exact rendered heading ids.
 *
 * The keep-class is Unicode letters/marks/numbers, not `\w`: ASCII slugs are
 * unchanged, but a CJK/Cyrillic/accented slug keeps its characters instead of
 * collapsing to `""` (which forced Sanity/Notion routes onto their opaque
 * document-id fallbacks) or dropping accents (`café` → `caf`). NFC first so a
 * macOS-NFD `é` (e + combining mark) slugs identically to the composed form.
 */
export const slugify = (text: string): string =>
  text
    .normalize("NFC")
    .toLowerCase()
    .trim()
    .replaceAll(/[^\p{L}\p{M}\p{N}\s_-]/gu, "")
    .replaceAll(/[\s_]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-|-$/gu, "");

/**
 * {@link slugify} for a slug that may span path segments (`guides/setup`).
 * `slugify` deletes `/` along with all other punctuation, which would mash
 * `guides/setup` into `guidessetup` — and collide it with a genuine `guidessetup`
 * document. Each segment is slugged on its own and the separators kept.
 */
export const slugifyPath = (text: string): string =>
  text.split("/").map(slugify).filter(Boolean).join("/");

/** Title-case a slug segment for display. */
const titleCase = (value: string): string =>
  value
    .split(WORD_SPLIT)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export type ContentEntry = CollectionEntry<"brandGuidelines">;

/**
 * A single content item, normalized by a source adapter. Adapters lower their
 * native shape (files, Portable Text, Notion blocks, remote HTML) to Markdown/MDX
 * *text* so Blume's markdown processors and component set apply uniformly.
 */
export interface SourceEntry {
  /** Source-local stable id, e.g. `api/auth.mdx` or a CMS document id. */
  ref: string;
  /** Logical route input; defaults to `ref` if omitted. May include slashes. */
  slug?: string;
  /** Frontmatter-equivalent metadata, validated against the Blume meta schema. */
  // oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- pre-validation frontmatter from YAML/CMS payloads; the meta schema parses it downstream
  data: Record<string, unknown>;
  /** The renderable body as Markdown/MDX source text (frontmatter stripped). */
  body: { format: "md" | "mdx"; text: string };
  /**
   * Full source text including frontmatter, written verbatim to the staging
   * dir so Astro re-parses the same frontmatter. Staged (non-filesystem) sources
   * set this; filesystem entries (read from disk) omit it.
   */
  raw?: string;
  /**
   * Absolute filesystem path when the entry originates from disk. Set by any
   * local-file adapter — the filesystem source, and staged local sources such
   * as Obsidian, whose bodies are rewritten but whose notes are still real
   * files. It gives diagnostics a path the author recognizes and lets relative
   * image checks resolve next to the file. Omitted by remote/CMS adapters.
   *
   * It does *not* imply the entry renders through the docs glob collection —
   * read `source.staged` for that — and git last-modified additionally needs
   * the owning source to expose a `contentRoot` to bound the log's pathspec.
   */
  sourcePath?: string;
  /** Optional provenance for "edit this page". */
  editUrl?: string;
  /** Optional last-modified ISO date supplied by the adapter (non-filesystem). */
  lastModified?: string;
  /** Content hash for cache invalidation / HMR; adapter-computed when cheap. */
  hash?: string;
  /**
   * The body with `<include>` statements expanded, set by the scan's expansion
   * pass (filesystem entries whose body contains a statement). `normalizeEntry`
   * extracts headings/links/components from this text so a partial's content
   * counts toward the including page, with `origins` mapping each expanded
   * line back to the file and raw line it came from for diagnostics.
   */
  expanded?: {
    text: string;
    origins: { file: string; line: number }[];
    /** Absolute paths of every file included, transitively. */
    includes: string[];
  };
}

/** What a route resolution needs from the owning source and the config. */
export type RouteContext = Pick<NormalizeContext, "i18n" | "versions"> & {
  /** The source's route prefix (`NormalizeContext["source"]["prefix"]`). */
  prefix?: string;
  /** Filesystem directory names that contain archived snapshots. */
  versionDirs?: readonly string[];
};

/** Adapt Astro's glob-loader shape to the source-neutral entry model. */
export const toSourceEntry = (contentEntry: ContentEntry): SourceEntry => {
  // The collection id is source-local because the glob loader's generateId
  // preserves the path relative to its base. filePath may be project-relative
  // or absolute, so using it as the ref would leak `src/content/sections` into
  // routes and prevent locale placement from recognizing the first segment.
  const ref = contentEntry.id;

  return {
    ref,
    // `PageMeta` is a closed object while source adapters expose an open
    // frontmatter dictionary. Copy it so callers cannot mutate Astro's entry.
    data: { ...contentEntry.data },
    body: {
      format: /\.mdx$/i.test(ref) ? "mdx" : "md",
      // `glob()` retains bodies by default; an empty value keeps the adapter
      // total for fixtures and loaders configured with `retainBody: false`.
      text: contentEntry.body ?? "",
    },
  };
};

export interface NormalizeContext {
  source?: { name: string; root: string; prefix?: string };
  /** Site-wide route mount point (`""` or `/seg`), prepended to every route. */
  basePath?: string;
  // defaultType: string;
  i18n?: ResolvedI18nConfig;
  versions?: {};
  versionDirs?: readonly string[];
}

const deriveTitle = (
  meta: PageMeta,
  headings: Heading[],
  id: string,
): string => {
  if (meta.title) {
    return meta.title;
  }
  const firstHeading = headings.find((h) => h.depth === 1) ?? headings[0];
  if (firstHeading) {
    return firstHeading.text;
  }
  const base = id.split("/").pop() ?? id;
  return titleCase(stripNumericPrefix(base.replace(extname(base), "")));
};

/** Strip habitual leading/trailing slashes (`/getting-started`, `guides/`). */
const trimSlashes = (value: string): string => trimChar(value, "/");

/** Mount a source-relative path under the source's route prefix. */
const withPrefix = (prefix: string | undefined, path: string): string => {
  const clean = prefix ? trimSlashes(prefix) : "";
  return clean ? `${clean}/${path}` : path;
};

/** Where an entry's ref places it once its directories are read off. */
export interface EntryPlacement {
  /**
   * The locale codes the entry publishes in: `[""]` without i18n, one code for
   * a placed file, every configured code for a shared `$` file.
   */
  locales: string[];
  /** The ref with its version and locale directories stripped, prefix-less. */
  navPath: string;
  /** The version snapshot the entry belongs to (`""` for current). */
  version: string;
}

/**
 * Read the version and locale directories off an entry's ref. The version is
 * detected first: a snapshot directory is outermost on disk
 * (`v1.0/fr/page.mdx`), so the locale parser must see a version-stripped ref.
 * The current version is `""` and lives at the root. Locale placement comes
 * from the ref (a leading dir, or a filename suffix under the `dot` parser),
 * never the slug — the slug is the logical, locale-agnostic path within a
 * locale. A shared `$` file maps to every locale; a source without i18n
 * placement maps to one.
 */
export const placeEntryRef = (
  ref: string,
  ext: string,
  ctx: Pick<RouteContext, "i18n" | "versions" | "versionDirs">,
): EntryPlacement => {
  const parts = pathParts(ref);
  const version = ctx.versionDirs?.includes(parts[0] ?? "")
    ? parts.shift()!
    : "";
  const versionlessRef = parts.join("/");
  const { navPath, locales } = ctx.i18n
    ? localePlacement(versionlessRef, ext, ctx.i18n)
    : { locales: [""], navPath: versionlessRef };
  return { locales, navPath, version };
};

/** Everything `normalizeEntry` derives from an entry's ref and slug. */
export interface EntryRoute extends Pick<
  EntryPlacement,
  "locales" | "version"
> {
  groups: string[];
  /**
   * The version-prefixed, locale-agnostic route — the translation key. Pass it
   * through {@link localizedRoute} for the route one locale publishes at.
   */
  logicalRoute: string;
  /** The prefixed, locale- and version-stripped nav path. */
  navPath: string;
  segments: string[];
  /** The version-agnostic mapped route. */
  versionKey: string;
}

/**
 * Strip characters that cannot survive the route → URL → output-file round
 * trip. A `:` ahead of the first `/` makes `new URL()` read the segment as a
 * scheme (`Guide: Architecture.md` → `guide:`), which crashes Astro's
 * prerender write with "The URL must be of scheme file"; control characters
 * (an embedded newline in a filename) are silently dropped by the URL parser,
 * desyncing the route from its output path. Both are legal in macOS/Linux
 * filenames, so they are removed here rather than rejected.
 */
const sanitizeSegment = (segment: string): string =>
  segment.replaceAll(/[:\p{Cc}]/gu, "");

/** Fold one raw path part into the accumulating route segments/groups. */
const addRouteSegment = (
  part: string,
  segments: string[],
  groups: string[],
): void => {
  // A leading/trailing/double slash yields an empty part; keeping it would
  // produce a malformed route (`//foo`, `/foo/`) that nothing can link to.
  if (part === "") {
    return;
  }
  const group = groupLabel(part);
  if (group !== null) {
    groups.push(group);
    return;
  }
  const clean = stripNumericPrefix(part);
  if (clean === "index") {
    return;
  }
  const safe = sanitizeSegment(clean);
  // A part that was nothing but stripped characters cannot name a segment.
  if (safe === "") {
    return;
  }
  segments.push(safe);
};

/** URL + nav metadata mapped from one content-root-relative path. */
interface MappedRoute {
  segments: string[];
  groups: string[];
  route: string;
}

/**
 * Convert a content-root-relative path into URL + nav metadata. Not exported:
 * a source that needs to predict a route goes through
 * {@link resolveEntryRoute}, so there is exactly one derivation.
 */
const mapRoute = (relativePath: string): MappedRoute => {
  const withoutExt = relativePath.slice(
    0,
    relativePath.length - extname(relativePath).length,
  );
  const rawParts = withoutExt.split("/");

  const segments: string[] = [];
  const groups: string[] = [];

  for (const part of rawParts) {
    addRouteSegment(part, segments, groups);
  }

  const route = segments.length === 0 ? "/" : `/${segments.join("/")}`;
  return { groups, route, segments };
};

/**
 * The canonical route resolution, shared by {@link normalizeEntry} and any
 * source that must predict the route an entry will publish at — the Obsidian
 * source turns `[[Note]]` into a real href, and a second derivation of a route
 * is a second answer.
 *
 * A frontmatter `slug` wins, then the adapter-supplied `entry.slug` (the typed
 * SPI's "logical route input; defaults to ref if omitted"), then the ref. The
 * extension is re-appended so `mapRoute`'s extname strip can't eat a dotted
 * slug segment (`v1.2`). A slug that trims to nothing falls back. The version
 * prefixes the mapped route *after* `mapRoute` runs: the mapped route is the
 * version-agnostic key, the config id is prepended verbatim (never
 * numeric-prefix-stripped), a frontmatter `slug` gets versionized so snapshots
 * can't collide with the live page, and `translationKey` becomes
 * version-specific for free. `basePath` is not applied here — it is outermost,
 * after locale prefixing — so the result reads `{locale?}/{prefix?}/…`.
 */
export const resolveEntryRoute = (
  entry: Pick<SourceEntry, "ref" | "slug">,
  ext: string,
  frontmatterSlug: string | undefined,
  ctx: RouteContext,
): EntryRoute => {
  const { locales, navPath, version } = placeEntryRef(entry.ref, ext, ctx);
  const adapterSlug = entry.slug ? trimSlashes(entry.slug) : "";
  const frontmatterPath = frontmatterSlug
    ? [...pathParts(navPath).slice(0, -1), `${frontmatterSlug}${ext}`].join("/")
    : "";
  const routeInput = withPrefix(
    ctx.prefix,
    frontmatterPath || (adapterSlug ? `${adapterSlug}${ext}` : navPath),
  );
  const { segments, groups, route } = mapRoute(routeInput);
  const logicalRoute = version ? `/${[version, ...segments].join("/")}` : route;
  return {
    groups,
    locales,
    logicalRoute,
    navPath: withPrefix(ctx.prefix, navPath),
    segments,
    version,
    versionKey: route,
  };
};

/** The route a logical route publishes at in one locale, base path excluded. */
export const localizedRoute = (
  logicalRoute: string,
  locale: string,
  i18n: ResolvedI18nConfig | undefined,
): string => (i18n ? localizeRoute(logicalRoute, locale, i18n) : logicalRoute);

const safeSlug = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

/** Normalize one source-neutral entry into its route record. */
export function normalizeEntry(
  entry: SourceEntry,
  ctx: NormalizeContext = {},
): { pages: PageRecord[] } {
  const refParts = pathParts(entry.ref);
  if (refParts.includes("..") || /^(?:[/\\]|[a-z]:[/\\])/i.test(entry.ref)) {
    throw new Error(`Unsafe content source path: ${entry.ref}.`);
  }

  const { format } = entry.body;
  const ext = format === "mdx" ? ".mdx" : ".md";

  const meta = pageMetaSchema.parse(entry.data);

  if (meta.slug !== undefined) {
    const filename = refParts.at(-1) ?? entry.ref;
    const stem = stripNumericPrefix(
      filename.slice(0, filename.length - extname(filename).length),
    );
    if (!safeSlug.test(meta.slug) || stem === "index") {
      throw new Error(`Unsafe slug override "${meta.slug}" for ${entry.ref}.`);
    }
  }

  // Top-level `hidden`/`noindex` are accepted as shorthands for their nested
  // equivalents — the schema declares them, so silently ignoring them would
  // strand authors with no diagnostic.
  if (meta.hidden) {
    meta.sidebar.hidden = true;
  }
  if (meta.noindex) {
    meta.seo.noindex = true;
  }

  const {
    groups,
    locales,
    logicalRoute,
    navPath,
    segments,
    version,
    versionKey,
  } = resolveEntryRoute(entry, ext, meta.slug, {
    i18n: ctx.i18n,
    prefix: ctx.source?.prefix,
    versions: ctx.versions,
    versionDirs: ctx.versionDirs,
  });

  const base = {
    id: `${ctx.source?.name ?? "filesystem"}:${entry.ref}`,
    source: { name: ctx.source?.name ?? "filesystem", ref: entry.ref },
    sourcePath: entry.sourcePath,
    translationKey: logicalRoute,
    version,
    versionKey,
    navPath,
    segments,
    groups,
    title: deriveTitle(meta, [], navPath),
    description: meta.description,
    contentType: "docs",
    meta,
    lastModified: entry.lastModified,
    // Source adapters supply Markdown/MDX text, but do not depend on
    // Astro's renderer. Heading extraction remains the renderer boundary.
    headings: [],
  } satisfies Omit<PageRecord, "locale" | "route">;
  // One record per locale this entry maps to (one normally; every locale for a
  // shared `$` file). All share the same id, source ref, and translation key.
  // `basePath` is applied outermost — after locale prefixing — so the route
  // reads `{basePath}/{locale?}/{prefix?}/…`; `navPath` and `translationKey`
  // stay base-less so the nav tree and translation matching are unaffected.
  const pages = locales.map((locale) => ({
    ...base,
    locale,
    route: withBasePath(
      ctx.basePath ?? "",
      localizedRoute(logicalRoute, locale, ctx.i18n),
    ),
  }));

  return { pages };
}
