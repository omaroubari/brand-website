import { brandSchema } from "@/brand/schema";
import { z } from "astro/zod";
import { contentIcons, type ContentIconName } from "./icons";

/** Icon inputs in serializable contexts (frontmatter, meta files). */
const iconName = z.enum(
  Object.keys(contentIcons) as [ContentIconName, ...ContentIconName[]],
);

export const pageMetaSchema = z.strictObject({
  title: z.string().optional(),
  description: z.string().optional(),
  slug: z.string().optional(),
  draft: z.boolean().default(false),
  hidden: z.boolean().default(false),
  icon: iconName.optional(),
  noindex: z.boolean().default(false),
  sidebar: z
    .strictObject({
      label: z.string().optional(),
      icon: iconName.optional(),
      badge: z.string().optional(),
      hidden: z.boolean().optional(),
    })
    .prefault({}),
  seo: z
    .strictObject({
      canonical: z.url().optional(),
      description: z.string().optional(),
      image: z.string().optional(),
      noindex: z.boolean().default(false),
      title: z.string().optional(),
    })
    .prefault({}),
});

export type PageMeta = z.infer<typeof pageMetaSchema>;

// ---------------------------------------------------------------------------
// Folder meta (meta.ts)
// ---------------------------------------------------------------------------

export const folderMetaSchema = z.strictObject({
  collapsed: z.boolean().optional(),
  icon: iconName.optional(),
  order: z.number().optional(),
  /** Explicit child ordering by slug segment (without numeric prefix). */
  pages: z.array(z.string()).optional(),
  title: z.string().optional(),
});

export type FolderMeta = z.infer<typeof folderMetaSchema>;

/** A configured locale: ISO-ish code plus display metadata for the switcher. */
const localeSchema = z.strictObject({
  code: z.string().min(1),
  /** Text direction; drives `<html dir>` and a future RTL pass. */
  dir: z.enum(["ltr", "rtl"]).default("ltr"),
  label: z.string(),
  /**
   * Freeform style guidance for `blume translate`, e.g. "Brazilian
   * Portuguese, informal você". Pins register and dialect from the first
   * translation and wins over an existing translation's style on reruns.
   */
  style: z.string().optional(),
});

/**
 * Internationalization. Opt-in: when absent, Blume is single-locale and behaves
 * exactly as before. The default locale lives at the content root; other locales
 * are top-level directories named by `code` (the `dir` parser).
 */
export const i18nConfigSchema = z
  .strictObject({
    defaultLocale: z.string().default("en"),
    /** Locale rendered for a missing translation; `null` disables fallback. */
    fallbackLocale: z.string().nullable().optional(),
    /** Drop the URL prefix for the default locale (`/`, `/fr/…`). Static-safe. */
    hideDefaultLocalePrefix: z.boolean().default(true),
    locales: z.array(localeSchema).min(1),
    /** `"dir"`: locale directories (`fr/page.mdx`). `"dot"`: filename suffix (`page.fr.mdx`). */
    parser: z.enum(["dir", "dot"]).default("dir"),
    /** Per-locale UI string overrides: `{ fr: { search: { button: "…" } } }`. */
    // ui: uiLocaleOverridesSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const codes = new Set(value.locales.map((locale) => locale.code));
    if (!codes.has(value.defaultLocale)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `i18n.defaultLocale "${value.defaultLocale}" must match one of i18n.locales.`,
        path: ["defaultLocale"],
      });
    }
    if (
      value.fallbackLocale !== null &&
      value.fallbackLocale !== undefined &&
      !codes.has(value.fallbackLocale)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `i18n.fallbackLocale "${value.fallbackLocale}" must match one of i18n.locales.`,
        path: ["fallbackLocale"],
      });
    }
  });

export const navigationConfigSchema = z
  .object({ numbering: z.boolean().default(false) })
  .strict();

export const brandtreeConfigSchema = z
  .object({
    brand: brandSchema,
    i18n: i18nConfigSchema.optional(),
    navigation: navigationConfigSchema.prefault({}),
  })
  .strict()
  .superRefine((config, ctx) => {
    const localeOverrides = config.brand.localeOverrides;
    if (localeOverrides && !config.i18n) {
      ctx.addIssue({
        code: "custom",
        path: ["brand", "localeOverrides"],
        message: "Locale overrides require an i18n configuration.",
      });
    }

    const configuredLocales = new Set(
      config.i18n?.locales.map((locale) => locale.code),
    );
    for (const localeCode of Object.keys(localeOverrides ?? {})) {
      if (!configuredLocales.has(localeCode)) {
        ctx.addIssue({
          code: "custom",
          path: ["brand", "localeOverrides", localeCode],
          message: `Locale override "${localeCode}" is not configured in i18n.locales.`,
        });
      }
    }
  });

export type ResolvedConfig = z.output<typeof brandtreeConfigSchema>;
export type BrandtreeConfigInput = z.input<typeof brandtreeConfigSchema>;
/** Resolved i18n block (present only when the project opts into i18n). */
export type ResolvedI18nConfig = z.infer<typeof i18nConfigSchema>;
/** A configured locale with display metadata. */
export type LocaleConfig = z.infer<typeof localeSchema>;

/**
 * Parse once at the configuration boundary while preserving literal fields in
 * the caller's inferred type (notably the configured locale code union).
 */
export function defineConfig<const T extends BrandtreeConfigInput>(
  config: T,
): ResolvedConfig & T {
  return brandtreeConfigSchema.parse(config) as ResolvedConfig & T;
}
