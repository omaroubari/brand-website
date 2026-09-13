import type { ContentTree, Navigation, PageRecord } from "@/core/types";
import type { FolderMeta, ResolvedI18nConfig } from "./schema";
import { buildNavigation } from "./navigation";
import type { LoadContentTreeOptions } from "./loader";
import { localizeRoute, resolveFallbackLocale } from "./i18n";
import { withBasePath } from "./paths";

export type { ContentEntry } from "./entries";
export type { ContentTree } from "@/core/types";
export { humanizePageName, normalizePageSlug } from "./paths";

interface BuildContentTreeOptions {
  /** Site-wide route mount point (`""` or `/seg`); invisible to the nav tree. */
  basePath?: string;
  folderMeta: Map<string, FolderMeta>;
  sharedFolderMeta?: Map<string, FolderMeta>;
  navigation?: {};
  /** Omit or set false for a single, non-localized current-docs tree. */
  i18n?: ResolvedI18nConfig;
  /** Sorting locale without i18n; does not enable localization. */
  locale?: string;
}

type FallbackLocale = ReturnType<typeof resolveFallbackLocale>;

/** Keep the first owner of each route and build its route → page-id map. */
const collectRoutes = (pages: PageRecord[]) => {
  const routes = new Map<string, string>();
  const uniquePages: PageRecord[] = [];

  for (const page of pages) {
    const route = page.route.replace(/\/+$/, "") || "/";
    const existing = routes.get(route);
    if (existing) {
      console.warn({
        code: "BRANDTREE_DUPLICATE_ROUTE",
        file: page.sourcePath ?? page.id,
        message: `Two files resolve to ${route}: ${existing} and ${page.id}`,
        severity: "warning",
        suggestion: "Rename or move one of the files so each route is unique.",
      });
      continue;
    }
    routes.set(route, page.id);
    uniquePages.push(page);
  }
  return {
    pages: uniquePages.length === pages.length ? pages : uniquePages,
    routes,
  };
};

/**
 * A locale's pages, padded with fallback-locale entries for any translation it
 * hasn't authored yet, so navigation mirrors the default structure instead of
 * showing an empty (or partial) tree.
 */
const localePagesFor = (
  code: string,
  real: PageRecord[],
  fallback: FallbackLocale,
  fallbackByKey: Map<string, PageRecord>,
  i18n: ResolvedI18nConfig,
  basePath: string,
): PageRecord[] => {
  if (!(fallback && code !== fallback)) {
    return real;
  }
  const present = new Set(real.map((page) => page.translationKey));
  const filled: PageRecord[] = [];
  for (const [key, source] of fallbackByKey) {
    if (!present.has(key)) {
      filled.push({
        ...source,
        fallback: true,
        locale: code,
        route: withBasePath(basePath, localizeRoute(key, code, i18n)),
      });
    }
  }
  return [...real, ...filled];
};

/** Materialize configured locale fallbacks into the canonical page graph. */
const materializeFallbackPages = (
  pages: PageRecord[],
  i18n: ResolvedI18nConfig,
  basePath: string,
): PageRecord[] => {
  const fallback = resolveFallbackLocale(i18n);
  if (!fallback) {
    return pages;
  }

  const fallbackByKey = new Map<string, PageRecord>();
  for (const page of pages) {
    if (page.locale === fallback) {
      fallbackByKey.set(page.translationKey, page);
    }
  }

  const filled = i18n.locales.flatMap(({ code }) => {
    const real = pages.filter((page) => page.locale === code);
    return localePagesFor(
      code,
      real,
      fallback,
      fallbackByKey,
      i18n,
      basePath,
    ).slice(real.length);
  });

  return filled.length ? [...pages, ...filled] : pages;
};

/**
 * Build one locale's navigation tree from its own pages and folder meta.
 * `version` is the archived version id when building a snapshot's tree
 * (`""` for the current docs): it shifts the folder-meta lookups into the
 * snapshot's key space and roots the tree at the localized version root.
 */
const buildLocaleNavigation = (
  code: string,
  pages: PageRecord[],
  options: BuildContentTreeOptions,
  i18n: ResolvedI18nConfig,
  version = "",
): Navigation => {
  // Localize internal tab paths — the tab's own and its dropdown items' — so a
  // header tab points to its in-locale route (e.g. `/docs` -> `/fr/docs`);
  // external paths pass through. Selectors are left alone: a language
  // selector's items intentionally target specific locales.
  // `//host/path` is protocol-relative — an external URL that happens to start
  // with a slash, so it must not pick up a locale prefix. `withBasePath` draws
  // the same line for the same reason.
  const localizePath = (path: string): string =>
    path.startsWith("/") && !path.startsWith("//")
      ? localizeRoute(path, code, i18n)
      : path;

  const localePages = pages.filter((page) => page.locale === code);
  // Meta files live in locale directories only under the `dir` parser
  // (`fr/guides/meta.ts` -> key `fr/guides`). Under `dot`, translations sit
  // next to the originals and `guides/meta.ts` applies to every locale —
  // prefixing would look up keys that can never exist. Inside a snapshot the
  // version dir is hoisted in front (`v1.0/fr`), matching `discoverFolderMeta`.
  const localeDir = i18n.parser === "dir" ? code : "";
  // Internal featured and header hrefs are localized like tab paths — a pinned
  // `/changelog` link rendered on `/fr/…` pages must stay inside the reader's
  // locale, not kick them back to the default one.
  const localizeHref = <T extends { href: string }>(item: T): T => ({
    ...item,
    href: localizePath(item.href),
  });
  // const { actions, cta, featured } = options.navigation;

  return buildNavigation(localePages, {
    basePath: options.basePath ?? "",
    folderMeta: options.folderMeta,
    // The localized tree root ("/" for the hidden default, "/fr" otherwise;
    // "/fr/v1.0" inside a snapshot): the tab pointing here spans the whole
    // tree and must not be treated as a tab section.
    localizedRoot: localizeRoute("/", code, i18n),
    metaPrefix: [version, localeDir].filter(Boolean).join("/"),
    refByLogical: true,

    sharedFolderMeta: options.sharedFolderMeta,
    // Shared `meta.$.*` files are locale-agnostic but version-specific: a
    // snapshot's shared meta keys under its version dir.
    sharedMetaPrefix: version,
  });
};

/**
 * Per-locale navigation trees plus the default-locale tree for i18n sites.
 * Called once for the current docs and once per archived version (with that
 * version's pages and its id as `version`).
 */
const buildI18nNavigation = (
  pages: PageRecord[],
  options: BuildContentTreeOptions,
  i18n: ResolvedI18nConfig,
  version = "",
) => {
  // Each locale gets an independent tree, so navigation may diverge per language.
  // Missing translations have already been materialized into the canonical
  // page graph, so navigation and rendering project the same records.
  const navigationByLocale: Record<string, Navigation> = {};

  for (const { code } of i18n.locales) {
    navigationByLocale[code] = buildLocaleNavigation(
      code,
      pages,
      options,
      i18n,
      version,
    );
  }
  const navigation: Navigation = navigationByLocale[i18n.defaultLocale] ?? {
    featured: [],
    selectors: [],
    sidebar: [],
    tabs: [],
  };
  return { navigation, navigationByLocale };
};

/**
 * Takes normalized pages plus navigation settings and folder metadata,
 * then assembles them into a site-wide structure
 * */
export function buildContentTree(
  pages: PageRecord[],
  options: BuildContentTreeOptions,
): ContentTree {
  const { pages: sourcePages, routes: sourceRoutes } = collectRoutes(pages);
  const materializedPages = options.i18n
    ? materializeFallbackPages(
        sourcePages,
        options.i18n,
        options.basePath ?? "",
      )
    : sourcePages;
  const { pages: uniquePages, routes } =
    materializedPages === sourcePages
      ? { pages: sourcePages, routes: sourceRoutes }
      : collectRoutes(materializedPages);

  // Archived pages remain in the route manifest, but never enter either
  // current-docs navigation projection. Undefined version also means current.
  const currentPages = uniquePages.filter((page) => !page.version);
  const navigationModel = options.i18n
    ? buildI18nNavigation(currentPages, options, options.i18n)
    : {
        navigation: buildNavigation(currentPages, {
          basePath: options.basePath,
          folderMeta: options.folderMeta,
          sharedFolderMeta: options.sharedFolderMeta,
        }),
        navigationByLocale: {},
      };

  return { pages: uniquePages, ...navigationModel, routes };
}

/** Load the site-wide graph; locale selection belongs to getNavigation. */
export async function getContentTree(
  options: LoadContentTreeOptions = {},
): Promise<ContentTree> {
  const { loadContentTree } = await import("./loader");
  return loadContentTree(options);
}
