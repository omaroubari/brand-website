import { afterEach, expect, it } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { indexPageTemplate } from "../src/astro/templates/index";
import { generateRuntime } from "../src/astro/generate";
import { scanProject } from "../src/core/project-tree";
import { getCoverPagePaths } from "../src/core/rendering";
import type { BrandtreeProject } from "../src/core/project-tree";
import { buildRuntimeData } from "../src/astro/build-runtime-data";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

// Execute the generated route's path projection, rather than inspecting strings.
function localePaths(source: string, project: BrandtreeProject) {
  const frontmatter = source.split("---")[1]!;
  const ast = ts.createSourceFile(
    "index.ts",
    frontmatter,
    ts.ScriptTarget.Latest,
    true,
  );
  const paths = ast.statements.find(
    (node) =>
      ts.isFunctionDeclaration(node) && node.name?.text === "getStaticPaths",
  )!;
  const js = ts.transpile(paths.getText(ast).replace(/^export /, ""), {
    target: ts.ScriptTarget.ESNext,
  });
  return new Function(
    "data",
    "getCoverPagePaths",
    `${js}\nreturn getStaticPaths();`,
  )(JSON.parse(buildRuntimeData(project)), getCoverPagePaths);
}

it("generates locale covers, respects the default prefix, and removes disabled locale routes", async () => {
  const root = await mkdtemp(join(tmpdir(), "brandtree-index-"));
  roots.push(root);
  await mkdir(join(root, "node_modules"));
  await symlink(
    fileURLToPath(new URL("../", import.meta.url)),
    join(root, "node_modules/brandtree"),
    "dir",
  );
  const configPath = fileURLToPath(
    new URL("../../../apps/sandbox/brandtree.config.ts", import.meta.url),
  );
  await writeFile(
    join(root, "brandtree.config.ts"),
    `export { default } from ${JSON.stringify(configPath)};`,
  );
  await mkdir(join(root, "content/en"), { recursive: true });
  await writeFile(join(root, "content/en/index.md"), "# Home\n");
  const project = await scanProject(root, { mode: "build" });
  const pages = join(project.context.outDir, "src/pages");
  const index = join(pages, "[...base]/index.astro");

  expect((await generateRuntime(project)).structuralChange).toBe(true);
  expect(await readFile(index, "utf8")).toContain('from "brandtree:data"');
  const dataPath = join(project.context.outDir, "src/generated/data.json");
  const data = JSON.parse(await readFile(dataPath, "utf8"));
  expect(data.config).toEqual(JSON.parse(JSON.stringify(project.config)));
  expect(data.tree.pages).toEqual(project.tree.pages);
  expect(new Map(data.tree.routes)).toEqual(project.tree.routes);
  expect(
    await readFile(join(project.context.outDir, "astro.config.mjs"), "utf8"),
  ).toContain(`"brandtree:data": ${JSON.stringify(dataPath)}`);
  expect(
    await readFile(join(project.context.outDir, "src/env.d.ts"), "utf8"),
  ).toContain('declare module "brandtree:data"');
  await expect(
    readFile(join(project.context.outDir, "src/project.ts"), "utf8"),
  ).rejects.toMatchObject({ code: "ENOENT" });
  // Load the generated config and resolve the alias through Vite itself.
  const generatedConfig = (
    await import(
      pathToFileURL(join(project.context.outDir, "astro.config.mjs")).href
    )
  ).default;
  expect(generatedConfig.vite.resolve.alias["brandtree:data"]).toBe(dataPath);
  expect(generatedConfig.i18n).toEqual({
    defaultLocale: "en",
    locales: ["en", "ar"],
    routing: "manual",
  });
  expect(
    await readFile(join(project.context.outDir, "src/middleware.ts"), "utf8"),
  ).toContain("defineMiddleware((_context, next) => next())");
  const frameworkRequire = createRequire(
    import.meta.resolve("astro/package.json"),
  );
  const { createServer } = await import(frameworkRequire.resolve("vite"));
  const server = await createServer({
    configFile: false,
    root: project.context.outDir,
    resolve: generatedConfig.vite.resolve,
    server: { middlewareMode: true, watch: null },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    expect((await server.ssrLoadModule("brandtree:data")).default).toEqual(
      data,
    );
  } finally {
    await server.close();
  }
  const typeProbe = join(project.context.outDir, "src/data-probe.ts");
  await writeFile(
    typeProbe,
    `import data from "brandtree:data";
const name: string = data.config.brand.meta.name;
const route: [string, string] | undefined = data.tree.routes[0];
// @ts-expect-error JSON routes are serialized entries, not a Map.
data.tree.routes.get("/");
`,
  );
  const program = ts.createProgram(
    [typeProbe, join(project.context.outDir, "src/env.d.ts")],
    {
      noEmit: true,
      // Match Astro's source-import support when another test rebuilds dist.
      allowImportingTsExtensions: true,
      strict: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: [],
    },
  );
  expect(
    ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      ),
  ).toEqual([]);
  const source = await readFile(index, "utf8");
  expect(
    localePaths(source, project).map(
      (path: { params: unknown }) => path.params,
    ),
  ).toEqual([{ base: undefined }, { base: "en" }, { base: "ar" }]);
  expect((await generateRuntime(project)).structuralChange).toBe(false);
  // Remove covers emitted by both previous generator layouts.
  for (const legacy of [
    "index.astro",
    "[lang]/index.astro",
    "[...cover].astro",
    "[...base]/[lang]/index.astro",
  ]) {
    const path = join(pages, legacy);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, "legacy cover");
  }
  expect((await generateRuntime(project)).structuralChange).toBe(true);
  for (const legacy of [
    "index.astro",
    "[lang]/index.astro",
    "[...cover].astro",
    "[...base]/[lang]/index.astro",
  ]) {
    await expect(readFile(join(pages, legacy), "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
  }
  delete project.config.i18n;
  expect(
    localePaths(source, project).map(
      (path: { params: unknown }) => path.params,
    ),
  ).toEqual([{ base: undefined }]);
  await generateRuntime(project);
  expect((await generateRuntime(project)).structuralChange).toBe(false);
}, 30_000);

it("projects normalized mount paths and redirect flags through one cover route", async () => {
  const project = await scanProject(
    fileURLToPath(new URL("../../../apps/sandbox/", import.meta.url)),
    { mode: "build" },
  );
  const source = indexPageTemplate();
  for (const [basePath, mount] of [
    ["", ""],
    ["/", ""],
    ["//brand///guide/", "brand/guide"],
  ]) {
    project.config.basePath = basePath;
    const paths = localePaths(source, project);
    expect(paths.map((path: { params: unknown }) => path.params)).toEqual([
      { base: mount || undefined },
      { base: mount ? mount + "/en" : "en" },
      { base: mount ? mount + "/ar" : "ar" },
    ]);
    expect(
      paths.map(
        (path: { props: { redirect: boolean } }) => path.props.redirect,
      ),
    ).toEqual([true, false, false]);
  }
  project.config.i18n!.hideDefaultLocalePrefix = true;
  const hidden = localePaths(source, project);
  expect(hidden.map((path: { params: unknown }) => path.params)).toEqual([
    { base: "brand/guide" },
    { base: "brand/guide/ar" },
  ]);
  expect(
    hidden.map((path: { props: { redirect: boolean } }) => path.props.redirect),
  ).toEqual([false, false]);
  delete project.config.i18n;
  expect(
    localePaths(source, project).map(
      (path: { params: unknown }) => path.params,
    ),
  ).toEqual([{ base: "brand/guide" }]);
});

const routeScenarios = [
  "single",
  "dir-hidden",
  "dir-prefixed",
  "dot-hidden",
  "dot-prefixed",
].flatMap((mode) =>
  ["", "/brand", "/brand/guide"].map((basePath) => ({ mode, basePath })),
);

it.each(routeScenarios)(
  "builds public routes with $mode localization and basePath '$basePath'",
  async ({ mode, basePath }) => {
    const temporaryRoot = fileURLToPath(new URL("../tmp/", import.meta.url));
    await mkdir(temporaryRoot, { recursive: true });
    const root = await mkdtemp(join(temporaryRoot, "route-build-"));
    roots.push(root);
    const configPath = fileURLToPath(
      new URL("../../../apps/sandbox/brandtree.config.ts", import.meta.url),
    );
    const single = mode === "single";
    const hidden = mode.endsWith("hidden");
    const parser = mode.startsWith("dot") ? "dot" : "dir";
    await writeFile(
      join(root, "brandtree.config.ts"),
      `import config from ${JSON.stringify(configPath)};
export default { ...config, brand: { ...config.brand, localeOverrides: undefined }, basePath: ${JSON.stringify(basePath)}, fonts: [], seo: { ...config.seo, og: { enabled: false } },
i18n: ${single ? "undefined" : `{ ...config.i18n, parser: "${parser}", hideDefaultLocalePrefix: ${hidden} }`} };`,
    );
    const author = async (logical: string, locale: string, body: string) => {
      const file = single
        ? logical
        : parser === "dir"
          ? `${locale}/${logical}`
          : logical.replace(/\.md$/, `.${locale}.md`);
      const target = join(root, "content", file);
      await mkdir(join(target, ".."), { recursive: true });
      await writeFile(target, body);
    };
    for (const locale of single ? [""] : ["en", "ar"]) {
      await author("index.md", locale, "# Authored root index\n");
      if (basePath) {
        await author(
          `${basePath.slice(1)}/index.md`,
          locale,
          "# Overlapping landing\n",
        );
        await author(
          `${basePath.slice(1)}/start.md`,
          locale,
          "# Overlapping content\n",
        );
      }
      await author("01-guide.md", locale, "# Root guide\n");
      await author("02-logo/index.md", locale, "# Nested landing\n");
      await author("02-logo/01-mark.md", locale, "# Nested mark\n");
      await author(
        "02-logo/02-usage/01-clearspace.md",
        locale,
        "# Deep clearspace\n",
      );
      await author(
        "03-secret.md",
        locale,
        "---\nhidden: true\n---\n# Hidden route\n",
      );
      await author(
        "04-old-name.md",
        locale,
        `---\nslug: ${locale === "ar" ? "bidaya" : "renamed"}\n---\n# Slug override\n`,
      );
      await author(
        "05-draft.md",
        locale,
        "---\ndraft: true\n---\n# Draft route\n",
      );
    }
    await author("06-fallback.md", single ? "" : "en", "# Fallback content\n");
    if (!single) {
      const target = join(root, "content/07-shared.$.md");
      await writeFile(target, "# Shared content\n");
    }
    const project = await scanProject(root, { mode: "build" });
    await generateRuntime(project);
    await promisify(execFile)(
      process.execPath,
      [
        fileURLToPath(
          new URL("./bin/astro.mjs", import.meta.resolve("astro/package.json")),
        ),
        "build",
        "--root",
        project.context.outDir,
      ],
      { cwd: root },
    );
    const dist = join(root, "dist");
    const htmlAt = (route: string) =>
      readFile(join(dist, route.slice(1), "index.html"), "utf8");
    const missing = async (route: string) => {
      await expect(htmlAt(route)).rejects.toMatchObject({ code: "ENOENT" });
    };
    const mount = basePath || "/";
    const mountHtml = await htmlAt(mount);
    if (!single && !hidden) {
      expect(mountHtml).toContain(`url=${basePath}/en`);
    } else {
      expect(mountHtml).toContain(project.config.brand.meta.documentTitle);
    }
    for (const locale of single ? [""] : ["en", "ar"]) {
      const prefix = `${basePath}${locale && !(hidden && locale === "en") ? `/${locale}` : ""}`;
      const cover = await htmlAt(prefix || "/");
      expect(cover).toContain(`href="${prefix}/guide"`);
      expect(cover).toContain(`href="${prefix}/logo"`);
      expect(cover).not.toContain(`href="${prefix}/secret"`);
      expect(cover).not.toContain("Authored root index");
      for (const [slug, title] of [
        ["guide", "Root guide"],
        ["logo", "Nested landing"],
        ["logo/mark", "Nested mark"],
        ["logo/usage/clearspace", "Deep clearspace"],
        ["secret", "Hidden route"],
        [locale === "ar" ? "bidaya" : "renamed", "Slug override"],
        ["fallback", "Fallback content"],
        ...(basePath
          ? [
              [basePath.slice(1), "Overlapping landing"],
              [`${basePath.slice(1)}/start`, "Overlapping content"],
            ]
          : []),
        ...(!single ? [["shared", "Shared content"]] : []),
      ]) {
        const route = `${prefix}/${slug}`;
        const html = await htmlAt(route);
        expect(html).toContain(title);
        expect(html).toContain(
          `rel="canonical" href="${project.config.brand.meta.url}${route}"`,
        );
        if (locale) expect(html).toContain(`lang="${locale}"`);
        if (!single && title === "Slug override") {
          const otherRoute =
            locale === "ar"
              ? `${basePath}${hidden ? "" : "/en"}/renamed`
              : `${basePath}/ar/bidaya`;
          expect(html).toContain(`href="${otherRoute}"`);
          expect(html).toContain(
            `href="${project.config.brand.meta.url}${otherRoute}" hreflang="${locale === "ar" ? "en" : "ar"}"`,
          );
        }
      }
      await missing(`${prefix}/draft`);
      await missing(`${prefix}/old-name`);
      await missing(`${prefix}/logo/index`);
      if (locale) await missing(`${prefix}/guide.${locale}`);
      if (locale === "ar") await missing(`${prefix}/renamed`);
      if (locale === "en") await missing(`${prefix}/bidaya`);
    }
    if (hidden) await missing(`${basePath}/en`);
    if (basePath) {
      await missing("/");
      await missing("/guide");
      if (!single) await missing("/ar/guide");
    }
  },
  60_000,
);
