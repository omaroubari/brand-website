import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineCommand } from "citty";

export const checkCommand = defineCommand({
  args: {
    strict: {
      type: "boolean",
      default: false,
      description: "Fail on content error diagnostics.",
    },
    preview: {
      type: "boolean",
      default: false,
      description: "Include draft content.",
    },
    isolated: {
      type: "boolean",
      default: false,
      description: "Prepare .brandtree-verify instead of .brandtree.",
    },
  },
  meta: {
    name: "check",
    description:
      "Validate the project and type-check without a production build.",
  },
  async run({ args }) {
    process.env.NODE_ENV ??= "production";
    const root = process.cwd();
    const { prepareProject } = await import("./prepare.ts");
    const { sync } = await import("astro");
    const { check } = await import("@astrojs/check");
    const project = await prepareProject({
      root,
      mode: "build",
      strict: args.strict,
      preview: args.preview,
      runtimeDir: args.isolated ? ".brandtree-verify" : undefined,
    });
    await sync({ root: project.context.outDir });
    // Select one project. TypeScript resolves its include/exclude and compiler
    // options relative to that file; do not merge in the generated config.
    const authorTsconfig = join(root, "tsconfig.json");
    const failed = await check({
      root: project.context.outDir,
      tsconfig: existsSync(authorTsconfig)
        ? authorTsconfig
        : join(project.context.outDir, "tsconfig.json"),
      watch: false,
      minimumFailingSeverity: "error",
    });
    if (failed) process.exitCode = 1;
  },
});
