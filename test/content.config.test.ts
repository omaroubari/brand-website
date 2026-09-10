import { expect, it, vi } from "vitest";
import { toSourceEntry, type ContentEntry } from "../src/lib/core/entries";
import { normalizeSourceEntries } from "../src/lib/core/loader";
import { buildContentTree } from "../src/lib/core/tree";
import { pageMetaSchema } from "../src/lib/core/schema";

const loader = vi.hoisted(() => ({
  generateId: undefined as undefined | ((options: { entry: string }) => string),
}));
vi.mock("astro:content", () => ({
  defineCollection: (definition: unknown) => definition,
}));
vi.mock("astro:config/server", () => ({ base: "/" }));
vi.mock("astro/loaders", () => ({
  glob: (options: { generateId: typeof loader.generateId }) => {
    loader.generateId = options.generateId;
    return options;
  },
}));
import "../src/content.config";

it("preserves distinct loader IDs until normalized route collisions can be reported", () => {
  const files = ["en/01-page.md", "en/02-page.md", "en/01-page.mdx"];
  const ids = files.map((entry) => loader.generateId!({ entry }));
  expect(new Set(ids).size).toBe(files.length);
  const entries: ContentEntry[] = files.map((filePath, index) => ({
    collection: "brandGuidelines",
    id: ids[index]!,
    filePath,
    data: pageMetaSchema.parse({}),
  }));
  const { pages } = normalizeSourceEntries(
    {
      entries: entries.map(toSourceEntry),
      source: { name: "filesystem", root: "src/content/brand-guidelines" },
    },
    {
      i18n: {
        defaultLocale: "en",
        locales: [{ code: "en", label: "English", dir: "ltr" }],
        hideDefaultLocalePrefix: false,
        parser: "dir",
      },
    },
  );
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  buildContentTree(pages, { folderMeta: new Map() });
  expect(warn).toHaveBeenCalledWith(
    expect.objectContaining({ code: "BRANDTREE_DUPLICATE_ROUTE" }),
  );
  warn.mockRestore();
});
