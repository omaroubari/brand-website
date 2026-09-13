import { describe, expect, it } from "vitest";
import {
  normalizeEntry,
  type NormalizeContext,
  type SourceEntry,
} from "../src/core/entries";
import { pageMetaSchema, type ResolvedI18nConfig } from "../src/core/schema";
import { buildContentTree } from "../src/core/tree";
import { getContentPagePaths } from "../src/core/rendering";

const i18n: ResolvedI18nConfig = {
  defaultLocale: "en",
  locales: [
    { code: "en", label: "English", dir: "ltr" },
    { code: "ar", label: "العربية", dir: "rtl" },
    { code: "fr", label: "Français", dir: "ltr" },
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

describe("content rendering projections", () => {
  it("materializes fallback pages as renderable localized routes", () => {
    const source = normalizeEntries([entry("en/guide.md")], { i18n })[0]!;
    const tree = buildContentTree([source], {
      i18n,
      folderMeta: new Map(),
    });

    expect(tree.pages.map((page) => page.route)).toEqual([
      "/en/guide",
      "/ar/guide",
      "/fr/guide",
    ]);
    expect(tree.routes.has("/ar/guide")).toBe(true);
    expect(tree.routes.has("/fr/guide")).toBe(true);

    const fallbackPath = getContentPagePaths(tree).find(
      ({ params }) => params.slug === "ar/guide",
    );
    expect(fallbackPath?.props.page).toMatchObject({
      fallback: true,
      locale: "ar",
      source: source.source,
      translationKey: source.translationKey,
    });
  });

  it("emits each final route once, retaining nested indexes, hidden pages, and archives", () => {
    const pages = normalizeEntries(
      [
        entry("en/index.md"),
        entry("en/03-logo/index.md"),
        entry("en/03-logo/01-mark.md"),
        entry("ar/03-logo/index.md"),
        entry("ar/03-logo/01-mark.md"),
        entry("ar/03-logo/02-secret.md", { hidden: true }),
        entry("v1.0/ar/03-logo/index.md"),
      ],
      { i18n, basePath: "/brand", versionDirs: ["v1.0"] },
    );
    const tree = buildContentTree(pages, {
      i18n,
      basePath: "/brand",
      folderMeta: new Map(),
    });
    const paths = getContentPagePaths(tree);
    expect(paths.map(({ params }) => params.slug)).toEqual([
      "brand/en/logo",
      "brand/en/logo/mark",
      "brand/ar/logo",
      "brand/ar/logo/mark",
      "brand/ar/logo/secret",
      "brand/ar/v1.0/logo",
      "brand/fr/logo",
      "brand/fr/logo/mark",
    ]);
    expect(paths[2]!.props.page.locale).toBe("ar");
    expect(paths[2]!.props.navigation).toBe(tree.navigationByLocale.ar);
    expect(paths[2]!.props).toEqual({
      page: pages[3],
      navigation: tree.navigationByLocale.ar,
    });
  });

  it("preserves resolved paths without localization or a default-locale prefix", () => {
    const unlocalized = buildContentTree(
      normalizeEntries([entry("guide.md")]),
      { folderMeta: new Map() },
    );
    expect(getContentPagePaths(unlocalized)[0]!.params).toEqual({
      slug: "guide",
    });
    const config = { ...i18n, hideDefaultLocalePrefix: true };
    const tree = buildContentTree(
      normalizeEntries([entry("en/guide.md"), entry("ar/guide.md")], {
        i18n: config,
      }),
      { i18n: config, folderMeta: new Map() },
    );
    expect(getContentPagePaths(tree).map(({ params }) => params.slug)).toEqual([
      "guide",
      "ar/guide",
      "fr/guide",
    ]);
  });

  it("keeps an empty locale navigation instead of replacing it with the default", () => {
    const page = normalizeEntries([entry("fr/secret.md", { hidden: true })], {
      i18n,
    })[0]!;
    const tree = buildContentTree([page], { i18n, folderMeta: new Map() });
    expect(getContentPagePaths(tree)[0]!.props.navigation).toBe(
      tree.navigationByLocale.fr,
    );
    expect(getContentPagePaths(tree)[0]!.props.navigation.sidebar).toEqual([]);
  });
});
