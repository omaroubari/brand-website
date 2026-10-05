import { describe, expect, it } from "vitest";
import { normalizeEntry, type SourceEntry } from "../src/core/entries";
import { buildContentTree } from "../src/core/tree";
import { getContentPagePaths } from "../src/core/rendering";
import { normalizeBasePath, withBasePath } from "../src/core/paths";
import type { ResolvedI18nConfig } from "../src/core/schema";

const modes = [
  "single",
  "dir-hidden",
  "dir-prefixed",
  "dot-hidden",
  "dot-prefixed",
];
const scenarios = modes.flatMap((mode) =>
  ["", "/", "/brand", "/brand/guide", " //brand///guide/ "].map((input) => ({
    mode,
    input,
  })),
);
const entry = (ref: string): SourceEntry => ({
  ref,
  data: {},
  body: { format: "md", text: "# Page" },
});
const configFor = (mode: string): ResolvedI18nConfig | undefined =>
  mode === "single"
    ? undefined
    : {
        defaultLocale: "en",
        parser: mode.startsWith("dot") ? "dot" : "dir",
        hideDefaultLocalePrefix: mode.endsWith("hidden"),
        locales: [
          { code: "en", label: "English", dir: "ltr" },
          { code: "ar", label: "Arabic", dir: "rtl" },
        ],
      };
const refFor = (logical: string, locale: string, i18n?: ResolvedI18nConfig) =>
  !i18n
    ? logical
    : i18n.parser === "dir"
      ? `${locale}/${logical}`
      : logical.replace(/\.md$/, `.${locale}.md`);

describe("route mounting and translation identity", () => {
  it.each(scenarios.filter(({ mode }) => mode !== "single"))(
    "matches locale-specific slugs without fallback duplicates: $mode, '$input'",
    ({ mode, input }) => {
      const i18n = configFor(mode)!;
      const basePath = normalizeBasePath(input);
      const pages = [
        { ...entry(refFor("start.md", "en", i18n)), data: { slug: "welcome" } },
        { ...entry(refFor("start.md", "ar", i18n)), data: { slug: "bidaya" } },
      ].flatMap((source) => normalizeEntry(source, { i18n, basePath }).pages);
      const tree = buildContentTree(pages, {
        i18n,
        basePath,
        folderMeta: new Map(),
      });
      expect(
        getContentPagePaths(tree).map(({ params }) => params.slug),
      ).toEqual([
        `${basePath}${i18n.hideDefaultLocalePrefix ? "" : "/en"}/welcome`.slice(
          1,
        ),
        `${basePath}/ar/bidaya`.slice(1),
      ]);
      expect(pages.map((page) => page.translationKey)).toEqual([
        "/start",
        "/start",
      ]);
      expect(tree.pages.every((page) => !page.fallback)).toBe(true);
      // Switching resolves the real destination using the shared identity.
      expect(
        tree.pages.find(
          (page) =>
            page.locale === "ar" &&
            page.translationKey === pages[0]!.translationKey,
        )?.route,
      ).toBe(`${basePath}/ar/bidaya`);
    },
  );

  it.each(["dir-prefixed", "dot-hidden"])(
    "preserves overridden fallback URLs and archive identity: %s",
    (mode) => {
      const i18n = configFor(mode)!;
      const options = {
        i18n,
        basePath: "/docs",
        source: { name: "manual", prefix: "reference" },
        versionDirs: ["v1.0"],
      };
      const pages = ["", "v1.0/"].flatMap(
        (version) =>
          normalizeEntry(
            {
              ...entry(`${version}${refFor("guides/start.md", "en", i18n)}`),
              data: { slug: "welcome" },
            },
            options,
          ).pages,
      );
      const tree = buildContentTree(pages, {
        i18n,
        basePath: "/docs",
        folderMeta: new Map(),
      });
      expect(
        tree.pages
          .filter((page) => page.locale === "ar")
          .map((page) => [page.route, page.translationKey, page.fallback]),
      ).toEqual([
        ["/docs/ar/reference/guides/welcome", "/reference/guides/start", true],
        [
          "/docs/ar/v1.0/reference/guides/welcome",
          "/v1.0/reference/guides/start",
          true,
        ],
      ]);
    },
  );

  it("mounts a page whose logical route already starts with basePath", () => {
    const pages = normalizeEntry(entry("brand/guide.md"), {
      basePath: "/brand",
    }).pages;
    expect(pages[0]!.route).toBe("/brand/brand/guide");
  });

  it.each(
    modes.flatMap((mode) =>
      ["/brand", "/brand/guide"].map((basePath) => ({ mode, basePath })),
    ),
  )(
    "retains overlapping content segments and nested indexes: $mode, '$basePath'",
    ({ mode, basePath }) => {
      const i18n = configFor(mode);
      const logical = basePath.slice(1);
      const pages = ["index.md", "start.md"].flatMap(
        (file) =>
          normalizeEntry(entry(refFor(`${logical}/${file}`, "en", i18n)), {
            basePath,
            i18n,
          }).pages,
      );
      const tree = buildContentTree(pages, {
        basePath,
        i18n,
        folderMeta: new Map(),
      });
      const locales = i18n ? ["en", "ar"] : [""];
      const expected = locales.flatMap((locale) => {
        const prefix = `${basePath}${locale && !(i18n?.hideDefaultLocalePrefix && locale === "en") ? `/${locale}` : ""}/${logical}`;
        return [prefix, `${prefix}/start`];
      });
      expect(
        getContentPagePaths(tree).map(({ params }) => `/${params.slug}`),
      ).toEqual(expected);
      for (const route of expected) expect(tree.routes.has(route)).toBe(true);
      expect(withBasePath(basePath, `${basePath}/start`)).toBe(
        `${basePath}/start`,
      );
    },
  );

  it("retains an overlapping locale segment when constructing fallback content", () => {
    const i18n = configFor("dir-prefixed")!;
    const pages = normalizeEntry(entry("en/start.md"), {
      basePath: "/ar",
      i18n,
    }).pages;
    const tree = buildContentTree(pages, {
      basePath: "/ar",
      i18n,
      folderMeta: new Map(),
    });
    expect(tree.pages.find((page) => page.locale === "ar")).toMatchObject({
      route: "/ar/ar/start",
      fallback: true,
    });
    expect(getContentPagePaths(tree).map(({ params }) => params.slug)).toEqual([
      "ar/en/start",
      "ar/ar/start",
    ]);
  });
});
