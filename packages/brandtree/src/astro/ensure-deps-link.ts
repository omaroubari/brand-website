import {
  lstat,
  mkdir,
  readdir,
  realpath,
  symlink,
  unlink,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const installedPackageDir = fileURLToPath(new URL("../../", import.meta.url));

const physicalPath = async (path: string): Promise<string | null> => {
  try {
    return await realpath(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return null;
    throw error;
  }
};

const packagePath = async (
  depsDir: string,
  name: string,
): Promise<string | null> => {
  const manifest = await physicalPath(join(depsDir, name, "package.json"));
  return manifest === null ? null : dirname(manifest);
};

// Resolve existing ancestors physically, even before the runtime is created.
const physicalDirectory = async (path: string): Promise<string> => {
  const absolute = resolve(path);
  const physical = await physicalPath(absolute);
  if (physical !== null) return physical;
  const parent = dirname(absolute);
  if (parent === absolute) return absolute;
  return join(await physicalDirectory(parent), absolute.slice(parent.length));
};

/** Walk filesystem lookup locations only; NODE_PATH is not available to ESM. */
const resolvePackage = async (
  from: string,
  name: string,
): Promise<{
  path: string;
  depsDir: string;
} | null> => {
  let directory = await physicalDirectory(from);
  while (true) {
    if (directory.split(/[\\/]/).at(-1) !== "node_modules") {
      const depsDir = join(directory, "node_modules");
      const path = await packagePath(depsDir, name);
      if (path !== null) return { path, depsDir };
    }
    const parent = dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
};

const linkMissingPackage = async (
  directory: string,
  name: string,
  target: string,
) => {
  const destination = join(directory, name);
  try {
    await lstat(destination);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOTDIR") return;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const parent = dirname(destination);
  if (parent !== directory) {
    try {
      const stat = await lstat(parent);
      if (stat.isSymbolicLink() || !stat.isDirectory()) return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  await mkdir(parent, { recursive: true });
  await symlink(await realpath(target), destination, "junction");
};

const linkDependencies = async (
  outDir: string,
  depsDir: string,
  brandtree: string,
) => {
  const link = join(outDir, "node_modules");
  let realDirectory = false;
  try {
    const stat = await lstat(link);
    if (!stat.isSymbolicLink()) {
      if (!stat.isDirectory()) return;
      realDirectory = true;
    } else {
      if (
        (await physicalPath(link)) === (await physicalPath(depsDir)) &&
        (await packagePath(depsDir, "brandtree")) === brandtree
      )
        return;
      await unlink(link);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await mkdir(outDir, { recursive: true });
  if (
    !realDirectory &&
    (await packagePath(depsDir, "brandtree")) === brandtree
  ) {
    await symlink(await realpath(depsDir), link, "junction");
    return;
  }
  // Private dependencies do not include Brandtree itself. Create package links
  // in the runtime, without changing the installed tree or existing entries.
  await mkdir(link, { recursive: true });
  for (const entry of await readdir(depsDir)) {
    if (entry.startsWith(".") || entry === "brandtree") continue;
    const names = entry.startsWith("@")
      ? (await readdir(join(depsDir, entry))).map((name) => `${entry}/${name}`)
      : [entry];
    for (const name of names) {
      const target = await packagePath(depsDir, name);
      if (target !== null) await linkMissingPackage(link, name, target);
    }
  }
  await linkMissingPackage(link, "brandtree", brandtree);
};

/** Repair runtime dependency visibility without installing packages. */
export const ensureDepsLink = async (
  outDir: string,
  packageDir: string = installedPackageDir,
): Promise<string | null> => {
  const brandtree = await realpath(packageDir);
  const candidates = [join(brandtree, "node_modules"), dirname(brandtree)];
  let astro: { path: string; depsDir: string } | null = null;
  let mdx: { path: string; depsDir: string } | null = null;
  for (const depsDir of candidates) {
    const astroPath = await packagePath(depsDir, "astro");
    const mdxPath = await packagePath(depsDir, "@astrojs/mdx");
    if (astro === null && astroPath !== null)
      astro = { path: astroPath, depsDir };
    if (mdx === null && mdxPath !== null) mdx = { path: mdxPath, depsDir };
  }
  if (astro === null) return null;

  const link = join(outDir, "node_modules");
  try {
    if ((await lstat(link)).isSymbolicLink()) {
      const linkedBrandtree = await physicalPath(join(link, "brandtree"));
      if (linkedBrandtree !== null && linkedBrandtree !== brandtree) {
        await unlink(link);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const currentAstro = await resolvePackage(outDir, "astro");
  const currentMdx = await resolvePackage(outDir, "@astrojs/mdx");
  const currentBrandtree = await resolvePackage(outDir, "brandtree");
  const integrationsDir = mdx?.depsDir ?? astro.depsDir;
  const integrationAstro =
    mdx === null ? null : await resolvePackage(mdx.path, "astro");
  if (
    mdx !== null &&
    (integrationAstro === null || integrationAstro.path === astro.path) &&
    currentAstro?.path === astro.path &&
    currentMdx?.path === mdx.path &&
    currentBrandtree?.path === brandtree
  ) {
    return null;
  }

  const directAstro = await packagePath(integrationsDir, "astro");
  const ancestorAstro = await resolvePackage(
    dirname(await physicalDirectory(outDir)),
    "astro",
  );
  if (
    (integrationAstro === null || integrationAstro.path === astro.path) &&
    (directAstro === astro.path ||
      (directAstro === null && ancestorAstro?.path === astro.path))
  ) {
    await linkDependencies(outDir, integrationsDir, brandtree);
    const missing: string[] = [];
    for (const [name, expected] of [
      ["astro", astro.path],
      ["@astrojs/mdx", mdx?.path],
      ["brandtree", brandtree],
    ] as const) {
      const resolved = await resolvePackage(outDir, name);
      if (expected === undefined || resolved?.path !== expected)
        missing.push(name);
    }
    return missing.length === 0
      ? null
      : `Brandtree preserved existing dependency entries in ${link}, but the runtime cannot resolve the required dependencies: ${missing.join(", ")}. Install the missing dependencies or remove conflicting entries and regenerate.`;
  }

  return `Brandtree's Astro (${astro.path}) and MDX (${mdx?.path ?? integrationsDir}) use incompatible dependency trees${integrationAstro ? `; MDX resolves Astro at ${integrationAstro.path}` : ""}. Add a package-manager override for Astro matching Brandtree's version and reinstall dependencies.`;
};
