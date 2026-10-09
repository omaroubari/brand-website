import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { mkdir, mkdtemp, rm, writeFile, symlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { parse as parseYaml } from "yaml";
import { ZodError } from "zod";

import { scanProject } from "../src/core/project-tree";
import { BrandtreeError } from "../src/core/diagnostics";

const temporaryDirectories: string[] = [];
const sandboxRoot = fileURLToPath(
  new URL("../../../apps/sandbox/", import.meta.url),
);
const fixtureConfig = join(sandboxRoot, "brandtree.config.ts");

const makeProject = async (files: Record<string, string>): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "brandtree-project-"));
  temporaryDirectories.push(root);
  await symlink(join(sandboxRoot, "assets"), join(root, "assets"), "dir");
  if (!Object.keys(files).some((file) => file.startsWith("public/"))) {
    await symlink(join(sandboxRoot, "public"), join(root, "public"), "dir");
  }
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const file = join(root, path);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, contents);
    }),
  );
  return root;
};

const validConfigModule = `export { default } from ${JSON.stringify(fixtureConfig)};`;

// Temporary test adapter while the production matter() parser is deferred.
// Parser syntax/error behavior is outside these scanner tests.
beforeEach(() => {
  vi.stubGlobal("matter", (text: string) => {
    const block = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(text);
    return {
      content: block ? text.slice(block[0].length) : text,
      data: block ? parseYaml(block[1]!) : {},
    };
  });
});

afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  await Promise.all(
    temporaryDirectories.map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("scanProject", () => {
  it("preserves brand warnings alongside folder errors without dropping pages", async () => {
    const root = await makeProject({
      "brandtree.config.mjs": `import config from ${JSON.stringify(fixtureConfig)};
export default { ...config, brand: { ...config.brand, typography: { ...config.brand.typography, display: 'var(--font-missing)' } } };`,
      "content/en/01-public.md": "# Public\n",
      "content/en/meta.ts": "export default { title: 123 };",
    });
    const project = await scanProject(root);
    expect(project.diagnostics[0]).toMatchObject({
      code: "BRANDTREE_FONT_VARIABLE_UNDECLARED",
      severity: "warning",
      file: join(root, "brandtree.config.mjs"),
      schemaPath: "brand.typography.display",
    });
    expect(
      project.diagnostics.some(({ severity }) => severity === "error"),
    ).toBe(true);
    expect(project.tree.pages.some(({ route }) => route === "/en/public")).toBe(
      true,
    );
    expect(project.droppedPages).toBe(0);
  });

  it("excludes partials, dependencies, and build output at every content depth", async () => {
    const visible = [
      "01-public.md",
      "guides/02-guide.mdx",
      "guides/with_underscore.md",
    ];
    const excluded = [
      "_partial.md",
      "guides/_partial.mdx",
      "_partials/example.mdx",
      "guides/_partials/nested/example.md",
      "node_modules/dependency.md",
      "guides/node_modules/nested/dependency.mdx",
      "dist/output.mdx",
      "guides/dist/nested/output.md",
    ];
    const excludedMeta = [
      "_partials/meta.ts",
      "guides/_partials/nested/meta.ts",
      "node_modules/meta.ts",
      "guides/node_modules/nested/meta.ts",
      "dist/meta.ts",
      "guides/dist/nested/meta.ts",
    ];
    const root = await makeProject({
      "brandtree.config.mjs": validConfigModule,
      ...Object.fromEntries(
        [...visible, ...excluded].map((ref) => [
          `content/${ref}`,
          "# Example\n",
        ]),
      ),
      ...Object.fromEntries(
        excludedMeta.map((ref) => [
          `content/${ref}`,
          'throw new Error("Excluded metadata must not execute");',
        ]),
      ),
    });
    const parser = vi.fn((text: string) => ({ content: text, data: {} }));
    vi.stubGlobal("matter", parser);

    const project = await scanProject(root);

    expect(
      [...new Set(project.tree.pages.map((page) => page.source.ref))].sort(),
    ).toEqual([...visible].sort());
    expect(parser).toHaveBeenCalledTimes(visible.length);
    expect(project.diagnostics).toEqual([]);
  });

  it("scans the sandbox app's real content and localized folder metadata", async () => {
    const project = await scanProject(sandboxRoot);

    expect(project.context.contentRoot).toBe(join(sandboxRoot, "content"));
    expect(project.tree.pages.map((page) => page.route)).toEqual([
      "/ar/logo/logotype",
      "/ar/logo",
      "/ar/exhibits",
      "/en/logo/logotype",
      "/en/logo",
      "/en/exhibits",
    ]);
    expect(project.tree.routes.get("/en/logo/logotype")).toBe(
      "filesystem:en/03-logo/01-logotype.mdx",
    );
    expect(project.tree.navigationByLocale.en?.sidebar).toContainEqual(
      expect.objectContaining({
        kind: "group",
        label: "Logo",
        route: "/en/logo",
      }),
    );
    expect(project.diagnostics).toEqual([]);
  });

  it("scans pages and folder metadata directly beneath the supplied project's content directory", async () => {
    const root = await makeProject({
      "brandtree.config.mjs": `import config from ${JSON.stringify(fixtureConfig)}; export default { ...config, basePath: "/brand/" };`,
      "content/en/01-intro.mdx":
        "---\ntitle: Introduction\ndescription: Start here\n---\n# Introduction\n",
      "content/en/02-draft.md":
        "---\ntitle: Draft\ndraft: true\n---\n# Draft\n",
      "content/en/03-logo/index.mdx": "# Logo\n",
      "content/en/03-logo/meta.ts":
        'export default { title: "Logo system", pages: ["logo"] };\n',
      "content/ar/01-intro.mdx": "---\ntitle: المقدمة\n---\n# المقدمة\n",
      "content/_partial.mdx": "# Ignored\n",
      "outside-content.mdx": "# Not a page\n",
    });

    const project = await scanProject(root);

    expect(project.context.root).toBe(root);
    expect(project.context.contentRoot).toBe(join(root, "content"));
    expect(project.mode).toBe("dev");
    expect(project.diagnostics).toEqual([]);
    expect(project.droppedPages).toBe(0);
    expect(project.sources).toEqual([
      {
        name: "filesystem",
        prefix: "",
        contentRoot: join(root, "content"),
      },
    ]);
    expect(project.tree.pages.map((page) => page.route)).toEqual([
      "/brand/ar/intro",
      "/brand/en/intro",
      "/brand/en/draft",
      "/brand/en/logo",
      "/brand/ar/draft",
      "/brand/ar/logo",
    ]);
    expect(
      project.tree.pages.find((page) => page.route === "/brand/en/intro"),
    ).toMatchObject({
      description: "Start here",
      locale: "en",
      title: "Introduction",
    });
    expect(project.tree.navigationByLocale.en?.sidebar).toContainEqual(
      expect.objectContaining({
        kind: "group",
        label: "Logo system",
        route: "/brand/en/logo",
      }),
    );
    expect(project.tree.routes.get("/brand/en/logo")).toBe(
      "filesystem:en/03-logo/index.mdx",
    );
  });

  it.each([
    { mode: "dev" as const, preview: false, keepsDrafts: true },
    { mode: "build" as const, preview: false, keepsDrafts: false },
    { mode: "build" as const, preview: true, keepsDrafts: true },
  ])(
    "handles drafts in $mode mode (preview: $preview)",
    async ({ mode, preview, keepsDrafts }) => {
      const root = await makeProject({
        "brandtree.config.mjs": validConfigModule,
        "content/01-public.mdx": "# Public\n",
        "content/02-draft.mdx": "---\ndraft: true\n---\n# Draft\n",
      });

      const project = await scanProject(root, { mode, preview });

      expect(project.mode).toBe(mode);
      expect(project.tree.pages.some((page) => page.meta.draft)).toBe(
        keepsDrafts,
      );
      expect(project.tree.pages.map((page) => page.route)).toEqual(
        keepsDrafts
          ? ["/en/public", "/en/draft", "/ar/public", "/ar/draft"]
          : ["/en/public", "/ar/public"],
      );
      expect(
        project.tree.pages.find((page) => page.route === "/ar/public")
          ?.fallback,
      ).toBe(true);
    },
  );

  it("reports config validation failures through structured diagnostics", async () => {
    const invalidConfigRoot = await makeProject({
      "brandtree.config.mjs": "export default {};\n",
      "content/index.mdx": "# Home\n",
    });
    const failure = scanProject(invalidConfigRoot);
    await expect(failure).rejects.toBeInstanceOf(BrandtreeError);
    await expect(failure).rejects.toMatchObject({
      diagnostic: {
        code: "BLUME_CONFIG_INVALID",
        file: join(invalidConfigRoot, "brandtree.config.mjs"),
        severity: "error",
      },
    });
  });

  it("rejects invalid page metadata under content", async () => {
    const invalidPageRoot = await makeProject({
      "brandtree.config.mjs": validConfigModule,
      "content/index.mdx": "---\nunknown: true\n---\n# Home\n",
    });
    await expect(scanProject(invalidPageRoot)).rejects.toBeInstanceOf(ZodError);
  });

  it("retains valid pages and reports invalid folder metadata under content", async () => {
    const root = await makeProject({
      "brandtree.config.mjs": validConfigModule,
      "content/en/01-logo/index.mdx": "# Logo\n",
      "content/en/01-logo/meta.ts": "export default { title: 123 };",
    });

    const project = await scanProject(root);

    expect(project.tree.pages.map((page) => page.route)).toEqual([
      "/en/logo",
      "/ar/logo",
    ]);
    expect(project.diagnostics).toEqual([
      expect.objectContaining({
        code: "BLUME_META_INVALID",
        file: join(root, "content/en/01-logo/meta.ts"),
        severity: "error",
        schemaPath: "title",
      }),
    ]);
  });
});
