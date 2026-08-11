import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * One MDX file per section of the guidelines.
 *
 * Files are named `NN-slug.mdx`. The numeric prefix sets the running order and
 * the printed section number; the URL is just the slug (`03-logo.mdx` → `/logo`).
 * Delete a file to drop the section — nav, numbering and prev/next follow.
 */
const sections = defineCollection({
  loader: glob({
    base: "./src/content/sections",
    pattern: "**/[^_]*.{md,mdx}",
    // `03-logo.mdx` → `logo`
    generateId: ({ entry }) =>
      entry.replace(/\.mdx?$/, "").replace(/^\d+[-_]/, ""),
  }),
  schema: z.object({
    /** Section title, as printed. */
    title: z.string(),
    /** One line under the title on the section page and in the contents list. */
    summary: z.string().optional(),
    /**
     * Running order and printed number. Falls back to the filename prefix,
     * so you rarely need to set this by hand.
     */
    order: z.number().optional(),
    /** Overrides the two-digit number shown beside the title. */
    number: z.string().optional(),
    /** Hidden from nav and excluded from the build. */
    draft: z.boolean().default(false),
    /** Override the `<title>` and meta description for this page. */
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = { sections };
