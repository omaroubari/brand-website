import type { ContentIconName } from "@/core/icons";
import type { PageMeta } from "@/core/schema";

/** A heading extracted from page content, used for the TOC and search. */
export interface Heading {
  depth: number;
  text: string;
  slug: string;
}

/** A link target discovered in page content, anchored to its source line. */
export interface PageLink {
  /** Raw link target as written, e.g. `./foo`, `/api#auth`, `https://x.dev`. */
  target: string;
  /** Set when the target was written as an image embed (`![alt](target)`) —
   * only those go through the image pipeline; a plain link to the same path
   * resolves as a site route. */
  image?: boolean;
  /** 1-based line number in the source file. */
  line: number;
  /** 1-based column of the target within the line. */
  column: number;
  /** Absolute path of the file the link was written in, when that isn't the
   * page's own source — a link inside an included partial. Diagnostics point
   * here so authors fix the partial, not the page that spliced it. */
  file?: string;
}

/**
 * A normalized content page. This is the unit the route manifest, nav graph,
 * and search index are derived from.
 */
export interface PageRecord {
  /** Stable, globally-unique source/content id: `"<source>:<ref>"`, e.g. `filesystem:api/auth.mdx`. Stable source-content identity. May be shared by localized projections. */
  id: string;
  /** Provenance: the owning source's name and its source-local ref. */
  source: { name: string; ref: string };
  /** Absolute source path. Populated by any local-file adapter (back-compat). */
  sourcePath?: string;
  /** Astro collection this entry renders through; defaults to `"docs"`. */
  collection?: string;
  /** Astro collection-relative entry id for `getEntry`; defaults to the ref. */
  entryId?: string;
  /** URL route, e.g. `/api/auth`. Always starts with `/`. Locale-prefixed under i18n. Unique per page. */
  route: string;
  /** Resolved locale code; the default locale when not under i18n. */
  locale: string;
  /**
   * Locale-agnostic logical route shared by every translation (e.g.
   * `/guides/x`, or `/v1.0/guides/x` under versioning — the key is
   * version-specific, so translations group within their version).
   * Pages with the same key are translations of each other.
   */
  translationKey: string;
  /**
   * Resolved docs version: an archived id (`v1.0`) for snapshot pages, `""`
   * for the current (unprefixed) docs — including every page of an
   * unversioned project.
   */
  version?: string;
  /**
   * Version- and locale-agnostic logical route (e.g. `/guides/x` for
   * `/v1.0/guides/x`). Pages with the same key and locale are the same
   * logical page across versions — this drives the switcher's same-page
   * navigation and the canonical-to-latest lookup.
   */
  versionKey?: string;
  /**
   * True for entries filled in from the fallback locale to pad a locale's
   * navigation for pages it hasn't translated yet. The record's content —
   * title included — belongs to the fallback locale, so per-locale content
   * checks skip these.
   */
  fallback?: boolean;
  /**
   * Source-relative path with version/locale directories stripped and the
   * source prefix prepended. Retains numeric prefixes and the file extension
   * for navigation grouping and ordering; does not include the site's base.
   */
  navPath: string;
  /** Path segments without numeric prefixes, e.g. `["api", "auth"]`. */
  segments: string[];
  /** Group-folder labels this page lives under, e.g. `["guides"]`. */
  groups: string[];
  title: string;
  description?: string;
  contentType: string;
  meta: PageMeta;

  headings: Heading[];

  /** Resolved "last updated" ISO date, when the feature is enabled. */
  lastModified?: string;
}

/** A node in the generated navigation tree. */
export type NavNode =
  | {
      kind: "page";
      label: string;
      route: string;
      description?: string;
      icon?: ContentIconName;
      badge?: string;
      deprecated?: boolean;
      pageId: string;
    }
  | {
      kind: "group";
      label: string;
      badge?: string;
      icon?: ContentIconName;
      route?: string;
      /**
       * The group's URL path (its folder route prefix), even when the folder
       * has no index page to link. Used to scope the sidebar to a tab's section;
       * not a clickable link (that's `route`).
       */
      path?: string;
      collapsed?: boolean;
      children: NavNode[];
    };

/** The complete navigation model derived from the content graph. */
export interface Navigation {
  sidebar: NavNode[];
  /**
   * The tree root in final path space — localized and based (`/`, `/en`,
   * `/docs`), and versionized for an archived version tree (`/v1.0`). Tab
   * paths share that space except under a version, where they stay in
   * current-docs space — so the root tab is the tab this root sits under
   * (`isRootTab`), not necessarily the tab at this exact path, and must be
   * scoped as the root tab, not as a section tab. Absent on older serialized
   * graphs; treat as `/`.
   */
  root?: string;
}

export interface ContentTree {
  pages: PageRecord[];
  /** Default locale's current-docs navigation, or the single tree without i18n. */
  navigation: Navigation;
  /** Current-docs navigation per configured locale; empty without i18n. */
  navigationByLocale: Record<string, Navigation>;
  /** Map of route -> pageId for fast lookup and duplicate detection. */
  routes: Map<string, string>;
}

/** A resolved language-switcher entry for the current page. */
export interface LocaleSwitchOption {
  code: string;
  label: string;
  dir: "ltr" | "rtl";
  /** Target URL: the real translation, or the localized fallback URL. */
  href: string;
  isCurrent: boolean;
  /** True when this locale has no real translation (renders fallback content). */
  isFallback: boolean;
}
