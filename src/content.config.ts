import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * One MDX file per section of the guidelines.
 *
 * Files are named `locale/NN-slug.mdx`. The numeric prefix sets the running
 * order and the printed section number; the URL is locale-prefixed (`en/03-logo.mdx`
 * → `/en/logo`).
 * Delete a file to drop the section — nav, numbering and prev/next follow.
 */
const sections = defineCollection({
  loader: glob({
    base: "./src/content/sections",
    pattern: "**/[^_]*.{md,mdx}",
    // `en/03-logo.mdx` → `en/logo` (the locale is part of the content ID,
    // while the numeric filename prefix remains an ordering concern).
    generateId: ({ entry }) => {
      const parts = entry.split("/");
      const filename = parts.pop() ?? entry;
      const slug = filename.replace(/\.mdx?$/, "").replace(/^\d+[-_]/, "");
      return parts.length > 0 ? `${parts.join("/")}/${slug}` : slug;
    },
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
