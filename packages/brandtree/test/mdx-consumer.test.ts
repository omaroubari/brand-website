import { afterEach, expect, it } from "vitest";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fixtureConfig from "../../../apps/sandbox/brandtree.config";
import { scanProject } from "../src/core/project-tree";
import { generateRuntime } from "../src/astro/generate";
import { resolveUIStrings } from "../src/core/i18n-ui";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("injects built-in props and preserves explicit custom props in generated dev, check and static builds", async () => {
  const parent = fileURLToPath(new URL("../tmp/", import.meta.url));
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(join(parent, "mdx-consumer-"));
  roots.push(root);
  await Promise.all(
    ["content/en", "content/ar", "components"].map((path) =>
      mkdir(join(root, path), { recursive: true }),
    ),
  );
  const config = structuredClone(fixtureConfig);
  config.fonts = [];
  config.brand.typography.display = "system-ui";
  config.brand.typography.text = "system-ui";
  config.brand.localeOverrides = { ar: { meta: { tagline: "هوية عربية" } } };
  config.seo = { og: { enabled: false } };
  await writeFile(
    join(root, "brandtree.config.ts"),
    `export default ${JSON.stringify(config)};`,
  );
  await writeFile(
    join(root, "components/Summary.astro"),
    `---
import type { BrandtreeBaseComponentProps } from "brandtree/core/mdx";
interface Props extends BrandtreeBaseComponentProps { heading?: string }
const { brand, ui, dir, heading = "Default summary" } = Astro.props;
---
<p data-summary data-dir={dir} data-tagline={brand.meta.tagline} data-ui={ui.typography.letters}>{heading}</p>
`,
  );
  await writeFile(
    join(root, "components/Unrelated.astro"),
    `---
export const brandtreeProps = ["brand", "ui", "dir"];
const keys = Object.keys(Astro.props).join(",");
---
<p data-unrelated={keys}>Unrelated component</p>
`,
  );
  await writeFile(
    join(root, "components/Badge.ts"),
    `
import { createElement } from "react";
import type { BrandtreeBaseComponentProps } from "brandtree/core/mdx";
export default function Badge({ui, dir}: Pick<BrandtreeBaseComponentProps, "ui" | "dir">) {
  return createElement("p", {"data-island": dir}, ui.typography.letters);
}
`,
  );
  await writeFile(
    join(root, "content/_partial.mdx"),
    `---\ntitle: Partial\n---\n<Glyphs />`,
  );
  const content = `---\ntitle: Injection\n---
import Identity from '../../components/Summary.astro';
import Unrelated from '../../components/Unrelated.astro';
import Partial from '../_partial.mdx';
import Badge from '../../components/Badge.ts';

<ColorPalette />

<ColorPalette category="primary" />

<Panel><Identity brand={props.brand} ui={props.ui} dir={props.dir} /><Identity brand={props.brand} ui={props.ui} heading="Our identity" dir="ltr" /><Unrelated /><span data-native="clean" /></Panel>

<Glyphs />

<Partial {...props} />

<Badge ui={props.ui} dir={props.dir} client:load />
`;
  await Promise.all(
    ["en", "ar"].map((locale) =>
      writeFile(join(root, `content/${locale}/guide.mdx`), content),
    ),
  );
  await writeFile(
    join(root, "content/en/fallback.mdx"),
    content.replace("title: Injection", "title: Fallback"),
  );
  await writeFile(
    join(root, "content/en/collision.mdx"),
    `---\ntitle: Collision\n---\nimport ColorPalette from '../../components/Unrelated.astro';\n\n<ColorPalette />`,
  );
  const project = await scanProject(root, { mode: "build" });
  await generateRuntime(project);
  // One process owns each Astro lifecycle. Captured dev HTML exercises the same
  // generated config and original author import paths as the production build.
  const probe = join(project.context.outDir, "verify.mjs");
  await writeFile(
    probe,
    `
delete process.env.VITEST;
process.env.NODE_ENV = 'development';
import { dev, build, sync } from 'astro';
import { check } from '@astrojs/check';
import { writeFile } from 'node:fs/promises';
const root = new URL('./', import.meta.url);
const server = await dev({ root, logLevel: 'silent', server: { host: '127.0.0.1' } });
try {
  const response = await fetch('http://127.0.0.1:' + server.address.port + '/ar/fallback/');
  if (!response.ok) throw new Error('Dev request failed: ' + response.status + await response.text());
  await writeFile(new URL('./dev.html', root), await response.text());
} finally { await server.stop(); }
await sync({root: root.pathname, logLevel: 'silent'});
if (await check({root: root.pathname, tsconfig: new URL('./tsconfig.json', root).pathname, minimumFailingSeverity: 'error'})) throw new Error('Consumer check failed');
process.env.NODE_ENV = 'production';
await build({root, logLevel: 'silent'});
`,
  );
  try {
    await promisify(execFile)(process.execPath, [probe], {
      timeout: 120000,
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (error) {
    console.log((error as { stdout?: string }).stdout);
    throw error;
  }
  const html = async (route: string) =>
    readFile(join(project.context.distDir!, route, "index.html"), "utf8");
  const english = await html("en/guide");
  const arabic = await html("ar/guide");
  const fallback = await html("ar/fallback");
  const dev = await readFile(join(project.context.outDir, "dev.html"), "utf8");
  for (const [page, locale, dir] of [
    [english, "en", "ltr"],
    [arabic, "ar", "rtl"],
    [fallback, "ar", "ltr"],
    [dev, "ar", "ltr"],
  ]) {
    expect(page).toContain(`data-dir="${dir}"`);
    expect(page).toContain(
      `data-ui="${resolveUIStrings(locale!, { defaultLocale: "en" }).typography.letters}"`,
    );
    expect(page).toContain(`data-island="${dir}"`);
    expect(page).toContain("Default summary");
    expect(page).toContain("Our identity");
    expect(page!.match(/data-unrelated(?:="[^"]*")?/u)?.[0]).toMatch(
      /^data-unrelated(?:="")?$/u,
    );
    expect(page).not.toMatch(/\s(?:brand|ui)="\[object Object\]"/u);
    const palettes = page!.split("data-color-palette");
    expect(palettes).toHaveLength(3);
    const swatchCount = (part: string) =>
      (part.match(/data-copy-color=/g) ?? []).length;
    // Both default-all and category-filtered palettes render without author plumbing.
    expect(swatchCount(palettes[1]!)).toBe(config.brand.colors.swatches.length);
    expect(swatchCount(palettes[2]!)).toBe(
      config.brand.colors.swatches.filter(
        (color) => color.category === "primary",
      ).length,
    );
  }
  expect(arabic).toContain('data-tagline="هوية عربية"');
  expect(fallback).toContain('data-tagline="هوية عربية"');
  expect(english).toContain(`data-tagline="${config.brand.meta.tagline}"`);
  expect(
    (await html("en/collision")).match(/data-unrelated(?:="[^"]*")?/u)?.[0],
  ).toMatch(/^data-unrelated(?:="")?$/u);
  const assets = join(project.context.distDir!, "_astro");
  for (const file of await readdir(assets)) {
    if (file.endsWith(".js")) {
      expect(await readFile(join(assets, file), "utf8")).not.toContain(
        "Unknown Brandtree MDX prop",
      );
    }
  }
}, 120000);
