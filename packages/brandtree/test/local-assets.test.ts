import { afterEach, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import fixtureConfig from "../../../apps/sandbox/brandtree.config";
import {
  checkLocalAssets,
  localAssetDiagnostics,
  resolveAssetReference,
  resolveLocalAssetPath,
} from "../src/core/local-assets";
import {
  collectConfigAssetReferences,
  prepareConfigAssets,
} from "../src/core/config-assets";
import { brandtreeConfigSchema } from "../src/core/schema";
import { loadConfig } from "../src/core/config";
import { resolveProjectContext } from "../src/core/project";
import { scanProject } from "../src/core/project-tree";

const roots: string[] = [];
const sandboxRoot = fileURLToPath(
  new URL("../../../apps/sandbox/", import.meta.url),
);
const makeRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), "brandtree-local-assets-"));
  roots.push(root);
  await symlink(join(sandboxRoot, "public"), join(root, "public"), "dir");
  return root;
};
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("uses one prefix convention for every asset reference", () => {
  const root = "/project";
  expect(
    resolveLocalAssetPath(root, {
      value: "/brand/logo%20dark.svg?v=2#mark",
    }),
  ).toBe("/project/public/brand/logo dark.svg");
  for (const path of [
    "./assets/font.woff2",
    "./src/font.woff2",
    "./public/font.woff2",
    "./font.woff2",
  ]) {
    expect(resolveLocalAssetPath(root, { value: path })).toBe(join(root, path));
  }
  expect(resolveLocalAssetPath(root, { value: "/fonts/font.woff2" })).toBe(
    "/project/public/fonts/font.woff2",
  );
  expect(resolveLocalAssetPath(root, { value: "./assets/font#1.woff2" })).toBe(
    "/project/assets/font#1.woff2",
  );
  expect(
    resolveLocalAssetPath(root, {
      value: pathToFileURL("/elsewhere/font.woff2").href,
    }),
  ).toBe("/elsewhere/font.woff2");
});

it("ignores remote URLs and anchors without performing network requests", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("Network must stay untouched"));
  const values = [
    "https://example.com/font.woff2",
    "//cdn.example.com/logo.svg",
    "data:image/svg+xml,svg",
    "#downloads",
    "mailto:brand@example.com",
  ];
  expect(
    await checkLocalAssets(
      values.map((value) =>
        resolveAssetReference("/project", { value, path: ["asset"] }),
      ),
    ),
  ).toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
});

it("rejects ambiguous bare paths instead of applying field-specific defaults", () => {
  for (const value of [
    "assets/font.woff2",
    "../font.woff2",
    "file:/font.woff2",
    "C:/fonts/font.woff2",
  ]) {
    expect(() => resolveLocalAssetPath("/project", { value })).toThrow(/Use /u);
  }
});

it.each([
  ["assets/card.ttf", null],
  ["./assets/card.ttf", "/project/assets/card.ttf"],
  ["/fonts/card.ttf", "/project/public/fonts/card.ttf"],
  ["file:///elsewhere/card.ttf", "/elsewhere/card.ttf"],
])("applies shared asset rules to every field for %s", (value, file) => {
  const config = brandtreeConfigSchema.parse({
    ...fixtureConfig,
    brand: {
      ...fixtureConfig.brand,
      downloads: [{ id: "card", label: "Card", href: value }],
    },
    fonts: [
      {
        name: "Card",
        provider: "local",
        cssVariable: "--font-card",
        options: { variants: [{ src: [value] }] },
      },
    ],
    seo: {
      og: { enabled: true, logo: value },
    },
  });
  const references = collectConfigAssetReferences(config, "/project").filter(
    (reference) => reference.value === value,
  );
  expect(references).toHaveLength(3);
  for (const reference of references) {
    expect(reference.file).toBe(file);
    if (value === "assets/card.ttf") {
      expect(reference.resolutionError).toContain("Use ./");
    } else {
      expect(reference).not.toHaveProperty("resolutionError");
    }
  }
});

it("reports missing files, directories, and broken symlinks for every affected field", async () => {
  const root = await makeRoot();
  await mkdir(join(root, "./assets"));
  await symlink(join(root, "gone.svg"), join(root, "./broken.svg"));
  const failures = await checkLocalAssets([
    {
      value: "./missing.svg",
      file: join(root, "missing.svg"),
      path: ["brand", "logo", "logotype", "onLight"],
    },
    {
      value: "./missing.svg",
      file: join(root, "missing.svg"),
      path: ["brand", "logo", "logotype", "onDark"],
    },
    { value: "./assets", path: ["fonts", 0], file: join(root, "assets") },
    {
      value: "./broken.svg",
      file: join(root, "broken.svg"),
      path: ["brand", "downloads", 0, "href"],
    },
  ]);
  expect(failures).toHaveLength(4);
  expect(failures[2]?.reason).toBe("Path is not a regular file");
  const diagnostics = localAssetDiagnostics(failures, {
    file: join(root, "brandtree.config.ts"),
  });
  expect(diagnostics.map(({ schemaPath }) => schemaPath)).toEqual([
    "brand.logo.logotype.onLight",
    "brand.logo.logotype.onDark",
    "fonts.0",
    "brand.downloads.0.href",
  ]);
  for (const diagnostic of diagnostics) {
    expect(diagnostic).toMatchObject({
      code: "BRANDTREE_LOCAL_FILE_UNAVAILABLE",
      severity: "warning",
      suggestion: expect.stringContaining("Restore the file"),
    });
    expect(diagnostic.message).toContain(root);
  }
});

it("reports invalid authored syntax during checking rather than collection", async () => {
  const config = brandtreeConfigSchema.parse({
    ...fixtureConfig,
    fonts: [],
    brand: {
      ...fixtureConfig.brand,
      downloads: [
        { id: "bare", label: "Bare", href: "assets/kit.zip" },
        { id: "escaped", label: "Escaped", href: "/bad%ZZ.zip" },
        { id: "remote", label: "Remote", href: "https://example.com/kit.zip" },
      ],
    },
  });
  const references = collectConfigAssetReferences(config, "/project").filter(
    ({ path }) => path[1] === "downloads",
  );
  expect(references.map(({ file }) => file)).toEqual([null, null, null]);
  expect(references[0]?.resolutionError).toContain("Use ./");
  expect(references[1]?.resolutionError).toContain("URI malformed");
  expect(references[2]).not.toHaveProperty("resolutionError");
  const failures = await checkLocalAssets(references);
  expect(failures).toHaveLength(2);
  expect(failures[0]?.reason).toContain("Use ./");
  expect(failures[1]?.reason).toContain("URI malformed");
  expect(failures.map(({ reason }) => reason)).toEqual(
    references.slice(0, 2).map(({ resolutionError }) => resolutionError),
  );
  expect(failures.map(({ reference }) => reference.value)).toEqual([
    "assets/kit.zip",
    "/bad%ZZ.zip",
  ]);
});

it("checks the supplied context paths and leaves config and context intact", async () => {
  const root = await makeRoot();
  await writeFile(join(root, "font.woff2"), "readable font fixture");
  const config = brandtreeConfigSchema.parse({
    ...fixtureConfig,
    fonts: [
      {
        name: "Context font",
        provider: "local",
        cssVariable: "--font-sandbox",
        options: { variants: [{ src: ["./font.woff2"] }] },
      },
    ],
  });
  const context = resolveProjectContext(root, { config });
  context.configFile = join(root, "brandtree.config.ts");
  const reference = context.assetReferences.find(
    ({ path }) => path[0] === "fonts",
  )!;
  // A resolved context can identify a different physical file. Preparation
  // must check that filename rather than rediscovering the authored reference.
  reference.file = join(root, "missing.woff2");
  const before = structuredClone({ config, context });
  const result = await prepareConfigAssets(config, context);
  expect(result.config.fonts).toMatchObject([
    {
      name: "Inter",
      provider: "google",
      cssVariable: "--font-brandtree-default",
    },
  ]);
  expect(result.config.brand.typography.display).toContain(
    "system-ui, sans-serif",
  );
  expect(result.diagnostics).toEqual([
    expect.objectContaining({
      file: context.configFile,
      schemaPath: "fonts.0.options.variants.0.src.0",
      message: expect.stringContaining(reference.file),
    }),
  ]);
  expect({ config, context }).toEqual(before);
});

it("checks brand asset fields while preserving artwork and download references", async () => {
  const root = await makeRoot();
  await symlink(join(sandboxRoot, "assets"), join(root, "assets"), "dir");
  const input = {
    ...fixtureConfig,
    brand: {
      ...fixtureConfig.brand,
      logo: {
        ...fixtureConfig.brand.logo,
        logotype: {
          ...fixtureConfig.brand.logo.logotype,
          onLight: "/missing-logo.svg",
        },
        brandmark: {
          ...fixtureConfig.brand.logo.brandmark,
          onDark: "/missing-mark.svg",
        },
        favicon: "/missing-icon.svg",
      },
      downloads: [
        { id: "kit", label: "Brand kit", href: "/missing-kit.zip?download=1" },
      ],
    },
  };
  const config = brandtreeConfigSchema.parse(input);
  const result = await prepareConfigAssets(
    config,
    resolveProjectContext(root, { config }),
  );
  expect(result.diagnostics.map(({ schemaPath }) => schemaPath)).toEqual([
    "brand.logo.logotype.onLight",
    "brand.logo.brandmark.onDark",
    "brand.logo.favicon",
    "brand.downloads.0.href",
  ]);
  expect(result.config.brand).toEqual(config.brand);
  expect(result.config.fonts).toEqual(config.fonts);
});

it("retains readable alternative sources and variants, and removes wholly unavailable local fonts", async () => {
  const root = await makeRoot();
  await mkdir(join(root, "src"));
  await writeFile(join(root, "./src/readable.woff2"), "readable fixture");
  const input = {
    ...fixtureConfig,
    fonts: [
      {
        name: "Partial",
        provider: "local",
        cssVariable: "--font-sandbox",
        options: {
          variants: [
            {
              src: ["./missing.woff2", "./src/readable.woff2"],
              weight: 400,
              style: "normal",
            },
            { src: ["./missing-bold.woff2"], weight: 700, style: "normal" },
          ],
        },
      },
      {
        name: "Missing",
        provider: "local",
        cssVariable: "--font-code",
        options: { variants: [{ src: ["./missing-code.woff2"] }] },
      },
      { name: "Remote", provider: "google", cssVariable: "--font-remote" },
    ],
    brand: {
      ...fixtureConfig.brand,
      typography: {
        ...fixtureConfig.brand.typography,
        mono: "var(--font-code)",
      },
      localeOverrides: { ar: { typography: { mono: "var(--font-code)" } } },
    },
  };
  const config = brandtreeConfigSchema.parse(input);
  const snapshot = structuredClone(config);
  const result = await prepareConfigAssets(
    config,
    resolveProjectContext(root, { config }),
  );
  expect(result.config.fonts).toHaveLength(3);
  expect(result.config.fonts[2]).toMatchObject({
    name: "Inter",
    provider: "google",
    cssVariable: "--font-brandtree-default",
  });
  expect(result.config.fonts[0]).toMatchObject({
    options: {
      variants: [
        { src: ["./src/readable.woff2"], weight: 400, style: "normal" },
      ],
    },
  });
  expect(result.config.fonts[1]).toEqual(config.fonts[2]);
  expect(result.config.brand.typography.mono).toBe(
    "var(--font-code, ui-monospace, monospace)",
  );
  expect(result.config.brand.localeOverrides?.ar.typography?.mono).toBe(
    "var(--font-code, ui-monospace, monospace)",
  );
  expect(result.diagnostics).toHaveLength(3);
  expect(config).toEqual(snapshot);
  // Availability is checked afresh; restoring a file restores the registration.
  await writeFile(join(root, "./missing-code.woff2"), "restored fixture");
  expect(
    (await prepareConfigAssets(config, resolveProjectContext(root, { config })))
      .config.fonts,
  ).toHaveLength(3);
});

it("owns authored references on the context before applying asset fallbacks", async () => {
  const root = await makeRoot();
  const configFile = join(root, "brandtree.config.mjs");
  const input = {
    ...fixtureConfig,
    brand: { ...fixtureConfig.brand, localeOverrides: undefined },
    fonts: [
      {
        name: "Missing",
        provider: "local",
        cssVariable: "--font-sandbox",
        options: { variants: [{ src: ["./missing.woff2"] }] },
      },
    ],
    seo: {
      og: {
        enabled: true,
        logo: "./assets/card.svg",
      },
    },
  };
  await writeFile(configFile, `export default ${JSON.stringify(input)};`);
  const loaded = await loadConfig(root);
  expect(loaded.config.fonts).toHaveLength(1);
  const references = collectConfigAssetReferences(loaded.config, root);
  await mkdir(join(root, "content"));
  const result = await scanProject(root);
  expect(result.context.assetReferences).toContainEqual({
    value: "./missing.woff2",
    path: ["fonts", 0, "options", "variants", 0, "src", 0],
    file: join(root, "missing.woff2"),
  });

  expect(result.context.assetReferences).toEqual(references);
  expect(result.config.fonts).toMatchObject([
    {
      name: "Inter",
      provider: "google",
      cssVariable: "--font-brandtree-default",
    },
  ]);
  expect(result.config.brand.typography.display).toContain(
    "system-ui, sans-serif",
  );
  expect(result.diagnostics).toEqual(
    ["fonts.0.options.variants.0.src.0", "seo.og.logo"].map((schemaPath) =>
      expect.objectContaining({
        code: "BRANDTREE_LOCAL_FILE_UNAVAILABLE",
        file: configFile,
        schemaPath,
      }),
    ),
  );
});
