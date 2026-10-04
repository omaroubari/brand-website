import { afterEach, beforeEach, expect, it } from "vitest";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ensureDepsLink } from "../src/astro/ensure-deps-link";

let root: string;
let brandtree: string;
let deps: string;
let out: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "brandtree-deps-"));
  brandtree = join(root, "installed/node_modules/brandtree");
  deps = join(brandtree, "node_modules");
  out = join(root, "project/.brandtree");
  await mkdir(brandtree, { recursive: true });
  await writeFile(
    join(brandtree, "package.json"),
    JSON.stringify({
      name: "brandtree",
      type: "module",
      exports: "./index.js",
    }),
  );
  await writeFile(join(brandtree, "index.js"), 'export default "brandtree";');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const install = async (directory: string, name: string) => {
  const path = join(directory, name);
  await mkdir(path, { recursive: true });
  await writeFile(join(path, "package.json"), JSON.stringify({ name }));
  return path;
};

const complete = async (directory = deps) => {
  await install(directory, "astro");
  await install(directory, "@astrojs/mdx");
};

const expectDependencies = async (directory = deps) => {
  for (const name of ["astro", "@astrojs/mdx"]) {
    expect(await realpath(join(out, "node_modules", name))).toBe(
      await realpath(join(directory, name)),
    );
  }
  expect(await realpath(join(out, "node_modules/brandtree"))).toBe(
    await realpath(brandtree),
  );
};

it("does not create a runtime when Brandtree's Astro is missing", async () => {
  expect(await ensureDepsLink(out, brandtree)).toBeNull();
  await expect(lstat(out)).rejects.toMatchObject({ code: "ENOENT" });
});

it("does not remove a stale link when Brandtree's Astro is missing", async () => {
  const stale = join(root, "stale/node_modules");
  await install(stale, "brandtree");
  await mkdir(out, { recursive: true });
  await symlink(stale, join(out, "node_modules"), "junction");
  expect(await ensureDepsLink(out, brandtree)).toBeNull();
  expect(await realpath(join(out, "node_modules"))).toBe(await realpath(stale));
});

it("repairs ESM visibility even when CommonJS can find Astro through NODE_PATH", async () => {
  await complete();
  await mkdir(out, { recursive: true });
  const { stdout } = await promisify(execFile)(
    process.execPath,
    ["-e", 'process.stdout.write(require.resolve("astro/package.json"))'],
    { cwd: out, env: { ...process.env, NODE_PATH: deps } },
  );
  expect(stdout).toBe(await realpath(join(deps, "astro/package.json")));
  expect(await ensureDepsLink(out, brandtree)).toBeNull();
  await expectDependencies();
});

it.each(["local", "sibling"])(
  "links a complete %s dependency set and preserves its link",
  async (layout) => {
    const target =
      layout === "local" ? deps : join(root, "installed/node_modules");
    await complete(target);
    expect(await ensureDepsLink(out, brandtree)).toBeNull();
    await expectDependencies(target);
    const before = await lstat(join(out, "node_modules"));
    expect(await ensureDepsLink(out, brandtree)).toBeNull();
    expect((await lstat(join(out, "node_modules"))).ino).toBe(before.ino);
  },
);

it("leaves a complete ancestor layout alone", async () => {
  await complete();
  await symlink(brandtree, join(deps, "brandtree"), "junction");
  await mkdir(join(root, "project"));
  await symlink(deps, join(root, "project/node_modules"), "junction");
  expect(await ensureDepsLink(out, brandtree)).toBeNull();
  await expect(lstat(out)).rejects.toMatchObject({ code: "ENOENT" });
});

it("removes a cache link to a different physical Brandtree installation", async () => {
  await complete();
  const stale = join(root, "stale/node_modules");
  await install(stale, "brandtree");
  await complete(stale);
  await mkdir(out, { recursive: true });
  await symlink(stale, join(out, "node_modules"), "junction");
  expect(await ensureDepsLink(out, brandtree)).toBeNull();
  await expectDependencies();
});

it("repairs a broken link", async () => {
  await complete();
  await mkdir(out, { recursive: true });
  await symlink(join(root, "missing"), join(out, "node_modules"), "junction");
  expect(await ensureDepsLink(out, brandtree)).toBeNull();
  await expectDependencies();
});

it("preserves a real node_modules directory and its contents", async () => {
  await complete();
  const directory = join(out, "node_modules");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "sentinel"), "keep");
  const before = await lstat(directory);
  expect(await ensureDepsLink(out, brandtree)).toBeNull();
  expect((await lstat(directory)).isSymbolicLink()).toBe(false);
  expect((await lstat(directory)).ino).toBe(before.ino);
  expect(await readFile(join(directory, "sentinel"), "utf8")).toBe("keep");
  await expectDependencies();
});

it("warns when an existing real Astro package prevents repair", async () => {
  await complete();
  const directory = join(out, "node_modules");
  await install(directory, "astro");
  await writeFile(join(directory, "sentinel"), "keep");
  expect(await ensureDepsLink(out, brandtree)).toContain(
    "required dependencies: astro",
  );
  expect((await lstat(join(directory, "astro"))).isSymbolicLink()).toBe(false);
  expect(await readFile(join(directory, "sentinel"), "utf8")).toBe("keep");
});

it("warns when a broken caller-owned package link prevents repair", async () => {
  await complete();
  await mkdir(join(out, "node_modules"), { recursive: true });
  await symlink(
    join(root, "missing"),
    join(out, "node_modules/astro"),
    "junction",
  );
  expect(await ensureDepsLink(out, brandtree)).toContain(
    "required dependencies: astro",
  );
  expect((await lstat(join(out, "node_modules/astro"))).isSymbolicLink()).toBe(
    true,
  );
});

it.each(["missing", "private-link"])(
  "supports ESM imports of Brandtree in an external runtime with %s node_modules",
  async (layout) => {
    await complete();
    await mkdir(out, { recursive: true });
    if (layout === "private-link")
      await symlink(deps, join(out, "node_modules"), "junction");
    expect(await ensureDepsLink(out, brandtree)).toBeNull();
    await expectDependencies();
    // The installed package's private dependency directory must remain untouched.
    await expect(lstat(join(deps, "brandtree"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    const script = join(out, "probe.mjs");
    await writeFile(
      script,
      'import brandtree from "brandtree"; process.stdout.write(brandtree);',
    );
    const { stdout } = await promisify(execFile)(process.execPath, [script], {
      env: { ...process.env, NODE_PATH: "" },
    });
    expect(stdout).toBe("brandtree");
  },
);

it("reports a missing installed MDX integration", async () => {
  await install(deps, "astro");
  expect(await ensureDepsLink(out, brandtree)).toContain(
    "required dependencies: @astrojs/mdx",
  );
});

it("reports a blocked integration scope without replacing caller-owned entries", async () => {
  await complete();
  const directory = join(out, "node_modules");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "@astrojs"), "keep");
  expect(await ensureDepsLink(out, brandtree)).toContain(
    "required dependencies: @astrojs/mdx",
  );
  expect(await readFile(join(directory, "@astrojs"), "utf8")).toBe("keep");
});

it("links split integrations when the same physical Astro is reachable through ancestors", async () => {
  const astro = await install(deps, "astro");
  const siblings = join(root, "installed/node_modules");
  await install(siblings, "@astrojs/mdx");
  const ancestorDeps = join(root, "node_modules");
  await mkdir(ancestorDeps);
  await symlink(astro, join(ancestorDeps, "astro"), "junction");
  expect(await ensureDepsLink(out, brandtree)).toBeNull();
  expect(await realpath(join(out, "node_modules/@astrojs/mdx"))).toBe(
    await realpath(join(siblings, "@astrojs/mdx")),
  );
  expect(await realpath(join(out, "node_modules/brandtree"))).toBe(
    await realpath(brandtree),
  );
});

it("warns without creating a link when split MDX binds to another Astro", async () => {
  await install(deps, "astro");
  const siblings = join(root, "installed/node_modules");
  await complete(siblings);
  const warning = await ensureDepsLink(out, brandtree);
  expect(warning).toContain("incompatible dependency trees");
  expect(warning).toContain("override");
  expect(warning).toContain("reinstall");
  await expect(lstat(out)).rejects.toMatchObject({ code: "ENOENT" });
});

it("checks the Astro bound to the physical MDX package behind a symlink", async () => {
  await install(deps, "astro");
  const isolatedDeps = join(root, "isolated/node_modules");
  const mdx = await install(isolatedDeps, "@astrojs/mdx");
  await install(isolatedDeps, "astro");
  await mkdir(join(deps, "@astrojs"));
  await symlink(mdx, join(deps, "@astrojs/mdx"), "junction");
  expect(await ensureDepsLink(out, brandtree)).toContain(
    "incompatible dependency trees",
  );
  await expect(lstat(out)).rejects.toMatchObject({ code: "ENOENT" });
});

it("walks the physical ancestors of a symlinked runtime", async () => {
  await complete();
  const physicalRuntime = join(brandtree, ".brandtree");
  await mkdir(physicalRuntime);
  await mkdir(join(root, "project"));
  await symlink(physicalRuntime, out, "junction");
  expect(await ensureDepsLink(out, brandtree)).toBeNull();
  await expect(
    lstat(join(physicalRuntime, "node_modules")),
  ).rejects.toMatchObject({ code: "ENOENT" });
});
