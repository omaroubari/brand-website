import { afterEach, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import fixtureConfig from "../../../apps/sandbox/brandtree.config";
import {
  checkLocalAssets,
  localAssetDiagnostics,
  resolveLocalAssetPath,
} from "../src/core/local-assets";
import { prepareConfigAssets } from "../src/core/config-assets";
import { brandtreeConfigSchema } from "../src/core/schema";

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
      values.map((value) => ({ value, path: ["asset"] })),
      "/missing-project",
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

it("reports missing files, directories, and broken symlinks for every affected field", async () => {
  const root = await makeRoot();
  await mkdir(join(root, "./assets"));
  await symlink(join(root, "gone.svg"), join(root, "./broken.svg"));
  const failures = await checkLocalAssets(
    [
      {
        value: "./missing.svg",
        path: ["brand", "logo", "logotype", "onLight"],
      },
      {
        value: "./missing.svg",
        path: ["brand", "logo", "logotype", "onDark"],
      },
      { value: "./assets", path: ["fonts", 0] },
      {
        value: "./broken.svg",
        path: ["brand", "downloads", 0, "href"],
      },
    ],
    root,
  );
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

it("checks brand asset fields while preserving artwork and download references", async () => {
  const root = await makeRoot();
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
  const result = await prepareConfigAssets(config, { root });
  expect(result.diagnostics.map(({ schemaPath }) => schemaPath)).toEqual([
    "brand.logo.logotype.onLight",
    "brand.logo.brandmark.onDark",
    "brand.logo.favicon",
    "brand.downloads.0.href",
  ]);
  expect(result.config.brand).toEqual(config.brand);
});
