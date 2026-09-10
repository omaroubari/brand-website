import { describe, expect, it, vi } from "vitest";
import { buildContentTree } from "../src/lib/core/tree";
import {
  normalizeEntry,
  type NormalizeContext,
  type SourceEntry,
} from "../src/lib/core/entries";
import { resolveFolderMeta } from "../src/lib/core/meta";
import {
  pageMetaSchema,
  type ResolvedI18nConfig,
} from "../src/lib/core/schema";

const i18n: ResolvedI18nConfig = {
  defaultLocale: "en",
  locales: [
    { code: "en", label: "English", dir: "ltr" },
    { code: "fr", label: "Française", dir: "ltr" },
    { code: "ar", label: "العربية", dir: "rtl" },
  ],
  hideDefaultLocalePrefix: false,
  parser: "dir",
};
function entry(
  filePath: string,
  data: Record<string, unknown> = {},
): SourceEntry {
  return {
    ref: filePath,
    data: pageMetaSchema.parse(data),
    body: {
      format: filePath.toLowerCase().endsWith(".mdx") ? "mdx" : "md",
      text: "",
    },
  };
}
const normalizeEntries = (
  entries: readonly SourceEntry[],
  options: NormalizeContext = {},
) => entries.flatMap((entry) => normalizeEntry(entry, options).pages);

describe("normalized content tree", () => {
  it("connects source metadata, localized groups, indexes, routes, and reading order", async () => {
    const entries = [
      entry("en/index.md", { title: "Cover" }),
      entry("en/01-logo/index.md"),
      entry("en/01-logo/02-mark.md"),
      entry("en/01-logo/01-word.md"),
      entry("en/02-about.md"),
      entry("en/03-hidden.md", { sidebar: { hidden: true } }),
      entry("ar/01-logo/index.md"),
      entry("ar/01-logo/02-mark.md"),
      entry("ar/01-logo/01-word.md"),
      entry("v1.0/en/01-logo/index.md"),
    ];
    const pages = normalizeEntries(entries, {
      i18n,
      versionDirs: ["v1.0"],
      basePath: "/brand",
    });
    const { meta, shared } = await resolveFolderMeta(
      [
        {
          root: "src/content/brand-guidelines",
          modules: {
            "01-logo/meta.$.ts": async () => ({
              title: "Shared logo",
              icon: "shapes",
              collapsed: true,
              pages: ["mark", "word"],
            }),
            "en/01-logo/meta.ts": async () => ({
              title: "Logo system",
              pages: ["word", "mark"],
              collapsed: false,
            }),
            "ar/01-logo/meta.ts": async () => async () => ({ title: "الشعار" }),
            "meta.$.ts": async () => ({ pages: ["logo"] }),
          },
        },
      ],
      {
        localeDirs: i18n.locales.map((locale) => locale.code),
        versionDirs: ["v1.0"],
      },
    );
    const tree = buildContentTree(pages, {
      i18n,
      basePath: "/brand",
      folderMeta: meta,
      sharedFolderMeta: shared,
    });
    expect(tree.navigation).toBe(tree.navigationByLocale.en);
    expect(tree.navigation.sidebar.map((node) => node.label)).toEqual([
      "Cover",
      "Logo system",
      "About",
    ]);
    expect(tree.navigation.sidebar[1]).toMatchObject({
      kind: "group",
      route: "/brand/en/logo",
      icon: "shapes",
      collapsed: false,
    });
    expect(tree.navigationByLocale.ar.sidebar[1]).toMatchObject({
      label: "الشعار",
      icon: "shapes",
      collapsed: true,
    });

    expect(tree.pages.filter((page) => !page.fallback)).toHaveLength(
      entries.length,
    );
  });

  it("flags route collisions and maps the route to the first page record", () => {
    const makeTree = (entries: SourceEntry[]) =>
      buildContentTree(normalizeEntries(entries, { i18n }), {
        i18n,
        folderMeta: new Map(),
      });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const tree = makeTree([entry("en/a.md"), entry("en/b.md", { slug: "a" })]);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ code: "BRANDTREE_DUPLICATE_ROUTE" }),
    );
    expect(tree.routes.get("/en/a")).toBe("filesystem:en/a.md");
    warn.mockRestore();
    expect(
      normalizeEntries([entry("en/a.md", { slug: "b" })], { i18n })[0].id,
    ).toBe("filesystem:en/a.md");
  });

  it("publishes one shared source entry at every locale route", () => {
    const pages = normalizeEntries([entry("terms.$.mdx", { title: "Terms" })], {
      i18n,
    });
    const tree = buildContentTree(pages, {
      i18n,
      folderMeta: new Map(),
    });

    expect(new Set(tree.pages.map((page) => page.id))).toEqual(
      new Set(["filesystem:terms.$.mdx"]),
    );
    expect(tree.pages).toHaveLength(i18n.locales.length);
    expect(tree.pages.every((page) => !page.fallback)).toBe(true);

    for (const { code } of i18n.locales) {
      const route = `/${code}/terms`;
      const page = tree.pages.find((candidate) => candidate.route === route);

      expect(page).toBeDefined();
      expect(tree.routes.get(route)).toBe(page?.id);
    }
  });

  it("ignores unknown or duplicate metadata child references", () => {
    const pages = normalizeEntries(
      [entry("en/a/index.md"), entry("en/a/01-one.md")],
      { i18n },
    );
    for (const children of [["one", "01-one"], ["missing"], ["index"]]) {
      expect(() =>
        buildContentTree(pages, {
          i18n,
          folderMeta: new Map([["en/a", { pages: children }]]),
        }),
      ).not.toThrow();
    }
  });

  it("keeps one unlocalized tree and includes development drafts", () => {
    const pages = normalizeEntries([
      entry("02-zulu.md"),
      entry("01-draft.md", { draft: true }),
      entry("Alpha.md"),
    ]);
    const tree = buildContentTree(pages, {
      folderMeta: new Map(),
    });
    expect(tree.navigationByLocale).toEqual({});
  });
});
