import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { discoverFolderMeta } from "../src/core/meta";

const directories: string[] = [];

const makeSource = async (files: Record<string, string>) => {
  const root = await mkdtemp(join(tmpdir(), "brandtree-meta-"));
  directories.push(root);
  await Promise.all(
    Object.entries(files).map(async ([filename, contents]) => {
      const file = join(root, filename);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, contents);
    }),
  );
  return { root };
};

afterAll(async () => {
  await Promise.all(
    directories.map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("folder metadata discovery", () => {
  it("loads plain defaults and synchronous/asynchronous factories from disk", async () => {
    const source = await makeSource({
      "meta.ts": 'export default { title: "Root" };',
      "en/03-logo/meta.js":
        'export default () => ({ title: "Logo", pages: ["mark"] });',
      "ar/03-logo/meta.mjs":
        'export default async () => ({ title: "الشعار", collapsed: true });',
      "03-logo/meta.$.ts":
        'export default async () => ({ icon: "shapes", order: 3 });',
      "ignored.ts": 'throw new Error("not metadata");',
    });
    const result = await discoverFolderMeta([source], {
      localeDirs: ["en", "ar"],
    });
    expect(result.meta).toEqual(
      new Map([
        ["ar/03-logo", { title: "الشعار", collapsed: true }],
        ["en/03-logo", { title: "Logo", pages: ["mark"] }],
        ["", { title: "Root" }],
      ]),
    );
    expect(result.shared).toEqual(
      new Map([["03-logo", { icon: "shapes", order: 3 }]]),
    );
    expect(result.diagnostics).toEqual([]);
  });

  it("hoists leading scope directories before the prefix and preserves nested folder names", async () => {
    const source = {
      ...(await makeSource({
        "meta.$.js": 'export default { title: "Shared root" };',
        "fr/meta.ts": 'export default { title: "French root" };',
        "v1.0/fr/03-logo/meta.ts": 'export default { title: "Old logo" };',
        "v1.0/03-logo/meta.$.mjs": 'export default { icon: "book-open" };',
      })),
      prefix: "/docs/",
    };
    const result = await discoverFolderMeta([source], {
      localeDirs: ["fr"],
      versionDirs: ["v1.0"],
    });
    expect(result.meta).toEqual(
      new Map([
        ["fr/docs", { title: "French root" }],
        ["v1.0/docs/fr/03-logo", { title: "Old logo" }],
      ]),
    );
    expect(result.shared).toEqual(
      new Map([
        ["docs", { title: "Shared root" }],
        ["v1.0/docs/03-logo", { icon: "book-open" }],
      ]),
    );
    expect(result.diagnostics).toEqual([]);
    expect((await discoverFolderMeta([source])).meta.has("docs/fr")).toBe(true);
  });

  it.each([
    ["unknown field", 'export default { typo: "unknown" };'],
    ["unknown icon", 'export default { icon: "unknown-icon" };'],
    ["invalid factory icon", 'export default async () => ({ icon: " " });'],
    ["invalid factory result", 'export default () => ({ order: "first" });'],
    ["null async result", "export default async () => null;"],
  ])(
    "reports validation diagnostics for %s and retains valid metadata",
    async (_label, contents) => {
      const source = await makeSource({
        "03-logo/meta.ts": contents,
        "meta.ts": 'export default { title: "Root" };',
      });
      const result = await discoverFolderMeta([source]);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "BLUME_META_INVALID",
            file: join(source.root, "03-logo/meta.ts"),
            severity: "error",
            message: expect.any(String),
          }),
        ]),
      );
      expect(result.meta).toEqual(new Map([["", { title: "Root" }]]));
      expect(result.shared.size).toBe(0);
    },
  );

  it("accepts a module without exports as empty metadata", async () => {
    const source = await makeSource({ "meta.ts": "export {};" });
    expect(await discoverFolderMeta([source])).toEqual({
      meta: new Map([["", {}]]),
      shared: new Map(),
      diagnostics: [],
    });
  });

  it.each([
    ["module", 'throw new Error("module failed");'],
    [
      "factory",
      'export default async () => { throw new Error("factory failed"); };',
    ],
  ])(
    "reports %s load failures without discarding valid metadata",
    async (label, contents) => {
      const source = await makeSource({
        "03-logo/meta.ts": contents,
        "meta.ts": 'export default { title: "Root" };',
      });
      const result = await discoverFolderMeta([source]);
      expect(result.diagnostics).toEqual([
        {
          code: "BLUME_META_LOAD_FAILED",
          file: join(source.root, "03-logo/meta.ts"),
          message: `Could not load meta file: ${label} failed`,
          severity: "error",
        },
      ]);
      expect(result.meta).toEqual(new Map([["", { title: "Root" }]]));
    },
  );

  it("preserves all schema issues for invalid metadata", async () => {
    const source = await makeSource({
      "meta.ts": 'export default { title: 42, order: "first" };',
    });
    const result = await discoverFolderMeta([source]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "BLUME_META_INVALID",
        severity: "error",
        file: join(source.root, "meta.ts"),
        schemaPath: "order",
      }),
      expect.objectContaining({
        code: "BLUME_META_INVALID",
        severity: "error",
        file: join(source.root, "meta.ts"),
        schemaPath: "title",
      }),
    ]);
    expect(result.meta.size).toBe(0);
  });

  it.each([
    "meta.ts",
    "meta.js",
    "meta.mjs",
    "meta.$.ts",
    "meta.$.js",
    "meta.$.mjs",
  ])("accepts duplicate keys across extensions for %s", async (filename) => {
    const alternate = filename.endsWith(".ts")
      ? filename.replace(/\.ts$/, ".js")
      : filename.replace(/\.(?:js|mjs)$/, ".ts");
    const source = await makeSource({
      [filename]: 'export default { title: "First" };',
      [alternate]: 'export default { title: "Second" };',
    });
    const result = await discoverFolderMeta([source]);
    const target = filename.startsWith("meta.$.") ? result.shared : result.meta;
    const other = filename.startsWith("meta.$.") ? result.meta : result.shared;
    expect(target.size).toBe(1);
    // File discovery order is unspecified; either valid definition can win.
    expect([{ title: "First" }, { title: "Second" }]).toContainEqual(
      target.get(""),
    );
    expect(other.size).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("lets later sources overwrite duplicate keys", async () => {
    const first = await makeSource({
      "meta.ts": 'export default { title: "First" };',
    });
    const second = await makeSource({
      "meta.ts": 'export default { title: "Second" };',
    });
    const result = await discoverFolderMeta([first, second]);
    expect(result.meta).toEqual(new Map([["", { title: "Second" }]]));
    expect(result.shared.size).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("allows distinct prefixes across sources", async () => {
    const first = await makeSource({
      "meta.ts": 'export default { title: "First" };',
    });
    const second = await makeSource({
      "meta.ts": 'export default { title: "Second" };',
    });
    const distinct = await discoverFolderMeta([
      { ...first, prefix: "a" },
      { ...second, prefix: "b" },
    ]);
    expect(distinct.meta).toEqual(
      new Map([
        ["a", { title: "First" }],
        ["b", { title: "Second" }],
      ]),
    );
    expect(distinct.diagnostics).toEqual([]);
  });

  it.each([
    ["fr", "fr/docs"],
    ["v1.0/fr", "v1.0/docs/fr"],
  ])("accepts shared metadata inside %s", async (directory, key) => {
    const source = await makeSource({
      [`${directory}/meta.$.ts`]: "export default {};",
    });
    const result = await discoverFolderMeta([{ ...source, prefix: "docs" }], {
      localeDirs: ["fr"],
      versionDirs: ["v1.0"],
    });
    expect(result.shared).toEqual(new Map([[key, {}]]));
    expect(result.meta.size).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("ignores dependencies, build output and unrelated filenames", async () => {
    const source = await makeSource({
      "node_modules/dependency/meta.ts": 'throw new Error("dependency");',
      ".blume/meta.js": 'throw new Error("generated");',
      "dist/meta.mjs": 'throw new Error("build output");',
      "nested/dist/meta.$.ts": 'throw new Error("nested build output");',
      "meta.json": "{}",
      "meta.ts.bak": 'throw new Error("backup");',
    });
    expect(await discoverFolderMeta([source])).toEqual({
      meta: new Map(),
      shared: new Map(),
      diagnostics: [],
    });
  });

  it("returns empty maps and diagnostics when no metadata is discovered", async () => {
    const source = await makeSource({});
    expect(await discoverFolderMeta([source])).toEqual({
      meta: new Map(),
      shared: new Map(),
      diagnostics: [],
    });
    expect(await discoverFolderMeta([])).toEqual({
      meta: new Map(),
      shared: new Map(),
      diagnostics: [],
    });
  });
});
