import { generateRuntime } from "../astro/generate.ts";
import { BrandtreeError } from "../core/diagnostics.ts";
import type { BrandtreeProject, BuildMode } from "../core/project-tree.ts";
import { scanProject } from "../core/project-tree.ts";
import { logger, reportDiagnostics } from "./log.ts";

export interface PrepareOptions {
  root: string;
  mode?: BuildMode;
  strict?: boolean;
  /** Local dev server URL, used as the `deployment.site` fallback (dev only). */
  devServerUrl?: string;
  /** Render drafts and fetch unpublished CMS content. */
  preview?: boolean;
  /** Force remote sources to re-fetch instead of serving the cached snapshot. */
  refresh?: boolean;
  /** Relocate the generated runtime (e.g. `.brandtree-verify` for `--isolated`). */
  runtimeDir?: string;
}

/**
 * Scan the project and surface diagnostics without touching the runtime.
 * In strict mode, any error aborts. Returns the resolved project.
 */
export const readProject = async (
  options: PrepareOptions,
): Promise<BrandtreeProject> => {
  let project: BrandtreeProject;

  try {
    project = await scanProject(options.root, {
      devServerUrl: options.devServerUrl,
      mode: options.mode,
      preview: options.preview,
      refresh: options.refresh,
      runtimeDir: options.runtimeDir,
    });
  } catch (error) {
    if (error instanceof BrandtreeError) {
      reportDiagnostics([error.diagnostic], options.root);
    } else {
      logger.error(error);
    }
    throw error;
  }

  const hadErrors = reportDiagnostics(project.diagnostics, options.root);

  if (hadErrors) {
    if (options.strict) {
      logger.error(
        "Preparation aborted: diagnostics contain errors and strict mode is enabled.",
      );
      throw new Error(
        "Preparation aborted: diagnostics contain errors and strict mode is enabled.",
      );
    }
    logger.warn(
      "Continuing preparation with errors because strict mode is disabled.",
    );
  }

  return project;
};

export const writeProject = async (
  project: BrandtreeProject,
): Promise<void> => {
  const { warnings } = await generateRuntime(project);

  for (const warning of warnings) {
    logger.warn(warning);
  }
};

/** Prepare once for startup/build/check; watched changes can validate before stopping Astro. */
export const prepareProject = async (
  options: PrepareOptions,
): Promise<BrandtreeProject> => {
  const project = await readProject(options);
  await writeProject(project);
  return project;
};
