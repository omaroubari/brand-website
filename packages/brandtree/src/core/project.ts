import { existsSync } from "node:fs";

import { isAbsolute, join, resolve } from "pathe";

import type { ProjectContext } from "./types.ts";
import type { ResolvedConfig } from "./schema.ts";
import { collectConfigAssetReferences } from "./config-assets.ts";

export const CONFIG_FILENAMES = new Array(
  "brandtree.config.ts",
  "brandtree.config.mts",
  "brandtree.config.js",
  "brandtree.config.mjs",
  "brandtree.config.cjs",
);

const THEME_FILENAMES = ["theme.css"];
export const COMPONENTS_FILENAMES = ["components.tsx", "components.ts"];

const firstExisting = (root: string, names: string[]): string | null => {
  for (const name of names) {
    const candidate = join(root, name);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

/** Locate the Brandtree config file for a project root, if any. */
export const findConfigFile = (root: string): string | null =>
  firstExisting(root, CONFIG_FILENAMES);

/**
 * Resolve the generated runtime directory for a project. Defaults to
 * `<root>/.brandtree`; an override may be relative to the root or absolute.
 */
export const resolveRuntimeDir = (
  root: string,
  runtimeDir = ".brandtree",
): string =>
  isAbsolute(runtimeDir) ? runtimeDir : join(resolve(root), runtimeDir);

/**
 * Resolve Brandtree's conventional paths and retain absolute config-referenced
 * asset files, including missing files, for targeted watching. Paths are absolute
 * and normalized. `options.runtimeDir` relocates the whole
 * generated runtime (and its build output) so a verify build/check can run
 * without touching a live dev server's `.brandtree/` or the real `dist/`.
 */
export const resolveProjectContext = (
  root: string,
  options?: {
    runtimeDir?: string;
    config?: ResolvedConfig;
  },
): ProjectContext => {
  const absoluteRoot = resolve(root);
  const contentRoot = join(absoluteRoot, "content");
  const assetReferences = options?.config
    ? collectConfigAssetReferences(options.config, absoluteRoot)
    : [];

  const outDir = resolveRuntimeDir(absoluteRoot, options?.runtimeDir);
  // A relocated runtime keeps its build output self-contained under itself, so a
  // verify build never empties the user's real `<root>/dist`.
  const distDir = options?.runtimeDir
    ? join(outDir, "dist")
    : join(absoluteRoot, "dist");

  return {
    assetReferences,
    componentsFile: firstExisting(absoluteRoot, COMPONENTS_FILENAMES),
    configFile: findConfigFile(absoluteRoot),
    contentRoot,
    distDir,
    outDir,
    root: absoluteRoot,
    themeFile: firstExisting(absoluteRoot, THEME_FILENAMES),
  };
};
