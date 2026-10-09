/** Generate `.brandtree/tsconfig.json`. */
export const runtimeTsconfigTemplate = (): string =>
  `${JSON.stringify(
    {
      exclude: ["dist"],
      extends: "astro/tsconfigs/strict",
      include: [
        ".astro/types.d.ts",
        "**/*",
        "../brandtree.config.*",
        "../content/**/*",
        "../components/**/*",
      ],
    },
    null,
    2,
  )}\n`;
