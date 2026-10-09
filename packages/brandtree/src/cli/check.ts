import { defineCommand } from "citty";

export const checkCommand = defineCommand({
  meta: {
    name: "check",
    description: "Validate authored inputs and type-check the generated site.",
  },
  async run() {
    process.env.NODE_ENV ??= "development";
    const { prepareProject } = await import("./prepare.ts");
    const { sync } = await import("astro");
    const { check } = await import("@astrojs/check");
    const project = await prepareProject({
      root: process.cwd(),
      mode: "dev",
      strict: true,
    });
    await sync({ root: project.context.outDir });
    if (await check({ root: project.context.outDir, watch: false })) {
      process.exitCode = 1;
    }
  },
});
