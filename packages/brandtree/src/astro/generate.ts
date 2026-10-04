import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

import type { BrandtreeProject } from "../core/project-tree.ts";
import { ensureDepsLink } from "./ensure-deps-link.ts";

import { astroConfigTemplate } from "./templates/astro-config.ts";
import {
  runtimeDependencies,
  runtimePackageTemplate,
} from "./templates/package.ts";
import { runtimeTsconfigTemplate } from "./templates/tsconfig.ts";
import { contentConfigTemplate } from "./templates/content-config.ts";
import { catchAllPageTemplate } from "./templates/page.ts";
import {
  indexPageTemplate,
  localizedIndexPageTemplate,
} from "./templates/index.ts";
import { buildRuntimeData } from "./build-runtime-data.ts";
import { runtimeDataTypesTemplate } from "./templates/data-types.ts";
import { ogEndpointTemplate } from "./templates/og.ts";
import { buildOgAssets } from "./build-og-assets.ts";

export interface GenerateResult {
  /** Whether any structural file changed (config/page/content config). */
  structuralChange: boolean;
  /** Non-fatal warnings raised while generating (e.g. a missing API spec). */
  warnings: string[];
}

const writeIfChanged = async (
  path: string,
  content: string,
): Promise<boolean> => {
  let existing: string | null = null;
  try {
    existing = await readFile(path, "utf-8");
  } catch {
    existing = null;
  }
  if (existing === content) {
    return false;
  }

  // Todo: Atomic temp-write + rename, so a watching dev server never observes a
  // missing or half-written file mid-regeneration.
  // await writeTextAtomic(path, content);

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  return true;
};

/** Generate a disposable Astro app without copying or changing authored inputs. */
export const generateRuntime = async (
  project: BrandtreeProject,
): Promise<GenerateResult> => {
  const { context, config } = project;

  const out = context.outDir;
  const srcDir = join(out, "src");
  const dataPath = join(srcDir, "generated", "data.json");

  // Record every file this pass writes so orphans (from a now-disabled feature)
  // can be pruned afterwards. `write` wraps the atomic writer and tracks paths.
  const written = new Set<string>();
  const write = (path: string, content: string): Promise<boolean> => {
    written.add(normalize(path));
    return writeIfChanged(path, content);
  };

  const depsLinkWarning = await ensureDepsLink(out);
  const ogAssets = await buildOgAssets(project);

  await mkdir(context.outDir, { recursive: true });

  const [structural] = await Promise.all([
    Promise.all([
      write(
        join(out, "astro.config.mjs"),
        astroConfigTemplate({
          config,
          context,
          dataPath,
        }),
      ),
      write(
        join(out, "package.json"),
        runtimePackageTemplate(runtimeDependencies({ config })),
      ),
      write(join(out, "tsconfig.json"), runtimeTsconfigTemplate()),
      write(join(srcDir, "env.d.ts"), runtimeDataTypesTemplate()),
      write(
        join(srcDir, "content.config.ts"),
        contentConfigTemplate({
          config,
          context,
        }),
      ),
      write(join(srcDir, "pages", "[...slug].astro"), catchAllPageTemplate()),
      write(join(srcDir, "pages", "index.astro"), indexPageTemplate()),
      write(
        join(srcDir, "pages", "og", "[...slug].png.ts"),
        ogEndpointTemplate(),
      ),
      ...(config.i18n
        ? [
            write(
              join(srcDir, "pages", "[lang]", "index.astro"),
              localizedIndexPageTemplate(),
            ),
          ]
        : []),
    ]),
    write(dataPath, buildRuntimeData(project)),
    write(
      join(srcDir, "generated", "og-assets.json"),
      `${JSON.stringify(ogAssets.assets, null, 2)}\n`,
    ),
  ]);

  await rm(join(srcDir, "project.ts"), { force: true });

  // Remove the generated locale route when i18n is disabled on a later run.
  let removedLocaleRoute = false;
  if (!config.i18n) {
    const localeRoute = join(srcDir, "pages", "[lang]", "index.astro");
    try {
      await rm(localeRoute);
      removedLocaleRoute = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  return {
    structuralChange: structural.some(Boolean) || removedLocaleRoute,
    warnings: [
      ...(depsLinkWarning ? [depsLinkWarning] : []),
      ...ogAssets.warnings,
    ],
  };
};
