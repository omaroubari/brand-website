import { describe, expect, it } from "vitest";
import {
  resolveFolderMeta,
  type FolderMetaModules,
} from "../src/lib/core/meta";

const root = "src/content/brand-guidelines";

describe("folder metadata resolution", () => {
  it("resolves plain defaults and synchronous/asynchronous factories from Vite's module map", async () => {
    const result = await resolveFolderMeta(
      [
        {
          root,
          modules: {
            "meta.ts": async () => ({ title: "Root" }),
            "en/03-logo/meta.js": async () => () => ({
              title: "Logo",
              pages: ["mark"],
            }),
            "ar/03-logo/meta.mjs": async () => async () => ({
              title: "الشعار",
              collapsed: true,
            }),
            "03-logo/meta.$.ts": async () => async () => ({
              icon: "shapes",
              order: 3,
            }),
            "ignored.ts": async () => {
              throw new Error("not metadata");
            },
          },
        },
      ],
      { localeDirs: ["en", "ar"] },
    );
    expect([...result.meta]).toEqual([
      ["ar/03-logo", { title: "الشعار", collapsed: true }],
      ["en/03-logo", { title: "Logo", pages: ["mark"] }],
      ["", { title: "Root" }],
    ]);
    expect([...result.shared]).toEqual([
      ["03-logo", { icon: "shapes", order: 3 }],
    ]);
  });

  it("hoists version and locale before source prefixes, preserving raw folder names", async () => {
    const source = {
      root,
      prefix: "/docs/",
      modules: {
        "meta.$.js": async () => ({ title: "Shared root" }),
        "fr/meta.ts": async () => ({ title: "French root" }),
        "v1.0/fr/03-logo/meta.ts": async () => ({ title: "Old logo" }),
        "v1.0/03-logo/meta.$.mjs": async () => ({ icon: "book-open" }),
      },
    };
    const result = await resolveFolderMeta([source], {
      localeDirs: ["fr"],
      versionDirs: ["v1.0"],
    });
    expect([...result.meta.keys()]).toEqual([
      "fr/docs",
      "v1.0/fr/docs/03-logo",
    ]);
    expect([...result.shared.keys()]).toEqual(["docs", "v1.0/docs/03-logo"]);
    expect((await resolveFolderMeta([source])).meta.has("docs/fr")).toBe(true);
  });

  it("normalizes module-path separators", async () => {
    const result = await resolveFolderMeta(
      [
        {
          root,
          prefix: "docs",
          modules: {
            "fr\\03-logo\\meta.ts": async () => ({ title: "Logo" }),
            "03-logo/meta.$.js": async () => ({ icon: "shapes" }),
          },
        },
      ],
      { localeDirs: ["fr"] },
    );
    expect(result.meta.get("fr/docs/03-logo")).toEqual({ title: "Logo" });
    expect(result.shared.get("docs/03-logo")).toEqual({ icon: "shapes" });
  });

  it.each([
    ["unknown field", async () => ({ typo: "unknown" })],
    ["unknown icon", async () => ({ icon: "unknown-icon" })],
    ["invalid factory icon", async () => async () => ({ icon: " " })],
    ["invalid factory result", async () => () => ({ order: "first" })],
    ["null async result", async () => async () => null],
    ["missing default export", async () => undefined],
    [
      "module failure",
      async () => {
        throw new Error("module failed");
      },
    ],
    [
      "factory failure",
      async () => async () => {
        throw new Error("factory failed");
      },
    ],
  ] satisfies Array<[string, FolderMetaModules[string]]>)(
    "reports the source path for %s",
    async (_label, load) => {
      await expect(
        resolveFolderMeta([{ root, modules: { "03-logo/meta.ts": load } }]),
      ).rejects.toThrow("src/content/brand-guidelines/03-logo/meta.ts");
    },
  );

  it("rejects duplicate keys across extensions and sources", async () => {
    await expect(
      resolveFolderMeta([
        {
          root,
          modules: {
            "meta.ts": async () => ({}),
            "meta.js": async () => ({}),
          },
        },
      ]),
    ).rejects.toThrow(/Duplicate folder metadata/);
    const first = { root: "first", modules: { "meta.ts": async () => ({}) } };
    const second = { root: "second", modules: { "meta.ts": async () => ({}) } };
    await expect(resolveFolderMeta([first, second])).rejects.toThrow(
      /Duplicate folder metadata/,
    );
    expect(
      (
        await resolveFolderMeta([
          { ...first, prefix: "a" },
          { ...second, prefix: "b" },
        ])
      ).meta.size,
    ).toBe(2);
  });

  it("rejects ambiguous shared metadata inside a locale directory", async () => {
    await expect(
      resolveFolderMeta(
        [
          {
            root,
            modules: {
              "fr/meta.$.ts": async () => ({}),
            },
          },
        ],
        { localeDirs: ["fr"] },
      ),
    ).rejects.toThrow(/outside locale directories/);
  });

  it("rejects module paths that escape the source", async () => {
    await expect(
      resolveFolderMeta([
        {
          root,
          modules: {
            "../meta.ts": async () => ({}),
          },
        },
      ]),
    ).rejects.toThrow(/Unsafe folder metadata path/);
  });

  it("returns empty maps when Vite discovers no metadata", async () => {
    expect(await resolveFolderMeta([{ root, modules: {} }])).toEqual({
      meta: new Map(),
      shared: new Map(),
    });
  });
});
