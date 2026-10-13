import { afterEach, expect, it, vi } from "vitest";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import fixtureConfig from "../../../apps/sandbox/brandtree.config";
import { scanProject } from "../src/core/project-tree";
import { generateRuntime } from "../src/astro/generate";

const { beforeRename } = vi.hoisted(() => ({ beforeRename: vi.fn() }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    rename: async (from: string, to: string) => {
      await beforeRename(from, to);
      return actual.rename(from, to);
    },
  };
});

const roots: string[] = [];
afterEach(async () => {
  beforeRename.mockReset();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function setup() {
  const runtimeDir = await mkdtemp(join(tmpdir(), "brandtree-atomic-"));
  roots.push(runtimeDir);
  await writeFile(
    join(runtimeDir, "brandtree.config.mjs"),
    `export default ${JSON.stringify({ ...fixtureConfig, fonts: [], seo: { og: { enabled: false } } })};`,
  );
  const project = await scanProject(runtimeDir, { mode: "dev" });
  await generateRuntime(project);
  const target = join(project.context.outDir, "src/generated/data.json");
  return { project, target, runtimeDir };
}

it("keeps the complete previous file readable until its replacement is published", async () => {
  const { project, target } = await setup();
  const previous = await readFile(target, "utf8");
  project.config.brand.meta.name = "Updated name";
  beforeRename.mockImplementation(
    async (temporary: string, destination: string) => {
      if (destination !== target) return;
      expect(await readFile(target, "utf8")).toBe(previous);
      expect(
        JSON.parse(await readFile(temporary, "utf8")).config.brand.meta.name,
      ).toBe("Updated name");
    },
  );
  await generateRuntime(project);
  expect(beforeRename).toHaveBeenCalledWith(
    expect.stringMatching(/\.tmp$/u),
    target,
  );
  expect(
    JSON.parse(await readFile(target, "utf8")).config.brand.meta.name,
  ).toBe("Updated name");
  expect(
    (await readdir(join(project.context.outDir, "src/generated"))).filter(
      (file) => file.endsWith(".tmp"),
    ),
  ).toEqual([]);
});

it("preserves the previous file and removes temporary output when publication fails", async () => {
  const { project, target } = await setup();
  const previous = await readFile(target, "utf8");
  project.config.brand.meta.name = "Unpublished name";
  beforeRename.mockImplementation(
    async (_temporary: string, destination: string) => {
      if (destination === target) throw new Error("Publication failed");
    },
  );
  await expect(generateRuntime(project)).rejects.toThrow("Publication failed");
  expect(await readFile(target, "utf8")).toBe(previous);
  expect(
    (await readdir(join(project.context.outDir, "src/generated"))).filter(
      (file) => file.endsWith(".tmp"),
    ),
  ).toEqual([]);
});

it("leaves unchanged output untouched", async () => {
  const { project, target } = await setup();
  const previous = await stat(target);
  beforeRename.mockClear();
  expect((await generateRuntime(project)).structuralChange).toBe(false);
  expect(beforeRename).not.toHaveBeenCalled();
  expect((await stat(target)).mtimeMs).toBe(previous.mtimeMs);
});
