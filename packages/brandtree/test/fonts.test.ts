import { afterEach, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { brandtreeConfigSchema, fontsConfigSchema } from "../src/core/schema";
import fixtureConfig from "../../../apps/sandbox/brandtree.config";
import { resolveBrand } from "../src/brand/i18n";
import { brandStyleSheet } from "../src/brand/tokens";
import { scanProject } from "../src/core/project-tree";
import { generateRuntime } from "../src/astro/generate";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("defaults to Google Inter, allows opting out, and rejects malformed registrations", () => {
  expect(
    brandtreeConfigSchema.parse({ ...fixtureConfig, fonts: undefined }).fonts,
  ).toEqual([
    {
      name: "Inter",
      cssVariable: "--font-brandtree-default",
      provider: "google",
      weights: ["100 900"],
      styles: ["normal", "italic"],
      fallbacks: ["system-ui", "sans-serif"],
    },
  ]);
  expect(fontsConfigSchema.parse([])).toEqual([]);
  const hosted = {
    name: "Inter",
    cssVariable: "--font-custom",
    provider: "google",
  };
  expect(fontsConfigSchema.parse([hosted])).toEqual([hosted]);
  for (const fonts of [
    [{ ...hosted, cssVariable: "font-custom" }],
    [hosted, hosted],
    [{ ...hosted, provider: "unknown" }],
    [{ ...hosted, provider: "local" }],
    [{ ...hosted, provider: "local", options: { variants: [] } }],
    [{ ...hosted, weights: [] }],
    [{ ...hosted, provider: "adobe" }],
  ])
    expect(fontsConfigSchema.safeParse(fonts).success).toBe(false);
});

it("resolves omitted-font typography through Inter and system without changing author inputs", () => {
  const input = {
    ...fixtureConfig,
    fonts: undefined,
    brand: {
      ...fixtureConfig.brand,
      typography: {
        ...fixtureConfig.brand.typography,
        display: "var(--font-missing)",
        text: '"Missing Family"',
      },
    },
  };
  const config = brandtreeConfigSchema.parse(input);
  const fallback = "var(--font-brandtree-default, system-ui, sans-serif)";
  expect(config.brand.typography.display).toBe(
    `var(--font-missing, ${fallback}), ${fallback}`,
  );
  expect(config.brand.typography.text).toBe(`"Missing Family", ${fallback}`);
  expect(config.brand.typography.mono).toBe(input.brand.typography.mono);
  expect(config.brand.typography.families).toEqual(
    input.brand.typography.families,
  );
  expect(input.brand.typography.display).toBe("var(--font-missing)");
  // Resolved configs may be parsed again without accumulating fallback stacks.
  expect(brandtreeConfigSchema.parse(config)).toEqual(config);
  const arabic = resolveBrand(config.brand, "ar", config.i18n);
  const arabicTypography = input.brand.localeOverrides?.ar.typography;
  if (!arabicTypography)
    throw new Error("Fixture must define Arabic typography");
  expect(arabic.typography.display).toBe(arabicTypography.display);
  expect(arabic.typography.text).toBe(arabicTypography.text);
  expect(brandStyleSheet(config.brand)).toContain(
    `--font-display: var(--font-missing, ${fallback}), ${fallback};`,
  );
});

it.each([{ fonts: [] }, { fonts: fixtureConfig.fonts }])(
  "uses system fallbacks without implicitly registering Inter when fonts are explicit: $fonts",
  ({ fonts }) => {
    const config = brandtreeConfigSchema.parse({
      ...fixtureConfig,
      fonts,
      brand: {
        ...fixtureConfig.brand,
        typography: {
          ...fixtureConfig.brand.typography,
          display: "var(--font-sandbox)",
          text: "var(--font-custom, serif)",
        },
        localeOverrides: {
          ar: {
            typography: {
              display: "var(--font-arabic)",
              text: "system-ui, sans-serif",
            },
          },
        },
      },
    });
    expect(config.fonts).toEqual(fonts);
    expect(config.brand.typography.display).toBe(
      "var(--font-sandbox, system-ui, sans-serif), system-ui, sans-serif",
    );
    expect(config.brand.typography.text).toBe(
      "var(--font-custom, serif), system-ui, sans-serif",
    );
    const arabic = resolveBrand(config.brand, "ar", config.i18n);
    expect(arabic.typography.display).toBe(
      "var(--font-arabic, system-ui, sans-serif), system-ui, sans-serif",
    );
    expect(arabic.typography.text).toBe("system-ui, sans-serif");
    expect(brandStyleSheet(config.brand)).not.toContain(
      "--font-brandtree-default",
    );
  },
);

it("emits hosted provider calls and preserves their family options", async () => {
  const fonts = fontsConfigSchema.parse([
    ...["google", "fontsource", "bunny", "fontshare"].map((provider) => ({
      provider,
      name: "Inter",
      cssVariable: `--font-${provider}`,
      weights: ["100 900"],
      styles: ["normal"],
      fallbacks: [],
    })),
    {
      provider: "adobe",
      id: "example-kit",
      name: "Example",
      cssVariable: "--font-adobe",
    },
  ]);
  const temporaryRoot = fileURLToPath(new URL("../tmp/", import.meta.url));
  await mkdir(temporaryRoot, { recursive: true });
  const runtimeDir = await mkdtemp(join(temporaryRoot, "font-providers-"));
  roots.push(runtimeDir);
  const project = await scanProject(
    fileURLToPath(new URL("../../../apps/sandbox/", import.meta.url)),
    { mode: "build", runtimeDir },
  );
  project.config.fonts = fonts;
  await generateRuntime(project);
  const configPath = join(runtimeDir, "astro.config.mjs");
  const source = await readFile(configPath, "utf8");
  expect(source).not.toContain("brandtree/astro/fonts");
  expect(source).not.toContain("resolveAstroFonts");
  for (const provider of ["google", "fontsource", "bunny", "fontshare"])
    expect(source).toContain(`fontProviders.${provider}()`);
  const resolved = (await import(pathToFileURL(configPath).href)).default.fonts;
  expect(resolved).toHaveLength(5);
  for (const family of resolved)
    expect(typeof family.provider.resolveFont).toBe("function");
  expect(resolved[0]).toMatchObject({
    weights: ["100 900"],
    styles: ["normal"],
    fallbacks: [],
  });
  expect(resolved[4]).not.toHaveProperty("id");
  // The omitted-font path must generate the same real Google provider API.
  project.config = brandtreeConfigSchema.parse({
    ...fixtureConfig,
    fonts: undefined,
  });
  await generateRuntime(project);
  const defaultSource = await readFile(configPath, "utf8");
  expect(defaultSource).toContain('"cssVariable": "--font-brandtree-default"');
  expect(defaultSource).toContain('"name": "Inter"');
  expect(defaultSource).toContain("fontProviders.google()");
  expect(defaultSource).not.toContain("fontProviders.local()");
});

it("builds custom font CSS and preloads from an external generated runtime", async () => {
  const temporaryRoot = fileURLToPath(new URL("../tmp/", import.meta.url));
  await mkdir(temporaryRoot, { recursive: true });
  const runtimeDir = await mkdtemp(join(temporaryRoot, "font-runtime-"));
  roots.push(runtimeDir);
  const root = fileURLToPath(
    new URL("../../../apps/sandbox/", import.meta.url),
  );
  const project = await scanProject(root, { mode: "build", runtimeDir });
  project.context.distDir = join(runtimeDir, "dist");
  project.config.fonts = fontsConfigSchema.parse([
    {
      name: "Client Sans",
      cssVariable: "--font-client",
      provider: "local",
      options: {
        variants: [
          {
            src: ["./assets/fonts/Inter-Variable.woff2"],
            weight: "100 900",
            style: "normal",
          },
        ],
      },
    },
  ]);
  project.config.brand.typography.display = "var(--font-client)";
  project.config.brand.typography.text = "var(--font-client)";
  expect((await generateRuntime(project)).warnings).toEqual([]);
  const configUrl = pathToFileURL(join(runtimeDir, "astro.config.mjs")).href;
  const generatedConfig = (await import(configUrl)).default;
  expect(generatedConfig.fonts[0].options.variants[0].src[0]).toEqual(
    pathToFileURL(join(root, "./assets/fonts/Inter-Variable.woff2")),
  );
  const probe = join(runtimeDir, "build.mjs");
  await writeFile(
    probe,
    `import { build } from 'astro'; await build({ root: new URL('./', import.meta.url), logLevel: 'silent' });`,
  );
  await promisify(execFile)(process.execPath, [probe], {
    timeout: 120000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const content = project.tree.pages.find(
    (page) => page.locale === "en" && page.route !== "/en",
  )!;
  for (const route of ["/en", "/ar", content.route]) {
    const html = await readFile(
      join(project.context.distDir, route, "index.html"),
      "utf8",
    );
    expect(html).toContain("--font-client:");
    expect(html).toContain("@font-face");
    expect(html).toMatch(/rel="preload"[^>]+as="font"/u);
    expect(html).toContain("/_astro/fonts/");
  }
  // Changing registrations regenerates Astro's structural config; removal disables preloads.
  project.config.fonts = [];
  expect((await generateRuntime(project)).structuralChange).toBe(true);
  expect((await generateRuntime(project)).structuralChange).toBe(false);
}, 120000);
