import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { pageMetaSchema } from "brandtree";

/**
 * Markdown content is intentionally kept as files. The recursive tree in
 * `src/lib/core/tree.ts` derives groups, routes, navigation and reading order
 * from these entries and their sibling `meta.ts` files.
 */
const brandGuidelines = defineCollection({
  loader: glob({
    base: "./src/content/brand-guidelines",
    pattern: "**/[^_]*.{md,mdx}",
    // Preserve source identity, including extensions. Otherwise Astro can
    // overwrite entries before the pipeline detects normalized URL collisions.
    // Numeric prefixes are removed later by source-entry normalization.
    generateId: ({ entry }) => entry.replaceAll("\\", "/"),
  }),
  schema: pageMetaSchema,
});

export const collections = { brandGuidelines };
