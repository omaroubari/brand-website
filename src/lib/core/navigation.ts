import type { FolderMeta } from "./schema";
import type { ContentTree, Navigation, NavNode, PageRecord } from "../types";
import type { ContentIconName } from "./icons";

import { extname } from "pathe";

const NUMERIC_PREFIX = /^(?<order>\d+)[-_.]/u;
const GROUP_FOLDER = /^\((?<label>.+)\)$/u;
const WORD_SPLIT = /[-_]/u;

const pathParts = (path: string): string[] =>
  path.replaceAll("\\", "/").split("/").filter(Boolean);

const routePath = (parts: string[]): string => `/${parts.join("/")}`;

const humanize = (segment: string): string =>
  segment
    .replace(NUMERIC_PREFIX, "")
    .split(WORD_SPLIT)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(" ");

const numericOrder = (segment: string): number => {
  const value = segment.match(NUMERIC_PREFIX)?.groups?.order;
  return value ? Math.trunc(Number(value)) : Number.POSITIVE_INFINITY;
};

/** The nav key of a raw path segment: group label or numeric-stripped name. */
const segmentKey = (raw: string): string => {
  const group = raw.match(GROUP_FOLDER)?.groups?.label;
  return (group ?? raw).replace(NUMERIC_PREFIX, "");
};

/**
 * Whether a filename stem is a directory index, ignoring an ordering prefix:
 * route mapping strips the prefix before dropping `index`, so `01-index` routes
 * exactly like `index` and must be treated as one here too.
 */
const isIndexStem = (stem: string): boolean =>
  stem.replace(NUMERIC_PREFIX, "") === "index";

/** A filename's stem: the name with its extension stripped.
 * example filename: '01-the-brand.mdx', stem: '01-the-brand'
 */
const stemOf = (filename: string): string =>
  filename.replace(extname(filename), "");

const isHidden = (page: PageRecord): boolean =>
  page.meta.hidden || page.meta.sidebar.hidden === true;

interface MutablePage {
  kind: "page";
  key: string;
  label: string;
  route: string;
  description?: string;
  icon?: ContentIconName;
  badge?: string;
  deprecated?: boolean;
  pageId: string;
  /** Absolute source path (filesystem adapter only), to anchor diagnostics. */
  file?: string;
  order: number;
  /**
   * Whether `order` reflects a deliberate authoring choice (explicit
   * `sidebar.order`, a numeric filename prefix, or a folder-meta `pages` rank)
   * rather than a derived value like a changelog entry's publish date — two
   * changelog entries published on the same day aren't an authoring mistake,
   * so they're excluded from the duplicate-order diagnostic.
   */
  orderIsAuthored: boolean;
}

interface MutableGroup {
  kind: "group";
  key: string;
  path: string;
  /** The group's URL path (folder route prefix); set as pages are inserted. */
  routePath?: string;
  label: string;
  icon?: ContentIconName;
  collapsed?: boolean;
  order: number;
  children: MutableNode[];
  index: Map<string, MutableGroup>;
}

type MutableNode = MutablePage | MutableGroup;

const createGroup = (
  key: string,
  path: string,
  label: string,
  order: number,
): MutableGroup => ({
  children: [],
  index: new Map(),
  key,
  kind: "group",
  label,
  order,
  path,
});

const ensureGroup = (
  parent: MutableGroup,
  rawSegment: string,
): MutableGroup => {
  // check if parent already indexed the group
  const existing = parent.index.get(rawSegment);
  if (existing) {
    return existing;
  }

  // create new group for dir
  const path = parent.path ? `${parent.path}/${rawSegment}` : rawSegment;
  const group = createGroup(
    segmentKey(rawSegment),
    path,
    humanize(rawSegment.match(GROUP_FOLDER)?.groups?.label ?? rawSegment),
    numericOrder(rawSegment),
  );

  // add new group to its parent's index and childen
  parent.index.set(rawSegment, group);
  parent.children.push(group);
  return group;
};

interface PageOrder {
  order: number;
  /** Whether the order came from the author (frontmatter or a rank prefix). */
  orderIsAuthored: boolean;
}

const pageOrder = (page: PageRecord, filename: string): PageOrder => {
  if (isIndexStem(stemOf(filename))) {
    return { order: Number.NEGATIVE_INFINITY, orderIsAuthored: false };
  }

  // An undated changelog entry's numeric filename prefix is usually a date
  // (`2024-01-05-release.md`) rather than a rank, so it is derived too.
  const order = numericOrder(filename);
  return {
    order,
    orderIsAuthored: page.contentType !== "changelog" && Number.isFinite(order),
  };
};
/**
 * Folder-meta lookup key for a group path. Under i18n the meta files live in
 * the locale directory (`fr/guides/meta.ts` -> key `fr/guides`) while the
 * nav group path is locale-stripped (`guides`), so prepend the locale prefix.
 */
const metaKey = (path: string, metaPrefix: string): string => {
  if (!metaPrefix) {
    return path;
  }
  return path ? `${metaPrefix}/${path}` : metaPrefix;
};

/**
 * Apply folder meta (title/order/icon/collapsed/display and explicit page
 * order), plus the index-frontmatter display sugar collected per folder path.
 */
const applyFolderMeta = (
  group: MutableGroup,
  folderMeta: Map<string, FolderMeta>,
  sharedMeta: Map<string, FolderMeta>,
  metaPrefix: string,
  sharedMetaPrefix: string,
): void => {
  // Locale-specific meta wins; a shared `meta.$.*` (keyed by the locale-stripped
  // group path — version-prefixed inside a snapshot) applies to every locale
  // otherwise.
  const localized = folderMeta.get(metaKey(group.path, metaPrefix));
  const shared = sharedMeta.get(metaKey(group.path, sharedMetaPrefix));
  const meta =
    localized || shared
      ? {
          ...shared,
          ...localized,
        }
      : undefined;
  // The group's own render mode, resolved index frontmatter first, then folder
  // meta; `toNavNode` falls back to the global mode. Applies to this group
  // only — nested subgroups resolve their own value through the same chain.

  if (meta) {
    group.label = meta.title ?? group.label;
    group.icon = meta.icon ?? group.icon;
    group.order = meta.order ?? group.order;
    group.collapsed = meta.collapsed ?? group.collapsed;

    if (meta.pages) {
      const rank = new Map(meta.pages.map((key, i) => [key, i]));
      for (const child of group.children) {
        const position = rank.get(child.key);
        if (position !== undefined) {
          child.order = position;
          if (child.kind === "page") {
            child.orderIsAuthored = true;
          }
        }
      }
    }
  }

  for (const child of group.children) {
    if (child.kind === "group") {
      applyFolderMeta(
        child,
        folderMeta,
        sharedMeta,
        metaPrefix,
        sharedMetaPrefix,
      );
    }
  }
};

const sortNodes = (nodes: MutableNode[], collator: Intl.Collator): void => {
  nodes.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return collator.compare(a.label, b.label);
  });

  for (const node of nodes) {
    if (node.kind === "group") {
      sortNodes(node.children, collator);
    }
  }
};

/**
 * Hoist loose pages above groups so they read as their own level's entries
 * rather than a preceding group's trailing children (relative order otherwise
 * preserved). The root level always hoists, in every display mode. A deeper
 * level hoists only when a sibling group renders flat — a flat group is a
 * plain section header, so a loose page sorted after it would visually read
 * as its last child — while `group`/`page` groups are self-delimiting
 * disclosure/drill-in rows, so authored interleaving is kept. Each group's
 * render mode is its own resolved `display` falling back to the global mode,
 * mirroring `toNavNode`.
 */
const hoistPages = (
  nodes: MutableNode[],

  hoist: boolean,
): void => {
  const groups = nodes.filter((node) => node.kind === "group");
  if (hoist) {
    const pages = nodes.filter((node) => node.kind === "page");
    nodes.splice(0, nodes.length, ...pages, ...groups);
  }
  for (const group of groups) {
    hoistPages(group.children, false);
  }
};

const promoteIndexRoutes = (nodes: NavNode[]): NavNode[] =>
  nodes.map((node) => {
    if (node.kind === "page") {
      return node;
    }

    const children = promoteIndexRoutes(node.children);
    const firstChild = children[0];

    if (
      firstChild.kind === "page" &&
      node.path !== undefined &&
      firstChild.route === node.path
    ) {
      return {
        ...node,
        route: firstChild.route,
        children: children.slice(1),
      };
    }

    return {
      ...node,
      children,
    };
  });

/**
 * Build a navigation tree from the supplied pages. buildContentTree owns
 * locale/version selection; page routes already include their mount point.
 */
export const buildNavigation = (
  pages: PageRecord[],
  options: {
    // /** Locale for sorting labels; does not filter the supplied pages. */
    // locale?: string;
    /** Mount point for the navigation root; page routes are already based. */
    basePath?: string;

    /** Metadata keyed by the raw folder path, including any metaPrefix. */
    folderMeta: Map<string, FolderMeta>;
    /** Locale-agnostic defaults; locale metadata overrides individual fields. */
    sharedFolderMeta?: Map<string, FolderMeta>;

    /**
     * Group-meta lookup prefix (empty without i18n): the version dir and/or
     * locale dir, including the default locale, hoisted in front of the
     * group path, e.g. `fr`, `v1.0`, or `v1.0/fr`.
     */
    metaPrefix?: string;
    /**
     * Prefix for shared `meta.$.*` lookups — the version dir inside a
     * snapshot (`v1.0`), since shared meta is locale-agnostic but still
     * version-specific. `""` for the current version.
     */
    sharedMetaPrefix?: string;
    /**
     * Resolve explicit-sidebar references against each page's locale-agnostic
     * `translationKey` instead of its localized `route`. Used under i18n so a
     * single authored sidebar maps onto every locale's pages.
     * Reserved until an explicit sidebar configuration is supported.
     */
    refByLogical?: boolean;
    /**
     * The tree's root route before `basePath` (`"/"`, or the locale prefix
     * under i18n, e.g. `/fr` — tab paths arrive already localized). The tab
     * pointing here spans the whole tree, so it is excluded from tab-section
     * scoping.
     */
    localizedRoot?: string;
    /**
     * Locale-sensitive sidebar entry sorting
     */
    locale?: string;
  },
): Navigation => {
  const basePath = options.basePath ?? "";
  const metaPrefix = pathParts(options.metaPrefix ?? "");
  const sharedMetaPrefix = options.sharedMetaPrefix ?? "";
  const sharedFolderMeta = options.sharedFolderMeta ?? new Map();
  const locale = options.locale;

  const rootRoute = routePath([
    ...pathParts(options.basePath ?? ""),
    ...pathParts(options.localizedRoot ?? "/"),
  ]);

  return {
    sidebar: pages.length
      ? buildSidebar(
          pages,
          options.folderMeta,
          sharedFolderMeta,
          options.metaPrefix ?? "",
          sharedMetaPrefix,
          locale,
        )
      : [],
    root: rootRoute,
  };
};

/** Shared rendering rule; an empty configured locale tree is still selected. */
export function getNavigation(tree: ContentTree, locale?: string): Navigation {
  return locale !== undefined && Object.hasOwn(tree.navigationByLocale, locale)
    ? (tree.navigationByLocale[locale] ?? tree.navigation)
    : tree.navigation;
}

const toNavNode = (node: MutableNode): NavNode => {
  if (node.kind === "page") {
    return {
      badge: node.badge,
      deprecated: node.deprecated || undefined,
      description: node.description,
      icon: node.icon,
      kind: "page",
      label: node.label,
      pageId: node.pageId,
      route: node.route,
    };
  }
  return {
    children: node.children.map((child) => toNavNode(child)),
    collapsed: node.collapsed,
    icon: node.icon,
    kind: "group",
    label: node.label,
    path: node.routePath,
  };
};

const buildSidebar = (
  pages: PageRecord[],
  folderMeta: Map<string, FolderMeta>,
  sharedMeta: Map<string, FolderMeta>,
  metaPrefix: string,
  sharedMetaPrefix: string,
  locale: string = "en",
): NavNode[] => {
  const root = createGroup("", "", "", 0);

  const collator = new Intl.Collator(locale);

  for (const page of pages) {
    // Group by the locale-stripped path so the locale dir is not a nav group.
    const parts = page.navPath.split("/");
    const filename = parts.at(-1) ?? page.navPath;
    const stem = stemOf(filename);
    const dirs = parts.slice(0, -1);

    if (isHidden(page)) {
      continue;
    }

    // const folderParts = [page.locale, ...page.groups];
    // Each group's URL path is the matching prefix of the page's route. navPath
    // is locale-stripped while the route may carry a locale/base prefix, so
    // align the folder segments from the right (the extra leading segments are
    // that prefix). Under such a prefix the path won't match a logical tab path,
    // so tab-scoping simply no-ops — same as the header's active-tab logic.
    // An index page's route IS its folder's route (no page segment to drop),
    // and `(group)` folders contribute no route segment at all.
    const routeSegments = page.route.split("/").filter(Boolean);
    const folderParts = isIndexStem(stem)
      ? routeSegments
      : routeSegments.slice(0, -1);
    const routeDirCount = dirs.filter((dir) => !GROUP_FOLDER.test(dir)).length;
    const offset = Math.max(0, folderParts.length - routeDirCount);

    let parent = root;
    let consumed = offset;

    // build group tree
    // points parent to the pages's direct parent group
    for (const dir of dirs) {
      parent = ensureGroup(parent, dir);

      if (!GROUP_FOLDER.test(dir)) {
        consumed += 1;
      }
      parent.routePath ??= `/${folderParts.slice(0, consumed).join("/")}`;
    }

    const { order, orderIsAuthored } = pageOrder(page, filename);

    parent.children.push({
      badge: page.meta.sidebar.badge,
      description: page.description,
      file: page.sourcePath,
      icon: page.meta.sidebar.icon,
      key: segmentKey(stem),
      kind: "page",
      label: page.meta.sidebar.label ?? page.title,
      order,
      orderIsAuthored,
      pageId: page.id,
      route: page.route,
    });
  }
  applyFolderMeta(root, folderMeta, sharedMeta, metaPrefix, sharedMetaPrefix);
  sortNodes(root.children, collator);
  // hoistPages(root.children, true);

  const sidebar = root.children.map((child) => toNavNode(child));
  return promoteIndexRoutes(sidebar);
};
