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

/**
 * Any CSS color. Takumi parses the full grammar, so this stays unvalidated
 * here and a bad value fails the OG prerender with a parse error naming it —
 * the same fail-fast the card's accent relies on. Validating hex-only here
 * would reject `oklch(…)`, which `theme.accent` (the card's default accent)
 * already accepts.
 */
const ogColorSchema = z.string();

const ogPaletteSchema = z.strictObject({
  accent: ogColorSchema.optional(),
  background: ogColorSchema.optional(),
  border: ogColorSchema.optional(),
  foreground: ogColorSchema.optional(),
  muted: ogColorSchema.optional(),
});

/**
 * A font to load into the OG card renderer. A bare string is a Google Fonts
 * family name; the name-only object form pins the weight (a number, a list, or
 * a variable range like `"100..900"`) and style, fetched from Google Fonts at
 * build. The `src` form reads a local font file from the project instead.
 * Either way Takumi does per-glyph fallback, so a family covering a script
 * (e.g. Noto Sans JP for CJK) fixes tofu without touching how Latin renders.
 */
const ogFontWeightSchema = z.union([
  z.number().int().positive(),
  z.array(z.number().int().positive()),
  z.string().regex(/^\d+\.\.\d+$/u),
]);
const ogFontStyleSchema = z.enum(["normal", "italic"]);
const ogFontSchema = z.union([
  z.string(),
  z.strictObject({
    name: z.string(),
    style: z.union([ogFontStyleSchema, z.array(ogFontStyleSchema)]).optional(),
    weight: ogFontWeightSchema.optional(),
  }),
  /** A local font file, read from the project at build. */
  z.strictObject({
    name: z.string(),
    src: z.string().min(1),
    style: ogFontStyleSchema.optional(),
    weight: z.number().int().positive().optional(),
  }),
]);

const ogConfigSchema = z.strictObject({
  /**
   * Small label above the headline. Defaults to the localized site title; a
   * string overrides it, `false` hides it.
   */
  eyebrow: z.union([z.string(), z.literal(false)]).optional(),
  /**
   * Card subtitle. Defaults to the site description; a string overrides it,
   * `false` renders the card without one.
   */
  description: z.union([z.string(), z.literal(false)]).optional(),
  /**
   * Generate a per-page Open Graph image. Defaults to on; an explicit custom
   * `page.seo.image` still works when this is off.
   */
  enabled: z.boolean().default(true),
  /**
   * Fonts for the generated card. Local files are bundled into the prerender
   * worker so card routes remain static under server adapters.
   */
  fonts: z.array(ogFontSchema).optional(),
  /**
   * Local SVG used in the generated card instead of the site logo; `false`
   * renders the card without any brand mark.
   */
  logo: z.union([z.string(), z.literal(false)]).optional(),
  /** Optional generated-card colors. */
  palette: ogPaletteSchema.optional(),
  /**
   * Footer site text. Defaults to the deployment site's host plus
   * `deployment.base` (`docs.acme.com`, `user.github.io/repo`); a string
   * overrides it, `false` hides it.
   */
  site: z.union([z.string(), z.literal(false)]).optional(),
  /**
   * Card headlines for custom `.astro` pages, keyed by route (`"/"`, `"/cli"`).
   * A custom page has no frontmatter to read, so its card is otherwise titled
   * by humanizing its last URL segment (`/cli` → "Cli"); an entry here wins.
   * Content pages always take their card headline from the page title.
   */
  titles: z.record(z.string(), z.string()).optional(),
});

/** Discoverability features: OG images, feeds, sitemap, structured data. */
const seoConfigSchema = z.strictObject({
  og: ogConfigSchema.default({ enabled: true }),
});

export const brandtreeConfigSchema = z
  .object({
    brand: brandSchema,
    i18n: i18nConfigSchema.optional(),
    navigation: navigationConfigSchema.prefault({}),
    seo: seoConfigSchema.prefault({}),
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
