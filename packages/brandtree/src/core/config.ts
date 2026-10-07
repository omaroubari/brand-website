import { BrandtreeError, diagnosticsFromZod } from "./diagnostics.ts";

import {
  brandtreeConfigSchema,
  type BrandtreeConfigInput,
  type ResolvedConfig,
} from "./schema.ts";
import type { Diagnostic } from "./types.ts";
import { createModuleLoader } from "./load-module.ts";
import { existsSync, readFileSync } from "node:fs";
import { findConfigFile } from "./project.ts";
import { prepareConfigAssets } from "./config-assets.ts";

export const defineConfig = (
  config: BrandtreeConfigInput,
): BrandtreeConfigInput => config;

/** Result of loading + validating a project config. */
export interface ConfigLoadResult {
  config: ResolvedConfig;
  /** Absolute path of the config file used, or null when defaults were used. */
  configFile: string | null;
  diagnostics: Diagnostic[];
}

let importConfigModule: ReturnType<typeof createModuleLoader> | undefined;

/**
 * Load and validate the project config. When no config file exists, schema
 * defaults produce a fully resolved config so the zero-boilerplate path works.
 */
export const loadConfig = async (root: string): Promise<ConfigLoadResult> => {
  const configFile = findConfigFile(root);

  let raw: unknown;
  if (configFile) {
    try {
      importConfigModule ??= createModuleLoader();
      raw = await importConfigModule(configFile);
    } catch (error) {
      // SAFETY: the module loader rejects with the thrown load/parse failure,
      // which Node surfaces as an Error; a non-Error rejection only degrades
      // the interpolated message.
      throw new BrandtreeError({
        code: "BRANDTREE_CONFIG_LOAD_FAILED",
        file: configFile,
        message: `Failed to load config: ${(error as Error).message}`,
        severity: "error",
      });
    }
  }

  const parsed = brandtreeConfigSchema.safeParse(raw ?? {});

  if (!parsed.success) {
    // Read the raw config text (when on disk) so errors carry a line/column.
    const source =
      configFile && existsSync(configFile)
        ? readFileSync(configFile, "utf-8")
        : undefined;

    const diagnostics = diagnosticsFromZod(parsed.error, {
      code: "BLUME_CONFIG_INVALID",
      file: configFile ?? undefined,
      source,
    });

    const [first, ...rest] = diagnostics;

    const primary = first ?? {
      code: "BLUME_CONFIG_INVALID",
      file: configFile ?? undefined,
      message: "Invalid Blume config.",
      severity: "error" as const,
    };

    // Surface every issue in one failing run — reporting only the first turns
    // a three-mistake config into three fix-rerun-fail loops.
    const moreIssues = rest.map((d) => `  - ${d.message}`).join("\n");
    const detail =
      rest.length > 0
        ? {
            ...primary,
            message: `${primary.message}\n${rest.length} more config issue(s):\n${moreIssues}`,
          }
        : primary;
    throw new BrandtreeError(detail);
  }

  const assets = await prepareConfigAssets(parsed.data, {
    root,
    file: configFile ?? undefined,
  });
  return { config: assets.config, configFile, diagnostics: assets.diagnostics };
};
