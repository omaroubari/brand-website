import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it, vi } from "vitest";

import {
  applyPlan,
  buildPlan,
  ensureGitignore,
  nextSteps,
  type InitAnswers,
} from "../src/cli/init/scaffold.ts";
import { readPackageVersion } from "../src/cli/version.ts";
import { CONFIG_FILENAMES } from "../src/core/project.ts";
import { scanProject } from "../src/core/project-tree.ts";
import { generateRuntime } from "../src/astro/generate.ts";

const roots: string[] = [];
const makeRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), "brandtree-init-"));
  roots.push(root);
  return root;
};
const answers: InitAnswers = {
  directory: ".",
  title: "My Brand",
  packageManager: "pnpm",
};
const log = { info: vi.fn(), success: vi.fn() };
const scaffold = async (root: string, title = answers.title) => {
  await applyPlan(root, await buildPlan(root, { ...answers, title }), log);
  await ensureGitignore(root);
};

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("generates a complete starter with a valid config, project and runtime", async () => {
  const root = await makeRoot();
  const title = 'A "Brand"\nwith Unicode — العربية';
  await scaffold(root, title);
  expect((await readdir(root, { recursive: true })).sort()).toEqual(
    [
      ".gitignore",
      "brandtree.config.ts",
      "package.json",
      "content",
      "content/01-introduction.mdx",
      "content/02-colour.mdx",
      "content/03-typography.mdx",
      "public",
      "public/favicon.svg",
      "public/brand",
      "public/brand/placeholder-dark.svg",
      "public/brand/placeholder-light.svg",
    ].sort(),
  );
  // Mirror installation without a registry or network dependency.
  const modules = join(root, "node_modules");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(modules);
  await symlink(
    fileURLToPath(new URL("../", import.meta.url)),
    join(modules, "brandtree"),
    "dir",
  );
  const project = await scanProject(root, { mode: "build" });
  expect(project.diagnostics).toEqual([]);
  expect(project.droppedPages).toBe(0);
  expect(project.config.brand.meta.name).toBe(title);
  expect(project.config.fonts).toEqual([]);
  expect(project.config.brand.theme).toMatchObject({
    default: "system",
    light: { background: "white", foreground: "black" },
    dark: { background: "black", foreground: "white" },
  });
  const { logo } = project.config.brand;
  for (const path of new Set([
    logo.logotype.onLight,
    logo.logotype.onDark,
    logo.brandmark.onLight,
    logo.brandmark.onDark,
    logo.favicon,
  ])) {
    if (!path) throw new Error("Starter config must provide every logo asset.");
    const svg = await readFile(join(root, "public", path), "utf-8");
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("</svg>");
  }
  expect(project.tree.pages.map((page) => page.route)).toEqual([
    "/introduction",
    "/colour",
    "/typography",
  ]);
  await generateRuntime(project);
  expect(await readdir(join(root, ".brandtree"))).toContain("astro.config.mjs");
  const manifest = JSON.parse(
    await readFile(join(root, "package.json"), "utf-8"),
  );
  expect(manifest).toEqual({
    name: root.split("/").at(-1)!.toLowerCase(),
    private: true,
    type: "module",
    engines: { node: ">=22.12.0" },
    scripts: {
      dev: "brandtree dev",
      build: "brandtree build",
      check: "brandtree check",
      preview: "brandtree preview",
    },
    dependencies: { brandtree: `^${await readPackageVersion()}` },
  });
});

it("rerunning the scaffold preserves every existing file and restores a missing template", async () => {
  const root = await makeRoot();
  await scaffold(root);
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
  // Edit every kind of generated file, including config, artwork and manifest.
  for (const path of files) {
    await writeFile(path, `Authored content for ${path}\n`);
  }
  // Preserve required entries so .gitignore needs no additions on the rerun.
  await writeFile(
    join(root, ".gitignore"),
    "# Custom\nnode_modules/\n.brandtree/\ndist/\n",
  );
  const before = await Promise.all(
    files.map((path) => readFile(path, "utf-8")),
  );
  await scaffold(root, "A different brand");
  expect(
    await Promise.all(files.map((path) => readFile(path, "utf-8"))),
  ).toEqual(before);

  const missingPage = join(root, "content/02-colour.mdx");
  await rm(missingPage);
  await scaffold(root);
  expect(await readFile(missingPage, "utf-8")).toContain("<ColorPalette");
  for (const [index, path] of files.entries()) {
    if (path !== missingPage)
      expect(await readFile(path, "utf-8")).toBe(before[index]);
  }
});

it("reports skipped files instead of reporting them as created on rerun", async () => {
  const root = await makeRoot();
  const plan = await buildPlan(root, answers);
  expect(await applyPlan(root, plan, log)).toEqual({ createdPackage: true });
  log.info.mockClear();
  log.success.mockClear();
  expect(await applyPlan(root, plan, log)).toEqual({ createdPackage: false });
  expect(log.success).not.toHaveBeenCalled();
  expect(log.info.mock.calls).toEqual(
    plan.map(({ path }) => [`Skipped existing ${path}`]),
  );
});

it("appends missing ignore entries once, preserving comments and slash variants", async () => {
  const root = await makeRoot();
  await writeFile(join(root, ".gitignore"), "# Keep this\nnode_modules\ndist/");
  await ensureGitignore(root);
  await ensureGitignore(root);
  expect(await readFile(join(root, ".gitignore"), "utf-8")).toBe(
    "# Keep this\nnode_modules\ndist/\n.brandtree/\n",
  );
});

it.each(CONFIG_FILENAMES)("preserves an existing %s", async (filename) => {
  const root = await makeRoot();
  await writeFile(join(root, filename), "export default {};\n");
  const plan = await buildPlan(root, answers);
  expect(plan.some((file) => file.path.endsWith("brandtree.config.ts"))).toBe(
    false,
  );
  await applyPlan(root, plan, log);
  expect(await readFile(join(root, filename), "utf-8")).toBe(
    "export default {};\n",
  );
  expect(
    (await readdir(root)).filter((path) =>
      path.startsWith("brandtree.config."),
    ),
  ).toEqual([filename]);
});

it("refuses a symlinked content directory before writing files", async () => {
  const root = await makeRoot();
  const outside = await makeRoot();
  await symlink(outside, join(root, "content"), "dir");
  await expect(
    applyPlan(root, await buildPlan(root, answers), log),
  ).rejects.toThrow("real directory");
  expect(await readdir(root)).toEqual(["content"]);
  expect(await readdir(outside)).toEqual([]);
});

it.each([
  ["npm", "npm run dev", "npx"],
  ["pnpm", "pnpm dev", "pnpm exec"],
  ["yarn", "yarn dev", "yarn"],
  ["bun", "bun dev", "bunx"],
] as const)(
  "prints complete %s instructions for new and existing manifests",
  (pm, dev, exec) => {
    expect(nextSteps({ ...answers, packageManager: pm }, true)).toBe(
      `Next steps:\n\n  ${pm} install\n  ${dev}\n`,
    );
    expect(
      nextSteps(
        { ...answers, directory: "my brand", packageManager: pm },
        false,
      ),
    ).toBe(
      `Next steps:\n\n  cd 'my brand'\n  ${pm} add brandtree\n  ${exec} brandtree dev\n`,
    );
  },
);

it("quotes apostrophes in the next-step directory command", () => {
  expect(nextSteps({ ...answers, directory: "client's brand" }, true)).toBe(
    "Next steps:\n\n  cd 'client'\\''s brand'\n  pnpm install\n  pnpm dev\n",
  );
});
