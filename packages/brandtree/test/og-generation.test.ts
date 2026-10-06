import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { imageSize } from "image-size";
import ts from "typescript";
import { scanProject, type BrandtreeProject } from "../src/core/project-tree";
import type { RuntimeOgAssets } from "../src/core/types";
import { resolveBrand } from "../src/brand/localize";
import { colorCss, resolveColor } from "../src/brand/tokens";
import { getNavigation } from "../src/core/navigation";
import { localeDir } from "../src/core/i18n";
import { renderOgImage } from "../src/og/card";
import { resolveOgLayer, resolveOgLogo } from "../src/og/options";
import { generatedOgImagePath } from "../src/og/paths";
import { buildOgAssets } from "../src/astro/build-og-assets";
import { buildRuntimeData } from "../src/astro/build-runtime-data";
import { generateRuntime } from "../src/astro/generate";
import { ogEndpointTemplate } from "../src/astro/templates/og";
import { normalizeEntry } from "../src/core/entries";
import { buildContentTree } from "../src/core/tree";

interface OgProps {
  title: string;
  description?: string;
  locale: string;
}

it.each(
  [
    "single",
    "dir-hidden",
    "dir-prefixed",
    "dot-hidden",
    "dot-prefixed",
  ].flatMap((mode) =>
    ["", "/brand", "/brand/guide"].map((basePath) => ({ mode, basePath })),
  ),
)(
  "maps OG endpoints for root and nested routes: $mode, '$basePath'",
  async ({ mode, basePath }) => {
    const fixture = project();
    fixture.config.basePath = basePath;
    if (mode === "single") delete fixture.config.i18n;
    else {
      fixture.config.i18n!.parser = mode.startsWith("dot") ? "dot" : "dir";
      fixture.config.i18n!.hideDefaultLocalePrefix = mode.endsWith("hidden");
    }
    const i18n = fixture.config.i18n;
    const locales = i18n ? i18n.locales.map(({ code }) => code) : [""];
    const logical = ["01-start.md", "02-logo/index.md", "02-logo/01-mark.md"];
    const pages = locales.flatMap((locale) =>
      logical.flatMap((file) => {
        const ref = !i18n
          ? file
          : i18n.parser === "dir"
            ? `${locale}/${file}`
            : file.replace(/\.md$/, `.${locale}.md`);
        return normalizeEntry(
          { ref, data: {}, body: { format: "md", text: "# Page" } },
          { i18n, basePath },
        ).pages;
      }),
    );
    fixture.tree = buildContentTree(pages, {
      i18n,
      basePath,
      folderMeta: new Map(),
    });
    const prefixes = locales.map(
      (locale) =>
        `${basePath}${locale && !(i18n?.hideDefaultLocalePrefix && locale === i18n.defaultLocale) ? `/${locale}` : ""}`,
    );
    const expectedRoutes = prefixes.flatMap((prefix) => [
      prefix || "/",
      `${prefix}/start`,
      `${prefix}/logo`,
      `${prefix}/logo/mark`,
    ]);
    const paths = await endpoint(fixture, {
      fontData: {},
      logos: {},
    }).getStaticPaths();
    expect(paths.map(({ params }) => `/og/${params.slug}.png`).sort()).toEqual(
      expectedRoutes
        .map((route) => `/og/${route.slice(1) || "index"}.png`)
        .sort(),
    );
    expect(new Set(paths.map(({ params }) => params.slug)).size).toBe(
      paths.length,
    );
  },
);
interface Endpoint {
  getStaticPaths(): Promise<{ params: { slug: string }; props: OgProps }[]>;
  GET(context: { props: OgProps }): Promise<Response>;
}
let fixture: BrandtreeProject;
const roots: string[] = [];
beforeAll(async () => {
  fixture = await scanProject(
    fileURLToPath(new URL("../../../apps/sandbox/", import.meta.url)),
    { mode: "build" },
  );
});
afterAll(async () => {
  await Promise.all(
    roots.map((root) => rm(root, { recursive: true, force: true })),
  );
});
const project = (): BrandtreeProject => {
  const result = structuredClone(fixture);
  result.config.seo.og.enabled = true;
  return result;
};

// Execute the emitted endpoint itself; only its module imports are supplied here.
const endpoint = (
  project: BrandtreeProject,
  assets: RuntimeOgAssets,
  renderer = renderOgImage,
): Endpoint => {
  const source = ogEndpointTemplate().replace(/^import .*;\n/gmu, "");
  const js = ts
    .transpile(source, {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
    })
    .replace(/^export /gmu, "");
  return new Function(
    "data",
    "bundledAssets",
    "resolveBrand",
    "colorCss",
    "resolveColor",
    "getNavigation",
    "renderOgImage",
    "resolveOgLayer",
    "resolveOgLogo",
    "localeDir",
    `${js}\nreturn { getStaticPaths, GET };`,
  )(
    JSON.parse(buildRuntimeData(project)),
    assets,
    resolveBrand,
    colorCss,
    resolveColor,
    getNavigation,
    renderer,
    resolveOgLayer,
    resolveOgLogo,
    localeDir,
  );
};

it("emits the endpoint and deduplicates localized content and cover URLs", async () => {
  const runtime = await mkdtemp(join(tmpdir(), "brandtree-og-runtime-"));
  roots.push(runtime);
  const input = project();
  input.context.outDir = runtime;
  await generateRuntime(input);
  const emitted = await readFile(
    join(runtime, "src/pages/og/[...slug].png.ts"),
    "utf8",
  );
  expect(emitted).toBe(ogEndpointTemplate());
  expect(emitted).not.toContain("@config");
  const assets = JSON.parse(
    await readFile(join(runtime, "src/generated/og-assets.json"), "utf8"),
  );
  const paths = await endpoint(input, assets).getStaticPaths();
  const expected = new Set([
    ...input.tree.pages.map((page) => generatedOgImagePath(page.route)),
    ...input.config.i18n!.locales.map(({ code }) =>
      generatedOgImagePath(getNavigation(input.tree, code).root ?? "/"),
    ),
  ]);
  expect(new Set(paths.map(({ params }) => `/og/${params.slug}.png`))).toEqual(
    expected,
  );
  expect(paths).toHaveLength(expected.size);
  expect((await generateRuntime(input)).structuralChange).toBe(false);
});

it("honors disabled generation, custom page images, and SEO titles", async () => {
  const input = project();
  const page = input.tree.pages.find(
    (page) => page.route !== getNavigation(input.tree, page.locale).root,
  )!;
  page.meta.seo.title = "SEO headline";
  page.meta.seo.description = "SEO description";
  const assets = { logos: {}, fontData: {} };
  let paths = await endpoint(input, assets).getStaticPaths();
  expect(
    paths.find(
      ({ params }) =>
        `/og/${params.slug}.png` === generatedOgImagePath(page.route),
    )?.props,
  ).toMatchObject({ title: "SEO headline", description: "SEO description" });
  page.meta.seo.image = "/custom.png";
  paths = await endpoint(input, assets).getStaticPaths();
  expect(
    paths.some(
      ({ params }) =>
        `/og/${params.slug}.png` === generatedOgImagePath(page.route),
    ),
  ).toBe(false);
  input.config.seo.og.enabled = false;
  expect(await endpoint(input, assets).getStaticPaths()).toEqual([]);
  expect(await buildOgAssets(input)).toEqual({ assets, warnings: [] });
});

it("bundles author-root assets and warns with usable font fallbacks", async () => {
  const root = await mkdtemp(join(tmpdir(), "brandtree-og-assets-"));
  roots.push(root);
  await mkdir(join(root, "public/brand"), { recursive: true });
  await mkdir(join(root, "assets"));
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="20"><rect width="100" height="20"/></svg>';
  await writeFile(join(root, "public/brand/mark.svg"), svg);
  await writeFile(join(root, "assets/font.ttf"), "font fixture");
  const input = project();
  input.context.root = root;
  input.config.seo.og.logo = "/brand/mark.svg";
  input.config.seo.og.fonts = [
    { name: "Available", src: "assets/font.ttf" },
    { name: "Missing", src: "assets/missing.ttf" },
  ];
  const { assets, warnings } = await buildOgAssets(input);
  expect(assets.logos["/brand/mark.svg"]).toBe(svg);
  expect(assets.fontData["assets/font.ttf"]).toBe(
    Buffer.from("font fixture").toString("base64"),
  );
  expect(warnings).toHaveLength(1);
  const renderer = vi.fn<typeof renderOgImage>(async () => new Uint8Array([1]));
  await endpoint(input, assets, renderer).GET({
    props: { title: "Arabic", locale: "ar" },
  });
  expect(renderer.mock.calls[0]![0]).toMatchObject({
    logo: svg,
    dir: "rtl",
    titleFont: "Available",
    fonts: [{ name: "Available", src: "assets/font.ttf" }],
  });
});

it("renders a real 1200 by 630 PNG without i18n", async () => {
  const input = project();
  delete input.config.i18n;
  input.config.seo.og.logo = false;
  const response = await endpoint(input, { logos: {}, fontData: {} }).GET({
    props: { title: "Brand guidelines", locale: "en" },
  });
  expect(response.headers.get("Content-Type")).toBe("image/png");
  const png = new Uint8Array(await response.arrayBuffer());
  expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(imageSize(png)).toMatchObject({ width: 1200, height: 630 });
}, 30_000);

it("prerenders the emitted endpoint into static PNG files", async () => {
  // Keep the runtime on the workspace filesystem; external-runtime Astro style
  // resolution is covered by the separate generator build tests.
  const temporaryRoot = fileURLToPath(new URL("../tmp/", import.meta.url));
  await mkdir(temporaryRoot, { recursive: true });
  const runtime = await mkdtemp(join(temporaryRoot, "og-build-"));
  roots.push(runtime);
  const input = project();
  input.context.outDir = runtime;
  input.context.distDir = join(runtime, "dist");
  await generateRuntime(input);
  await promisify(execFile)(
    process.execPath,
    [
      fileURLToPath(
        new URL("./bin/astro.mjs", import.meta.resolve("astro/package.json")),
      ),
      "build",
      "--root",
      runtime,
    ],
    { cwd: input.context.root },
  );
  const paths = await endpoint(input, {
    logos: {},
    fontData: {},
  }).getStaticPaths();
  for (const { params } of paths) {
    const png = await readFile(
      join(input.context.distDir, "og", `${params.slug}.png`),
    );
    expect(imageSize(png)).toMatchObject({ width: 1200, height: 630 });
  }
}, 60_000);
