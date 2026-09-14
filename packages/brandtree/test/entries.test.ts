import { describe, expect, it } from "vitest";
import {
  normalizeEntry,
  toSourceEntry,
  type ContentEntry,
  type NormalizeContext,
  type SourceEntry,
} from "../src/core/entries";
import { humanizePageName, normalizePageSlug } from "../src/core/paths";
import { pageMetaSchema, type ResolvedI18nConfig } from "../src/core/schema";

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

const sourceEntry = (
  ref: string,
  data: Record<string, unknown> = {},
): SourceEntry => ({
  ref,
  data,
  body: {
    format: ref.toLowerCase().endsWith(".mdx") ? "mdx" : "md",
    text: "",
  },
});

const pagesFor = (entry: SourceEntry, options: NormalizeContext = {}) =>
  normalizeEntry(entry, options).pages;

describe("normalizeEntry", () => {
  it("normalizes a source entry without requiring Astro rendering metadata", () => {
    const input: SourceEntry = {
      ref: "en/03-logo/02-usage.mdx",
      data: { title: "Usage" },
      body: { format: "mdx", text: "## Clear space" },
      sourcePath: "/workspace/content/en/03-logo/02-usage.mdx",
      lastModified: "2026-09-01T00:00:00.000Z",
    };

    expect(pagesFor(input, { i18n, basePath: "/docs" })).toEqual([
      expect.objectContaining({
        id: "filesystem:en/03-logo/02-usage.mdx",
        source: { name: "filesystem", ref: "en/03-logo/02-usage.mdx" },
        sourcePath: input.sourcePath,
        lastModified: input.lastModified,
        route: "/docs/en/logo/usage",
        headings: [],
      }),
    ]);
  });

  it("uses an adapter slug as the logical route input", () => {
    const [page] = pagesFor(
      { ...sourceEntry("cms-entry-42"), slug: "guides/getting-started" },
      { i18n, basePath: "/docs" },
    );

    expect(page).toMatchObject({
      route: "/docs/en/guides/getting-started",
      translationKey: "/guides/getting-started",
      versionKey: "/guides/getting-started",
      segments: ["guides", "getting-started"],
      navPath: "cms-entry-42",
    });
  });

  it("resolves indexes, safe frontmatter slugs, and translations", () => {
    const options = { i18n: { ...i18n, hideDefaultLocalePrefix: true } };
    const pages = [
      sourceEntry("en/01-logo/00-index.MD"),
      sourceEntry("en/index.mdx"),
      sourceEntry("en/01-logo/02-mark.md", { slug: "brandmark" }),
      sourceEntry("ar/01-logo/02-mark.md", { slug: "brandmark" }),
    ].flatMap((entry) => pagesFor(entry, options));

    expect(pages.map((page) => page.route)).toEqual([
      "/logo",
      "/",
      "/logo/brandmark",
      "/ar/logo/brandmark",
    ]);
    expect(pages[2].translationKey).toBe(pages[3].translationKey);
    expect(pages[2].id).not.toBe(pages[3].id);
  });

  it("does not infer localization when i18n is absent", () => {
    const [page] = pagesFor(sourceEntry("en/01-start.md"));
    expect(page).toMatchObject({
      locale: "",
      route: "/en/start",
      navPath: "en/01-start.md",
      translationKey: "/en/start",
    });
  });

  it("applies source prefixes and base paths at their respective layers", () => {
    const [page] = pagesFor(sourceEntry("ar/03-logo/index.md"), {
      i18n,
      source: { name: "manual", root: "/work/manual", prefix: "guides" },
      basePath: "/brand",
    });
    expect(page).toMatchObject({
      id: "manual:ar/03-logo/index.md",
      route: "/brand/ar/guides/logo",
      locale: "ar",
      translationKey: "/guides/logo",
      navPath: "guides/03-logo/index.md",
      segments: ["guides", "logo"],
    });
  });

  it("retains metadata and maps top-level visibility shorthands", () => {
    const [page] = pagesFor(
      sourceEntry("en/draft.md", {
        title: "A title",
        description: "Summary",
        draft: true,
        hidden: true,
        noindex: true,
        sidebar: { label: "Label", badge: "New" },
      }),
      { i18n },
    );

    expect(page).toMatchObject({
      title: "A title",
      description: "Summary",
      headings: [],
      meta: {
        draft: true,
        hidden: true,
        sidebar: { label: "Label", badge: "New", hidden: true },
        seo: { noindex: true },
      },
    });
  });

  it.each(["a/b", "../a", "", "with space", "a?b", "a#b", "%2f"])(
    "rejects unsafe frontmatter slug %s",
    (slug) => {
      expect(() =>
        pagesFor(sourceEntry("en/a.md", { slug }), { i18n }),
      ).toThrow(/Unsafe slug/);
    },
  );

  it("rejects index overrides and unsafe provenance", () => {
    expect(() =>
      pagesFor(sourceEntry("en/index.md", { slug: "cover" }), { i18n }),
    ).toThrow(/Unsafe slug/);
    expect(() => pagesFor(sourceEntry("../a.md"))).toThrow(
      /Unsafe content source/,
    );
    expect(() => pagesFor(sourceEntry("/elsewhere/a.md"))).toThrow(
      /Unsafe content source/,
    );
  });
});

describe("toSourceEntry", () => {
  it("uses the collection id as the source-local ref and copies frontmatter", () => {
    const contentEntry: ContentEntry = {
      id: "en/01-logo.mdx",
      collection: "brandGuidelines",
      filePath: "/workspace/src/content/brand-guidelines/en/01-logo.mdx",
      data: pageMetaSchema.parse({ title: "Logo" }),
      body: "# Logo",
    };

    const result = toSourceEntry(contentEntry);
    expect(result).toEqual({
      ref: "en/01-logo.mdx",
      data: contentEntry.data,
      body: { format: "mdx", text: "# Logo" },
    });
    expect(result.data).not.toBe(contentEntry.data);
  });

  it("uses Markdown and an empty body when loader data is absent", () => {
    const contentEntry: ContentEntry = {
      id: "guide.md",
      collection: "brandGuidelines",
      data: pageMetaSchema.parse({}),
    };
    expect(toSourceEntry(contentEntry)).toEqual({
      ref: "guide.md",
      data: contentEntry.data,
      body: { format: "md", text: "" },
    });
  });
});

it("humanizes numeric filename prefixes", () => {
  expect(normalizePageSlug("007-tone_and-voice")).toBe("tone-and-voice");
  expect(humanizePageName("007-tone_and-voice")).toBe("Tone And Voice");
});
