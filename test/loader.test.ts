import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentEntry, SourceEntry } from "../src/lib/core/entries";
import { pageMetaSchema } from "../src/lib/core/schema";
import { getContentTree } from "../src/lib/core/tree";
import { normalizeSourceEntries } from "../src/lib/core/loader";

const collection = vi.hoisted(() => ({ entries: [] as ContentEntry[] }));

vi.mock("astro:content", () => ({
  getCollection: vi.fn(
    async (_name: string, filter: (entry: ContentEntry) => boolean) =>
      collection.entries.filter(filter),
  ),
}));

function entry(
  filePath: string,
  data: Record<string, unknown> = {},
): ContentEntry {
  return {
    id: filePath,
    collection: "sections",
    filePath: `src/content/sections/${filePath}`,
    data: pageMetaSchema.parse(data),
  };
}
beforeEach(() => {
  collection.entries = [];
  vi.stubEnv("DEV", false);
});
afterEach(() => vi.unstubAllEnvs());

describe("normalizeSourceEntries", () => {
  it("flattens normalized pages and forwards source and route context", () => {
    const entries: SourceEntry[] = [
      {
        ref: "en/01-start.mdx",
        data: { title: "Start" },
        body: { format: "mdx", text: "# Start" },
      },
      {
        ref: "ar/01-start.mdx",
        data: { title: "ابدأ" },
        body: { format: "mdx", text: "# ابدأ" },
      },
    ];
    const result = normalizeSourceEntries(
      {
        entries,
        source: { name: "manual", root: "/content", prefix: "guides" },
      },
      {
        basePath: "",
        i18n: {
          defaultLocale: "en",
          locales: [
            { code: "en", label: "English", dir: "ltr" },
            { code: "ar", label: "العربية", dir: "rtl" },
          ],
          hideDefaultLocalePrefix: false,
          parser: "dir",
        },
      },
    );

    expect(result.pages.map((page) => page.route)).toEqual([
      "/en/guides/start",
      "/ar/guides/start",
    ]);
    expect(result.pages.map((page) => page.id)).toEqual([
      "manual:en/01-start.mdx",
      "manual:ar/01-start.mdx",
    ]);
  });
});

describe("getContentTree Astro boundary", () => {
  it("loads real bundled folder metadata and preserves Astro rendering identity", async () => {
    collection.entries = ["en", "ar"].flatMap((locale) => [
      entry(`${locale}/03-logo/index.mdx`),
      entry(`${locale}/03-logo/03-usage-rules.mdx`),
      entry(`${locale}/03-logo/02-brandmark.mdx`),
      entry(`${locale}/03-logo/01-logotype.mdx`),
    ]);
    const tree = await getContentTree();
    expect(tree.navigation).toBe(tree.navigationByLocale.en);
    expect(tree.navigation.sidebar[0]).toMatchObject({
      kind: "group",
      label: "Logo",
      route: "/en/logo",
      icon: "shapes",
    });
    expect(tree.navigationByLocale.ar.sidebar[0].label).toBe("الشعار");
    expect(tree.navigationByLocale.fr).toBeUndefined();

    expect(tree.pages[0]).toMatchObject({
      collection: "sections",
      entryId: "en/03-logo/index.mdx",
      id: "filesystem:en/03-logo/index.mdx",
    });
  });

  it.each([false, true])(
    "filters drafts only at the collection boundary (DEV=%s)",
    async (dev) => {
      vi.stubEnv("DEV", dev);
      collection.entries = [
        entry("en/01-public.md"),
        entry("en/02-draft.md", { draft: true }),
        entry("en/03-hidden.md", { hidden: true }),
      ];
      const tree = await getContentTree();
      expect(tree.pages.filter((page) => !page.fallback)).toHaveLength(
        dev ? 3 : 2,
      );

      expect(tree.routes.has("/en/hidden")).toBe(true);
      expect(tree.routes.has("/en/draft")).toBe(dev);
    },
  );

  it("takes the base from Astro and locale behavior from site configuration", async () => {
    collection.entries = [entry("en/start.md"), entry("ar/start.md")];
    const tree = await getContentTree();
    expect(tree.navigation).toBe(tree.navigationByLocale.en);
    expect(tree.navigation.root).toBe("/en");
  });

  it("retains archives in routes without projecting them into current navigation", async () => {
    collection.entries = [entry("en/start.md"), entry("v1.0/ar/start.md")];
    const tree = await getContentTree({ versionDirs: ["v1.0"] });
    expect(tree.routes.has("/ar/v1.0/start")).toBe(true);
    expect(tree.navigationByLocale.ar.sidebar).toEqual([
      {
        badge: undefined,
        deprecated: undefined,
        description: undefined,
        icon: undefined,
        kind: "page",
        label: "Start",
        pageId: "filesystem:en/start.md",
        route: "/ar/start",
      },
    ]);
  });
});
