import type { ResolvedConfig } from "../../core/schema.ts";

/**
 * Integration packages the generated runtime imports. Declaring them in
 * `.brandtree/package.json` lets Astro's framework-package crawl discover and bundle
 * them — notably the React renderer's server entry, which imports the
 * `astro:react:opts` virtual module and must not be externalized (this applies
 * across the `ssr`, `prerender`, and `client` Vite environments).
 */
export const runtimeDependencies = (options: {
  config: ResolvedConfig;
}): string[] => {
  const { config } = options;
  const deps = ["@astrojs/mdx", "@astrojs/react"];
  return deps;
};

/** Generate `.brandtree/package.json`. */
export const runtimePackageTemplate = (dependencies: string[] = []): string =>
  `${JSON.stringify(
    {
      dependencies: Object.fromEntries(
        [...dependencies].toSorted().map((name) => [name, "*"]),
      ),
      name: "brandtree-runtime",
      private: true,
      type: "module",
      version: "0.0.0",
    },
    null,
    2,
  )}\n`;
