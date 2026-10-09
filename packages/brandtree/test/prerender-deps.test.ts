import { execFile, spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, it } from "vitest";
import { createBuilder } from "vite";
import { prerenderDeps } from "../src/astro/prerender-deps.ts";

const roots: string[] = [];
const hasBun = spawnSync("bun", ["--version"]).status === 0;
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("preserves private and project dependency versions, ESM exports, and dynamic imports", async () => {
  const root = await mkdtemp(join(tmpdir(), "brandtree-prerender deps-"));
  roots.push(root);
  const runtime = join(root, ".brandtree");
  await mkdir(runtime);
  await writeFile(join(root, "package.json"), '{"type":"module"}');
  const install = async (directory: string, value: string) => {
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify({
        name: "shared-dep",
        type: "module",
        exports: {
          ".": { import: "./index.js", require: "./require.cjs" },
          "./label": "./label.js",
        },
      }),
    );
    await writeFile(
      join(directory, "index.js"),
      `export default ${JSON.stringify(value)};`,
    );
    await writeFile(
      join(directory, "label.js"),
      `export default ${JSON.stringify(`${value} subpath`)};`,
    );
    await writeFile(
      join(directory, "require.cjs"),
      `module.exports = ${JSON.stringify(`${value} require`)};`,
    );
  };
  await install(join(root, "node_modules/shared-dep"), "project");
  const framework = join(runtime, "node_modules/framework");
  await mkdir(framework, { recursive: true });
  await writeFile(
    join(framework, "package.json"),
    '{"name":"framework","type":"module","exports":"./index.js"}',
  );
  await install(join(framework, "node_modules/shared-dep"), "private");
  await writeFile(
    join(framework, "require.cjs"),
    'module.exports = require("shared-dep");',
  );
  await writeFile(
    join(framework, "index.js"),
    'import value from "shared-dep"; import required from "./require.cjs"; export { required }; export default value; export const dynamic = async () => (await import("shared-dep/label")).default;',
  );
  const entry = join(root, "entry.js");
  await writeFile(
    entry,
    `import value from "shared-dep"; import framework, { dynamic, required } from ${JSON.stringify(join(framework, "index.js"))}; import { basename } from "node:path"; console.log(JSON.stringify([value, framework, await dynamic(), required, basename("/a/b")]));`,
  );
  const builder = await createBuilder({
    configFile: false,
    root: runtime,
    logLevel: "silent",
    plugins: [prerenderDeps()],
    environments: {
      prerender: {
        consumer: "server",
        resolve: { external: ["shared-dep"], noExternal: ["framework"] },
        build: {
          ssr: entry,
          outDir: join(root, "dist"),
          minify: false,
          rolldownOptions: { output: { entryFileNames: "entry.mjs" } },
        },
      },
    },
  });
  await builder.build(builder.environments.prerender!);
  const output = join(root, "dist/entry.mjs");
  const { stdout } = await promisify(execFile)(process.execPath, [output], {
    env: { ...process.env, NODE_PATH: "" },
  });
  expect(JSON.parse(stdout)).toEqual([
    "project",
    "private",
    "private subpath",
    "private require",
    "b",
  ]);
  expect(await readFile(output, "utf8")).toContain("file:");
}, 30_000);

it.skipIf(!hasBun)(
  "preserves dependency ownership with Bun's actual isolated linker",
  async () => {
    const root = await mkdtemp(join(tmpdir(), "brandtree-bun-prerender-"));
    roots.push(root);
    const projectDep = join(root, "fixtures/project-dep");
    const privateDep = join(root, "fixtures/private-dep");
    const framework = join(root, "fixtures/framework");
    const runtime = join(root, ".brandtree");
    await mkdir(runtime);
    for (const [directory, version, value] of [
      [projectDep, "1.0.0", "project"],
      [privateDep, "2.0.0", "private"],
    ]) {
      await mkdir(directory!, { recursive: true });
      await writeFile(
        join(directory!, "package.json"),
        JSON.stringify({
          name: "shared-dep",
          version,
          type: "module",
          exports: "./index.js",
        }),
      );
      await writeFile(
        join(directory!, "index.js"),
        `export default ${JSON.stringify(value)};`,
      );
    }
    await mkdir(framework);
    await writeFile(
      join(framework, "package.json"),
      JSON.stringify({
        name: "framework",
        version: "1.0.0",
        type: "module",
        exports: "./index.js",
        dependencies: { "shared-dep": "file:../private-dep" },
      }),
    );
    await writeFile(
      join(framework, "index.js"),
      'export { default } from "shared-dep";',
    );
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({
        type: "module",
        dependencies: {
          "shared-dep": "file:./fixtures/project-dep",
          framework: "file:./fixtures/framework",
        },
      }),
    );
    await promisify(execFile)(
      "bun",
      ["install", "--linker", "isolated", "--ignore-scripts"],
      { cwd: root },
    );
    expect(await realpath(join(root, "node_modules/framework"))).toContain(
      ".bun",
    );
    const entry = join(root, "entry.js");
    await writeFile(
      entry,
      'import project from "shared-dep"; import framework from "framework"; console.log(JSON.stringify([project, framework]));',
    );
    const builder = await createBuilder({
      configFile: false,
      root: runtime,
      logLevel: "silent",
      plugins: [prerenderDeps()],
      environments: {
        prerender: {
          consumer: "server",
          resolve: { external: ["shared-dep"], noExternal: ["framework"] },
          build: {
            ssr: entry,
            outDir: join(root, "dist"),
            rolldownOptions: { output: { entryFileNames: "entry.mjs" } },
          },
        },
      },
    });
    await builder.build(builder.environments.prerender!);
    for (const executable of [process.execPath, "bun"]) {
      const { stdout } = await promisify(execFile)(
        executable,
        [join(root, "dist/entry.mjs")],
        { env: { ...process.env, NODE_PATH: "" } },
      );
      expect(JSON.parse(stdout)).toEqual(["project", "private"]);
    }
  },
  30_000,
);

it("loads sharp and Takumi native dependencies through isolated package links", async () => {
  const root = await mkdtemp(join(tmpdir(), "brandtree-native-prerender-"));
  roots.push(root);
  const owner = join(root, "store/native-owner");
  const runtime = join(root, ".brandtree");
  await mkdir(join(owner, "node_modules"), { recursive: true });
  await mkdir(join(runtime, "node_modules"), { recursive: true });
  await writeFile(
    join(owner, "package.json"),
    '{"name":"native-owner","type":"module","exports":"./index.js"}',
  );
  const require = createRequire(import.meta.url);
  const astroRequire = createRequire(require.resolve("astro"));
  const takumi = dirname(dirname(await realpath(require.resolve("takumi-js"))));
  const sharp = dirname(dirname(await realpath(astroRequire.resolve("sharp"))));
  await symlink(takumi, join(owner, "node_modules/takumi-js"), "junction");
  await symlink(sharp, join(owner, "node_modules/sharp"), "junction");
  await symlink(owner, join(runtime, "node_modules/native-owner"), "junction");
  await writeFile(
    join(owner, "index.js"),
    `
    let sharp;
    try { sharp = (await import("sharp")).default; } catch (error) { throw new Error("Image service could not load Sharp", { cause: error }); }
    import { render } from "takumi-js";
    const png = await render({ type: "container", style: { backgroundColor: "red", width: 8, height: 8 } }, { width: 8, height: 8, format: "png" });
    const metadata = await sharp(png).metadata();
    console.log(JSON.stringify([metadata.width, metadata.height, metadata.format]));
  `,
  );
  const builder = await createBuilder({
    configFile: false,
    root: runtime,
    logLevel: "silent",
    plugins: [prerenderDeps()],
    environments: {
      prerender: {
        consumer: "server",
        resolve: {
          external: ["takumi-js"],
          noExternal: ["native-owner"],
        },
        build: {
          ssr: join(owner, "index.js"),
          outDir: join(root, "dist"),
          // Astro externalizes Sharp before the resolver plugins run.
          rolldownOptions: {
            external: ["sharp"],
            output: { entryFileNames: "entry.mjs" },
          },
        },
      },
    },
  });
  await builder.build(builder.environments.prerender!);
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [join(root, "dist/entry.mjs")],
    { env: { ...process.env, NODE_PATH: "" } },
  );
  expect(JSON.parse(stdout)).toEqual([8, 8, "png"]);
}, 30_000);
