import { describe, expect, it } from "vitest";
import { normalizeEntry, type SourceEntry } from "../src/core/entries";
import { buildContentTree } from "../src/core/tree";
import { getContentPagePaths, getCoverPagePaths } from "../src/core/rendering";
import { normalizeBasePath, withComposedBasePath } from "../src/core/paths";
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

describe("public route matrix", () => {
  it.each(scenarios)(
    "projects covers and root/nested content: $mode, basePath '$input'",
    ({ mode, input }) => {
      const basePath = normalizeBasePath(input);
      const i18n = configFor(mode);
      const locales = i18n ? ["en", "ar"] : [""];
      const logical = [
        "index.md",
        "01-start.md",
        "02-logo/index.md",
        "02-logo/01-mark.md",
        "02-logo/02-usage/01-clearspace.md",
      ];
      const pages = locales.flatMap((locale) =>
        logical.flatMap(
          (file) =>
            normalizeEntry(entry(refFor(file, locale, i18n)), {
              basePath,
              i18n,
            }).pages,
        ),
      );
      const tree = buildContentTree(pages, {
        basePath,
        i18n,
        folderMeta: new Map(),
      });
      const prefixes = locales.map(
        (locale) =>
          `${basePath}${locale && !(i18n?.hideDefaultLocalePrefix && locale === "en") ? `/${locale}` : ""}`,
      );
      const expected = prefixes.flatMap((prefix) =>
        ["start", "logo", "logo/mark", "logo/usage/clearspace"].map(
          (slug) => `${prefix}/${slug}`,
        ),
      );
      const content = getContentPagePaths(tree);
      expect(content.map(({ params }) => `/${params.slug}`)).toEqual(expected);
      for (const { props } of content) {
        expect(tree.routes.get(props.page.route)).toBe(props.page.id);
        expect(props.navigation.root).toBe(
          prefixes[locales.indexOf(props.page.locale)] || "/",
        );
      }
      const covers = getCoverPagePaths(tree, { basePath: input, i18n });
      const coverRoutes = covers.map(({ params }) =>
        params.base ? `/${params.base}` : "/",
      );
      expect(coverRoutes).toEqual(
        i18n && !i18n.hideDefaultLocalePrefix
          ? [basePath || "/", ...prefixes]
          : prefixes.map((prefix) => prefix || "/"),
      );
      expect(covers.map(({ props }) => props.redirect)).toEqual(
        coverRoutes.map((_, index) =>
          Boolean(i18n && !i18n.hideDefaultLocalePrefix && index === 0),
        ),
      );
      expect(new Set([...coverRoutes, ...expected]).size).toBe(
        covers.length + content.length,
      );
      // Deployment base is a separate URL layer; it never enters static params.
      for (const route of [...coverRoutes, ...expected]) {
        expect(withComposedBasePath("/hosting", basePath, route)).toBe(
          `/hosting${route === "/" ? "" : route}`,
        );
      }
    },
  );

  it.each(scenarios.filter(({ mode }) => mode !== "single"))(
    "respects disabled fallback and shared nested sources: $mode, '$input'",
    ({ mode, input }) => {
      const basePath = normalizeBasePath(input);
      const i18n = { ...configFor(mode)!, fallbackLocale: null };
      const pages = [
        entry(refFor("01-logo/01-mark.md", "en", i18n)),
        entry("02-guides/01-shared.$.md"),
      ].flatMap((source) => normalizeEntry(source, { basePath, i18n }).pages);
      const tree = buildContentTree(pages, {
        basePath,
        i18n,
        folderMeta: new Map(),
      });
      const paths = getContentPagePaths(tree);
      expect(paths).toHaveLength(3);
      expect(
        paths
          .filter(({ props }) => props.page.locale === "ar")
          .map(({ params }) => params.slug),
      ).toEqual([`${basePath}/ar/guides/shared`.slice(1)]);
      expect(tree.pages.every((page) => !page.fallback)).toBe(true);
    },
  );

  it.each(scenarios)(
    "retains source namespaces and archive roots: $mode, '$input'",
    ({ mode, input }) => {
      const basePath = normalizeBasePath(input);
      const i18n = configFor(mode);
      const locale = i18n ? "ar" : "";
      const options = {
        basePath,
        i18n,
        source: { name: "manual", prefix: "reference" },
        versionDirs: ["v1.0"],
      };
      const pages = ["index.md", "01-api/01-auth.md"].flatMap(
        (file) =>
          normalizeEntry(entry(`v1.0/${refFor(file, locale, i18n)}`), options)
            .pages,
      );
      const tree = buildContentTree(pages, {
        basePath,
        i18n,
        folderMeta: new Map(),
      });
      const prefix = `${basePath}${i18n ? "/ar" : ""}/v1.0/reference`;
      expect(
        getContentPagePaths(tree).map(({ params }) => `/${params.slug}`),
      ).toEqual([prefix, `${prefix}/api/auth`]);
      expect(tree.navigation.sidebar).toEqual([]);
      expect(pages.map((page) => page.translationKey)).toEqual([
        "/v1.0/reference",
        "/v1.0/reference/api/auth",
      ]);
    },
  );

  it("supports a non-English default and canonical BCP 47 casing", () => {
    const i18n: ResolvedI18nConfig = {
      defaultLocale: "ar",
      hideDefaultLocalePrefix: true,
      parser: "dir",
      locales: [
        { code: "ar", label: "Arabic", dir: "rtl" },
        { code: "pt-BR", label: "Portuguese", dir: "ltr" },
      ],
    };
    const pages = ["ar/start.md", "pt-br/start.md"].flatMap(
      (ref) => normalizeEntry(entry(ref), { i18n, basePath: "/docs" }).pages,
    );
    const tree = buildContentTree(pages, {
      i18n,
      basePath: "/docs",
      folderMeta: new Map(),
    });
    expect(getContentPagePaths(tree).map(({ params }) => params.slug)).toEqual([
      "docs/start",
      "docs/pt-BR/start",
    ]);
    expect(
      getCoverPagePaths(tree, { i18n, basePath: "/docs" }).map(
        ({ params, props }) => [`/${params.base}`, props.locale],
      ),
    ).toEqual([
      ["/docs", "ar"],
      ["/docs/pt-BR", "pt-BR"],
    ]);
  });

  it("keeps covers unique when basePath equals a configured locale prefix", () => {
    const config = { basePath: "/en", i18n: configFor("dir-prefixed") };
    const tree = buildContentTree([], { ...config, folderMeta: new Map() });
    const covers = getCoverPagePaths(tree, config);
    expect(covers.map(({ params }) => `/${params.base}`)).toEqual([
      "/en",
      "/en/en",
      "/en/ar",
    ]);
  });
});
