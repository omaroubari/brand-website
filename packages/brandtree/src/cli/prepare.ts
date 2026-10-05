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
 * Scan the project, surface diagnostics, and (re)generate the `.brandtree` runtime.
 * In strict mode, any error aborts. Returns the resolved project.
 */
export const prepareProject = async (
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
    process.exit(1);
  }

  const { warnings } = await generateRuntime(project);
  for (const warning of warnings) {
    logger.warn(warning);
  }
  return project;
};
