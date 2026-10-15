import { relative, resolve } from "node:path";

/** Generate a checker project covering the runtime and original authored files. */
export const runtimeTsconfigTemplate = (
  authorRoot: string,
  runtimeRoot: string,
): string => {
  const author = relative(runtimeRoot, authorRoot).replaceAll("\\", "/") || ".";
  return `${JSON.stringify(
    {
      extends: "astro/tsconfigs/strict",
      compilerOptions: {
        jsx: "react-jsx",
        jsxImportSource: "react",
      },
      include: [".astro/types.d.ts", "**/*", `${author}/**/*`],
      exclude: [
        ...["node_modules", "dist", "coverage", ".git"].flatMap((directory) => [
          `**/${directory}/**`,
          `${author}/**/${directory}/**`,
        ]),
        ...[".brandtree", ".brandtree-verify"]
          .filter(
            (directory) =>
              resolve(runtimeRoot) !== resolve(authorRoot, directory),
          )
          .map((directory) => `${author}/${directory}/**/*`),
      ],
    },
    null,
    2,
  )}\n`;
};
