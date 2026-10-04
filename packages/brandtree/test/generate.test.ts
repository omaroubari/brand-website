import { afterEach, expect, it } from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
  mkdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ts from "typescript";
import { scanProject } from "../src/core/project-tree";
import { generateRuntime } from "../src/astro/generate";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.map((root) => rm(root, { recursive: true, force: true })),
  );
  roots.length = 0;
});

it.each(["missing", "real"])(
  "makes dependency imports visible in an external runtime with %s node_modules",
  async (layout) => {
    const runtimeDir = await mkdtemp(
      join(tmpdir(), "brandtree-dependency-runtime-"),
    );
    roots.push(runtimeDir);
    const project = await scanProject(
      fileURLToPath(new URL("../../../apps/sandbox/", import.meta.url)),
      { mode: "build", runtimeDir },
    );
    if (layout === "real") {
      await mkdir(join(runtimeDir, "node_modules"));
      await writeFile(join(runtimeDir, "node_modules/sentinel"), "keep");
    }
    expect((await generateRuntime(project)).warnings).toEqual([]);
    const config = ts.readConfigFile(
      join(runtimeDir, "tsconfig.json"),
      ts.sys.readFile,
    );
    expect(
      ts.parseJsonConfigFileContent(config.config, ts.sys, runtimeDir).errors,
    ).toEqual([]);
    const specifiers = [
      "brandtree",
      "astro/config",
      "@astrojs/mdx",
      "@astrojs/react",
      "@tailwindcss/vite",
    ];
    const probe = join(runtimeDir, "probe.mjs");
    await writeFile(
      probe,
      `process.stdout.write(JSON.stringify(${JSON.stringify(specifiers)}.map(name => import.meta.resolve(name))));`,
    );
    const { stdout } = await promisify(execFile)(process.execPath, [probe], {
      env: { ...process.env, NODE_PATH: "" },
    });
    expect(JSON.parse(stdout)).toEqual(
      specifiers.map((name) => import.meta.resolve(name)),
    );
    if (layout === "real")
      expect(
        await readFile(join(runtimeDir, "node_modules/sentinel"), "utf8"),
      ).toBe("keep");
  },
);

it("surfaces dependency repair warnings from the generator", async () => {
  const runtimeDir = await mkdtemp(
    join(tmpdir(), "brandtree-dependency-warning-"),
  );
  roots.push(runtimeDir);
  const project = await scanProject(
    fileURLToPath(new URL("../../../apps/sandbox/", import.meta.url)),
    { mode: "build", runtimeDir },
  );
  await mkdir(join(runtimeDir, "node_modules/astro"), { recursive: true });
  await writeFile(
    join(runtimeDir, "node_modules/astro/package.json"),
    '{"name":"astro"}',
  );
  const result = await generateRuntime(project);
  expect(result.warnings).toHaveLength(1);
  expect(result.warnings[0]).toContain("required dependencies: astro");
});
