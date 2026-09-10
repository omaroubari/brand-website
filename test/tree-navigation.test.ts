import { describe, expect, it, vi } from "vitest";

vi.mock("astro:content", () => ({ getCollection: vi.fn() }));

import { buildContentTree } from "../src/lib/core/tree";
import { getNavigation } from "../src/lib/core/navigation";
import type { Navigation, NavNode, PageRecord } from "../src/lib/types";
import type { FolderMeta, ResolvedI18nConfig } from "../src/lib/core/schema";

function page(
  navPath: string,
  route: string,
  locale = "en",
  version?: string,
): PageRecord {
  return {
    id: `filesystem:${version ?? ""}/${locale}/${navPath}`,
    source: { name: "filesystem", ref: `${locale}/${navPath}` },
    navPath,
    route,
    locale,
    version,
    translationKey: `/${[version, navPath.replace(/\.mdx?$/, "")]
      .filter(Boolean)
      .join("/")}`,
    segments: route.split("/").filter(Boolean),
    groups: navPath.split("/").slice(0, -1),
    title: `${locale}: ${navPath}`,
    contentType: "docs",
    headings: [],
    meta: {
      hidden: false,
      draft: false,
      sidebar: {},
      seo: { noindex: false },
      noindex: false,
    },
  };
}

function links(navigation: Navigation): string[] {
  const walk = (nodes: NavNode[]): string[] =>
    nodes.flatMap((node) => [
      ...(node.route ? [node.route] : []),
      ...(node.kind === "group" ? walk(node.children) : []),
    ]);
  return walk(navigation.sidebar);
}

const folderMeta = new Map<string, FolderMeta>();
const i18n: ResolvedI18nConfig = {
  defaultLocale: "en",
  locales: [
    { code: "ar", label: "العربية", dir: "rtl" },
    { code: "en", label: "English", dir: "ltr" },
    { code: "fr", label: "Française", dir: "ltr" },
  ],
  hideDefaultLocalePrefix: false,
  parser: "dir",
};

describe("current-docs navigation projections", () => {
  it("builds one tree and no locale map when i18n is %s", () => {
    const pages = [
      page("01-start.md", "/start"),
      page("02-guide/setup.md", "/guide/setup", "ar"),
      page("01-start.md", "/v1.0/start", "en", "v1.0"),
    ];
    const tree = buildContentTree(pages, { folderMeta, i18n: undefined });
    expect(tree.navigationByLocale).toEqual({});
    expect(tree.navigation.root).toBe("/");
    expect(links(tree.navigation)).toEqual(["/start", "/guide/setup"]);
    expect(tree.pages).toBe(pages);
    expect(tree.routes.get("/v1.0/start")).toBe(pages[2].id);
    expect(getNavigation(tree, "ar")).toBe(tree.navigation);
  });

  it("builds every configured locale and selects the configured default, regardless of input order", () => {
    const pages = [
      page("guide/start.md", "/ar/guide/start", "ar"),
      page("guide/start.md", "/en/guide/start", "en", ""),
      page("guide/start.md", "/v1.0/ar/guide/start", "ar", "v1.0"),
      page("guide/start.md", "/v1.0/en/guide/start", "en", "v1.0"),
      page("extra.md", "/de/extra", "de"),
    ];
    const tree = buildContentTree(pages, { folderMeta, i18n });
    expect(Object.keys(tree.navigationByLocale)).toEqual(["ar", "en", "fr"]);
    expect(tree.navigation).toBe(tree.navigationByLocale.en);
    expect(links(tree.navigation)).toEqual(["/en/guide/start"]);
    expect(links(tree.navigationByLocale.ar)).toEqual(["/ar/guide/start"]);
    expect(tree.navigationByLocale.fr).toEqual({
      sidebar: [
        {
          children: [
            {
              badge: undefined,
              deprecated: undefined,
              description: undefined,
              icon: undefined,
              kind: "page",
              label: "en: guide/start.md",
              pageId: "filesystem:/en/guide/start.md",
              route: "/fr/guide/start",
            },
          ],
          collapsed: undefined,
          icon: undefined,
          kind: "group",
          label: "Guide",
          path: "/fr/guide",
        },
      ],
      root: "/fr",
    });
    expect(tree.routes.size).toBe(tree.pages.length);
    expect(getNavigation(tree, "ar")).toBe(tree.navigationByLocale.ar);
    expect(getNavigation(tree, "fr")).toBe(tree.navigationByLocale.fr);
    expect(getNavigation(tree, "de")).toBe(tree.navigation);
    expect(getNavigation(tree, "constructor")).toBe(tree.navigation);
    expect(getNavigation(tree)).toBe(tree.navigation);
    const reversed = buildContentTree([...pages].reverse(), {
      folderMeta,
      i18n,
    });
    expect(reversed.navigation).toEqual(tree.navigation);
  });

  it("honors a different default locale and does not substitute another locale for an empty default", () => {
    const pages = [
      page("start.md", "/en/start"),
      page("start.md", "/ar/start", "ar"),
    ];
    const tree = buildContentTree(pages, {
      folderMeta,
      i18n: { ...i18n, defaultLocale: "ar" },
    });
    expect(tree.navigation).toBe(tree.navigationByLocale.ar);
    expect(links(tree.navigation)).toEqual(["/ar/start"]);
    const missing = buildContentTree([pages[1]], { folderMeta, i18n });
    expect(missing.navigation).toEqual({ sidebar: [], root: "/en" });
    expect(links(missing.navigationByLocale.ar)).toEqual(["/ar/start"]);
  });

  it("applies each locale's metadata and mount point without rebasing page routes twice", () => {
    const pages = [
      page("03-logo/mark.md", "/docs/en/logo/mark"),
      page("03-logo/mark.md", "/docs/ar/logo/mark", "ar"),
    ];
    const metadata = new Map<string, FolderMeta>([
      ["en/03-logo", { title: "Logo", icon: "shapes" }],
      ["ar/03-logo", { title: "الشعار", icon: "shapes" }],
    ]);
    const tree = buildContentTree(pages, {
      folderMeta: metadata,
      i18n,
      basePath: "/docs/",
    });
    expect(tree.navigation.root).toBe("/docs/en");
    expect(tree.navigation.sidebar[0].label).toBe("Logo");
    expect(tree.navigationByLocale.ar.root).toBe("/docs/ar");
    expect(tree.navigationByLocale.ar.sidebar[0].label).toBe("الشعار");
    expect(links(tree.navigationByLocale.ar)).toEqual(["/docs/ar/logo/mark"]);
    const unprefixed = buildContentTree([page("start.md", "/docs/start")], {
      folderMeta,
      basePath: "/docs",
      i18n: { ...i18n, hideDefaultLocalePrefix: true },
    });
    expect(unprefixed.navigation.root).toBe("/docs");
  });

  it("keeps hidden pages routable but out of both navigation projections", () => {
    const hidden = page("secret.md", "/en/secret");
    hidden.meta.sidebar.hidden = true;
    const tree = buildContentTree([hidden], { folderMeta, i18n });
    expect(tree.navigation.sidebar).toEqual([]);
    expect(tree.routes.get(hidden.route)).toBe(hidden.id);
  });

  it("flags ambiguous route ownership and preserves the first owner", () => {
    const original = page("start.md", "/start");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const tree = buildContentTree([original, page("other.md", "/start/")], {
      folderMeta,
    });
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ code: "BRANDTREE_DUPLICATE_ROUTE" }),
    );
    expect(tree.pages).toEqual([original]);
    expect(tree.routes.get("/start")).toBe(original.id);
    expect(links(tree.navigation)).toEqual(["/start"]);
  });

  it("builds empty current-docs trees when the input contains only archives", () => {
    const tree = buildContentTree(
      [page("start.md", "/v1.0/en/start", "en", "v1.0")],
      { folderMeta, i18n },
    );
    expect(tree.navigation.sidebar).toEqual([]);
    expect(Object.keys(tree.navigationByLocale)).toEqual(["ar", "en", "fr"]);
  });
});
