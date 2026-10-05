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
import { generateRuntime } from "../src/astro/generate";
import { scanProject } from "../src/core/project-tree";
import { getNavigation } from "../src/core/navigation";
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
    "getNavigation",
    `${js}\nreturn getStaticPaths();`,
  )(JSON.parse(buildRuntimeData(project)), getNavigation);
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
  const localized = join(pages, "[lang]/index.astro");

  expect((await generateRuntime(project)).structuralChange).toBe(true);
  expect(await readFile(join(pages, "index.astro"), "utf8")).toContain(
    'from "brandtree:data"',
  );
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
  const source = await readFile(localized, "utf8");
  expect(
    localePaths(source, project).map(
      (path: { params: { lang: string } }) => path.params.lang,
    ),
  ).toEqual(["en", "ar"]);
  expect((await generateRuntime(project)).structuralChange).toBe(false);

  project.config.i18n!.hideDefaultLocalePrefix = true;
  expect(
    localePaths(source, project).map(
      (path: { params: { lang: string } }) => path.params.lang,
    ),
  ).toEqual(["ar"]);

  delete project.config.i18n;
  expect((await generateRuntime(project)).structuralChange).toBe(true);
  await expect(readFile(localized, "utf8")).rejects.toMatchObject({
    code: "ENOENT",
  });
  expect((await generateRuntime(project)).structuralChange).toBe(false);
});
