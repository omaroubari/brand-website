import { z } from "astro/zod";

/** The published stops used by every palette family. */
export const shadeSteps = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

const colorValueSchema = z.discriminatedUnion("space", [
  z.object({ space: z.literal("hex"), value: z.string() }).strict(),
  z
    .object({
      space: z.literal("oklch"),
      l: z.number(),
      c: z.number(),
      h: z.number(),
      alpha: z.number().optional(),
    })
    .strict(),
]);

export const brandColorValueSchema = colorValueSchema;

const colorTokenSchema = z.string();

const paletteFamilySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    shades: z
      .object({
        50: colorValueSchema,
        100: colorValueSchema,
        200: colorValueSchema,
        300: colorValueSchema,
        400: colorValueSchema,
        500: colorValueSchema,
        600: colorValueSchema,
        700: colorValueSchema,
        800: colorValueSchema,
        900: colorValueSchema,
        950: colorValueSchema,
      })
      .strict(),
  })
  .strict();

const swatchSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    color: colorTokenSchema,
    cmyk: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
    pantone: z.string().optional(),
    usage: z.string().optional(),
    category: z.enum(["primary", "secondary"]).optional(),
    span: z.union([z.literal(1), z.literal(2)]).optional(),
    rows: z.union([z.literal(1), z.literal(2)]).optional(),
    on: colorTokenSchema.optional(),
  })
  .strict();

export const brandColorsSchema = z
  .object({
    palette: z.array(paletteFamilySchema),
    swatches: z.array(swatchSchema),
  })
  .strict();

const schemeRoles = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "border",
  "input",
  "ring",
  "chart1",
  "chart2",
  "chart3",
  "chart4",
  "chart5",
  "sidebar",
  "sidebarForeground",
  "sidebarPrimary",
  "sidebarPrimaryForeground",
  "sidebarAccent",
  "sidebarAccentForeground",
  "sidebarBorder",
  "sidebarRing",
] as const;

const schemeShape = Object.fromEntries(
  schemeRoles.map((role) => [role, colorTokenSchema]),
) as Record<(typeof schemeRoles)[number], typeof colorTokenSchema>;

const schemeSchema = z.object(schemeShape).strict();

const themeSchema = z
  .object({
    light: schemeSchema,
    dark: schemeSchema,
    default: z.enum(["light", "dark", "system"]),
  })
  .strict();

const typeStyleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    role: z.string().optional(),
    font: z.enum(["display", "text"]).optional(),
    weight: z.number().optional(),
    size: z.string(),
    lineHeight: z.string(),
    tracking: z.string(),
    transform: z
      .enum(["none", "uppercase", "lowercase", "capitalize"])
      .optional(),
    print: z
      .object({
        size: z.string(),
        leading: z.string(),
        tracking: z.string(),
      })
      .strict()
      .optional(),
    sample: z.string().optional(),
  })
  .strict();

const fontWeightSchema = z
  .object({
    name: z.string(),
    weight: z.number(),
    italic: z.boolean().optional(),
  })
  .strict();

const typographyFamilySchema = z
  .object({
    id: z.enum(["display", "text", "mono"]),
    name: z.string(),
    foundry: z.string().optional(),
    url: z.string().optional(),
    note: z.string().optional(),
  })
  .strict();

const typographySchema = z
  .object({
    display: z.string(),
    text: z.string(),
    mono: z.string(),
    families: z.array(typographyFamilySchema),
    weights: z.array(fontWeightSchema),
    scale: z.array(typeStyleSchema),
  })
  .strict();

const artworkSchema = z
  .object({
    onLight: z.string(),
    onDark: z.string(),
    aspect: z.number(),
    altText: z.string().optional(),
  })
  .strict();

const colorwaySchema = z
  .object({
    id: z.string(),
    fg: colorTokenSchema,
    bg: colorTokenSchema,
    label: z.string().optional(),
  })
  .strict();

const logoSchema = z
  .object({
    logotype: artworkSchema,
    brandmark: artworkSchema,
    favicon: z.string().optional(),
    pronunciation: z.string().optional(),
    clearspace: z.object({ unit: z.string(), ratio: z.number() }).strict(),
    minSize: z.object({ digital: z.string(), print: z.string() }).strict(),
    colorways: z.array(colorwaySchema),
  })
  .strict();

const metaSchema = z
  .object({
    name: z.string(),
    legalName: z.string().optional(),
    tagline: z.string().optional(),
    documentTitle: z.string(),
    version: z.string(),
    year: z.number(),
    url: z.string(),
    description: z.string(),
    ogImage: z.string().optional(),
  })
  .strict();

const socialSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    handle: z.string(),
    url: z.string(),
  })
  .strict();

const contactSchema = z
  .object({
    email: z.string().optional(),
    website: z.string().optional(),
    phone: z.string().optional(),
    address: z.array(z.string()).optional(),
    socials: z.array(socialSchema).optional(),
  })
  .strict();

const downloadSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    href: z.string(),
    format: z.string().optional(),
    size: z.string().optional(),
    note: z.string().optional(),
  })
  .strict();

const localeMetaOverrideSchema = z
  .object({
    name: z.string().optional(),
    legalName: z.string().optional(),
    tagline: z.string().optional(),
    documentTitle: z.string().optional(),
    description: z.string().optional(),
  })
  .strict();

const localeOverrideSchema = z
  .object({
    meta: localeMetaOverrideSchema.optional(),
    colors: z
      .object({
        palette: z
          .array(
            z.object({ id: z.string(), name: z.string().optional() }).strict(),
          )
          .optional(),
        swatches: z
          .array(
            z
              .object({
                id: z.string(),
                name: z.string().optional(),
                usage: z.string().optional(),
              })
              .strict(),
          )
          .optional(),
      })
      .strict()
      .optional(),
    typography: z
      .object({
        display: z.string().optional(),
        text: z.string().optional(),
        mono: z.string().optional(),
        families: z
          .array(
            z
              .object({
                id: z.enum(["display", "text", "mono"]),
                name: z.string().optional(),
                note: z.string().optional(),
              })
              .strict(),
          )
          .optional(),
        scale: z
          .array(
            z
              .object({
                id: z.string(),
                name: z.string().optional(),
                role: z.string().optional(),
                sample: z.string().optional(),
              })
              .strict(),
          )
          .optional(),
        weights: z
          .array(
            z
              .object({ weight: z.number(), name: z.string().optional() })
              .strict(),
          )
          .optional(),
      })
      .strict()
      .optional(),
    logo: z
      .object({
        logotype: z
          .object({ altText: z.string().optional() })
          .strict()
          .optional(),
        brandmark: z
          .object({ altText: z.string().optional() })
          .strict()
          .optional(),
        pronunciation: z.string().optional(),
        clearspace: z
          .object({ unit: z.string().optional() })
          .strict()
          .optional(),
        colorways: z
          .array(
            z.object({ id: z.string(), label: z.string().optional() }).strict(),
          )
          .optional(),
      })
      .strict()
      .optional(),
    contact: z
      .object({
        address: z.array(z.string()).optional(),
        socials: z
          .array(
            z.object({ id: z.string(), label: z.string().optional() }).strict(),
          )
          .optional(),
      })
      .strict()
      .optional(),
    downloads: z
      .array(
        z
          .object({
            id: z.string(),
            label: z.string().optional(),
            note: z.string().optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export const navigationConfigSchema = z
  .object({ numbering: z.boolean().default(false) })
  .strict();

/** A configured locale: ISO-ish code plus display metadata for the switcher. */
const localeSchema = z.strictObject({
  code: z.string().min(1),
  /** Text direction; drives `<html dir>` and a future RTL pass. */
  dir: z.enum(["ltr", "rtl"]).default("ltr"),
  label: z.string(),
  style: z.string().optional(),
});

export const i18nConfigSchema = z
  .object({
    defaultLocale: z.string(),
    locales: z.array(localeSchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const [index, locale] of value.locales.entries()) {
      let canonical: string | undefined;
      try {
        [canonical] = Intl.getCanonicalLocales(locale.code);
      } catch {
        // Reported below with the same stable configuration path.
      }
      if (canonical !== locale.code) {
        ctx.addIssue({
          code: "custom",
          path: ["locales", index, "code"],
          message: `Locale code "${locale.code}" must be a canonical BCP 47 tag.`,
        });
      }
      if (seen.has(locale.code)) {
        ctx.addIssue({
          code: "custom",
          path: ["locales", index, "code"],
          message: `Duplicate locale code "${locale.code}".`,
        });
      }
      seen.add(locale.code);
    }
    if (!seen.has(value.defaultLocale)) {
      ctx.addIssue({
        code: "custom",
        path: ["defaultLocale"],
        message: `Default locale "${value.defaultLocale}" is not configured.`,
      });
    }
  });

export const brandSchema = z
  .object({
    meta: metaSchema,
    colors: brandColorsSchema,
    theme: themeSchema,
    typography: typographySchema,
    logo: logoSchema,
    contact: contactSchema,
    downloads: z.array(downloadSchema).optional(),
    localeOverrides: z.record(z.string(), localeOverrideSchema).optional(),
  })
  .strict()
  .superRefine((brand, ctx) => {
    const ids = (
      values: readonly { id: string }[],
      path: (string | number)[],
    ) => {
      const seen = new Set<string>();
      values.forEach((value, index) => {
        if (seen.has(value.id)) {
          ctx.addIssue({
            code: "custom",
            path: [...path, index, "id"],
            message: `Duplicate id "${value.id}".`,
          });
        }
        seen.add(value.id);
      });
    };

    ids(brand.colors.palette, ["colors", "palette"]);
    ids(brand.colors.swatches, ["colors", "swatches"]);
    ids(brand.typography.families, ["typography", "families"]);
    ids(brand.typography.scale, ["typography", "scale"]);
    ids(brand.logo.colorways, ["logo", "colorways"]);
    ids(brand.contact.socials ?? [], ["contact", "socials"]);
    ids(brand.downloads ?? [], ["downloads"]);

    const weights = (
      values: readonly { weight: number }[],
      path: (string | number)[],
    ) => {
      const seen = new Set<number>();
      values.forEach((value, index) => {
        if (seen.has(value.weight)) {
          ctx.addIssue({
            code: "custom",
            path: [...path, index, "weight"],
            message: `Duplicate weight "${value.weight}".`,
          });
        }
        seen.add(value.weight);
      });
    };
    weights(brand.typography.weights, ["typography", "weights"]);

    const knownColors = new Set<string>(["black", "white"]);
    for (const family of brand.colors.palette) {
      for (const step of shadeSteps) knownColors.add(`${family.id}-${step}`);
    }
    const checkColor = (value: string, path: (string | number)[]) => {
      if (!knownColors.has(value)) {
        ctx.addIssue({
          code: "custom",
          path,
          message: `Unknown colour reference "${value}".`,
        });
      }
    };
    brand.colors.swatches.forEach((swatch, index) => {
      checkColor(swatch.color, ["colors", "swatches", index, "color"]);
      if (swatch.on) checkColor(swatch.on, ["colors", "swatches", index, "on"]);
    });
    for (const schemeName of ["light", "dark"] as const) {
      for (const role of schemeRoles) {
        checkColor(brand.theme[schemeName][role], ["theme", schemeName, role]);
      }
    }
    brand.logo.colorways.forEach((colorway, index) => {
      checkColor(colorway.fg, ["logo", "colorways", index, "fg"]);
      checkColor(colorway.bg, ["logo", "colorways", index, "bg"]);
    });

    for (const [localeCode, override] of Object.entries(
      brand.localeOverrides ?? {},
    )) {
      const checkOverrideIds = (
        values: readonly { id: string }[] | undefined,
        canonical: readonly { id: string }[],
        path: (string | number)[],
      ) => {
        if (!values) return;
        ids(values, path);
        const canonicalIds = new Set(canonical.map((item) => item.id));
        values.forEach((item, index) => {
          if (!canonicalIds.has(item.id)) {
            ctx.addIssue({
              code: "custom",
              path: [...path, index, "id"],
              message: `Unknown canonical id "${item.id}".`,
            });
          }
        });
      };
      checkOverrideIds(override.colors?.palette, brand.colors.palette, [
        "localeOverrides",
        localeCode,
        "colors",
        "palette",
      ]);
      checkOverrideIds(override.colors?.swatches, brand.colors.swatches, [
        "localeOverrides",
        localeCode,
        "colors",
        "swatches",
      ]);
      checkOverrideIds(
        override.typography?.families,
        brand.typography.families,
        ["localeOverrides", localeCode, "typography", "families"],
      );
      checkOverrideIds(override.typography?.scale, brand.typography.scale, [
        "localeOverrides",
        localeCode,
        "typography",
        "scale",
      ]);
      if (override.typography?.weights) {
        const path = ["localeOverrides", localeCode, "typography", "weights"];
        weights(override.typography.weights, path);
        const canonicalWeights = new Set(
          brand.typography.weights.map((item) => item.weight),
        );
        override.typography.weights.forEach((item, index) => {
          if (!canonicalWeights.has(item.weight)) {
            ctx.addIssue({
              code: "custom",
              path: [...path, index, "weight"],
              message: `Unknown canonical weight "${item.weight}".`,
            });
          }
        });
      }
      checkOverrideIds(override.logo?.colorways, brand.logo.colorways, [
        "localeOverrides",
        localeCode,
        "logo",
        "colorways",
      ]);
      checkOverrideIds(override.contact?.socials, brand.contact.socials ?? [], [
        "localeOverrides",
        localeCode,
        "contact",
        "socials",
      ]);
      checkOverrideIds(override.downloads, brand.downloads ?? [], [
        "localeOverrides",
        localeCode,
        "downloads",
      ]);
    }
  });

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

export type BrandConfigInput = z.input<typeof brandSchema>;
export type BrandConfig = z.output<typeof brandSchema>;
export type BrandColors = z.output<typeof brandColorsSchema>;
export type BrandColorValue = z.output<typeof brandColorValueSchema>;
export type BrandColorReference = string;
export type BrandSpecialColor = "black" | "white";
export type BrandColorToken = BrandColorReference | BrandSpecialColor;
export type BrandColorFamily = BrandColors["palette"][number];
export type BrandShadeStep = (typeof shadeSteps)[number];
export type BrandSwatch = BrandColors["swatches"][number];
export type BrandScheme = BrandConfig["theme"]["light"];
export type BrandTheme = BrandConfig["theme"];
export type TypeStyle = BrandConfig["typography"]["scale"][number];
export type FontWeightSpec = BrandConfig["typography"]["weights"][number];
export type BrandTypography = BrandConfig["typography"];
export type LogoArtwork = BrandConfig["logo"]["logotype"];
export type BrandLogo = BrandConfig["logo"];
export type BrandMeta = BrandConfig["meta"];
export type BrandContact = BrandConfig["contact"];
export type BrandDownload = NonNullable<BrandConfig["downloads"]>[number];
export type BrandLocaleOverride = z.output<typeof localeOverrideSchema>;
export type BrandLocaleOverrides = NonNullable<BrandConfig["localeOverrides"]>;

export type ResolvedI18nConfig = z.infer<typeof i18nConfigSchema>;
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
