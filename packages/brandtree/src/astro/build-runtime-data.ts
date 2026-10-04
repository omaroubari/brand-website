import type { BrandtreeProject } from "../core/project-tree.ts";
import type { RuntimeData } from "../core/types.ts";
import { literal } from "./templates/helpers.ts";

/** Serialize the content tree into the data module the runtime consumes. */
export const buildRuntimeData = (project: BrandtreeProject): string => {
  const { config, tree } = project;
  const data: RuntimeData = {
    config,
    tree: { ...tree, routes: [...tree.routes] },
  };
  return `${literal(data)}\n`;
};
