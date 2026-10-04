import { defineCommand } from "citty";

export const buildCommand = defineCommand({
  meta: {
    name: "build",
    description: "Build the brand guidelines site for production.",
  },
  async run() {
    // Preparation can load author components and cache React before Vite sets
    // its build default. Initialize it first so native externals agree.
    process.env.NODE_ENV ??= "production";
    const { prepareProject } = await import("./prepare.ts");
    const { build } = await import("astro");
    const project = await prepareProject({
      root: process.cwd(),
      mode: "build",
    });
    await build({ root: project.context.outDir });
  },
});
