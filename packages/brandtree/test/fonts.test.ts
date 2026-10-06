import { afterEach, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fontsConfigSchema } from "../src/core/schema";
import { scanProject } from "../src/core/project-tree";
import { generateRuntime } from "../src/astro/generate";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("defaults to system fonts and rejects malformed registrations", () => {
  expect(fontsConfigSchema.parse(undefined)).toEqual([]);
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
