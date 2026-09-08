import { z } from "zod";

import { UI_PACKS } from "./ui-packs";

const actionsSchema = z
  .object({
    copy: z.string().default("Copy"),
    copied: z.string().default("Copied"),
    copyFailed: z.string().default("Copy failed"),
    copyToClipboard: z.string().default("Copy to clipboard"),
  })
  .strict();

const brandSchema = z
  .object({
    assets: z.string().default("Assets"),
    contact: z.string().default("Contact"),
    contactLead: z
      .string()
      .default(
        "Anything this document does not answer, ask before you improvise.",
      ),
    document: z.string().default("Document"),
    guidelines: z.string().default("Brand guidelines"),
    licenceAndDownloads: z.string().default("License and downloads"),
    version: z.string().default("Version"),
  })
  .strict();

const colorSchema = z
  .object({
    copied: z.string().default("Color copied"),
    textOn: z.string().default("Text on"),
    sameColorNoContrast: z.string().default("Same color, no contrast"),
    shade: z.string().default("Shade"),
    hex: z.string().default("HEX"),
    rgb: z.string().default("RGB"),
    cmyk: z.string().default("CMYK"),
    pantone: z.string().default("PMS"),
  })
  .strict();

const contentSchema = z
  .object({
    note: z.string().default("Note"),
    do: z.string().default("Do"),
    dont: z.string().default("Don't"),
    artworkPending: z.string().default("Artwork pending"),
    portraitPending: z.string().default("Portrait pending"),
  })
  .strict();

const languageSwitcherSchema = z
  .object({ label: z.string().default("Language") })
  .strict();

const logoSchema = z
  .object({
    minimumSize: z.string().default("Minimum size"),
    clearspaceInstruction: z
      .string()
      .default(
        "{unit} = x. Keep at least x of clear space on every side of the {mark}. No type, image or graphic element may enter this zone.",
      ),
  })
  .strict();

const navSchema = z
  .object({
    contents: z.string().default("Contents"),
    sections: z.string().default("Sections"),
    close: z.string().default("Close"),
    menu: z.string().default("Menu"),
    toggleSidebar: z.string().default("Toggle sidebar"),
  })
  .strict();

const pageSchema = z
  .object({
    previous: z.string().default("Previous"),
    next: z.string().default("Next"),
    section: z.string().default("Section"),
  })
  .strict();

const themeSchema = z
  .object({
    light: z.string().default("Light"),
    dark: z.string().default("Dark"),
    system: z.string().default("System"),
    switchTo: z.string().default("Switch to"),
  })
  .strict();

const tocSchema = z
  .object({ title: z.string().default("On this page") })
  .strict();

const typographySchema = z
  .object({
    size: z.string().default("Size"),
    leading: z.string().default("Leading"),
    tracking: z.string().default("Tracking"),
    weight: z.string().default("Weight"),
    print: z.string().default("Print"),
    display: z.string().default("Display"),
    text: z.string().default("Text"),
    uppercase: z.string().default("Uppercase"),
    lowercase: z.string().default("Lowercase"),
    letters: z.string().default("Letters"),
    numerals: z.string().default("Numerals"),
    punctuation: z.string().default("Punctuation"),
  })
  .strict();

const uiStringsShape = {
  actions: actionsSchema.prefault({}),
  brand: brandSchema.prefault({}),
  color: colorSchema.prefault({}),
  content: contentSchema.prefault({}),
  languageSwitcher: languageSwitcherSchema.prefault({}),
  logo: logoSchema.prefault({}),
  nav: navSchema.prefault({}),
  page: pageSchema.prefault({}),
  theme: themeSchema.prefault({}),
  toc: tocSchema.prefault({}),
  typography: typographySchema.prefault({}),
};

/** Complete template-owned UI copy, with English supplied by leaf defaults. */
export const uiStringsSchema = z.object(uiStringsShape).strict().prefault({});

/** A fully resolved UI dictionary. */
export type UIStrings = z.output<typeof uiStringsSchema>;

/** English is derived from the schema so defaults and types cannot drift. */
export const EN_UI: UIStrings = uiStringsSchema.parse({});

function sparseGroup<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const shape = Object.fromEntries(
    Object.keys(schema.shape).map((key) => [key, z.string().optional()]),
  ) as { [Key in keyof T]: z.ZodOptional<z.ZodString> };

  return z.object(shape).strict();
}

/** A strict, two-level partial dictionary used by built-in language packs. */
export const uiStringsOverrideSchema = z
  .object({
    actions: sparseGroup(actionsSchema).optional(),
    brand: sparseGroup(brandSchema).optional(),
    color: sparseGroup(colorSchema).optional(),
    content: sparseGroup(contentSchema).optional(),
    languageSwitcher: sparseGroup(languageSwitcherSchema).optional(),
    logo: sparseGroup(logoSchema).optional(),
    nav: sparseGroup(navSchema).optional(),
    page: sparseGroup(pageSchema).optional(),
    theme: sparseGroup(themeSchema).optional(),
    toc: sparseGroup(tocSchema).optional(),
    typography: sparseGroup(typographySchema).optional(),
  })
  .strict();

export type UIStringsOverride = z.input<typeof uiStringsOverrideSchema>;

const PACKS_BY_LOWER = new Map(
  Object.entries(UI_PACKS).map(([code, pack]) => [code.toLowerCase(), pack]),
);

function packFor(locale: string): UIStringsOverride | undefined {
  const normalized = locale.toLowerCase();
  const baseLanguage = normalized.split("-", 1)[0];

  return (
    UI_PACKS[locale] ??
    PACKS_BY_LOWER.get(normalized) ??
    PACKS_BY_LOWER.get(baseLanguage)
  );
}

function mergeUI(
  base: UIStrings,
  override: UIStringsOverride | undefined,
): UIStrings {
  if (!override) return base;

  const merged = structuredClone(base);
  for (const [group, values] of Object.entries(override)) {
    if (!values) continue;
    const target = (merged as Record<string, Record<string, string>>)[group];
    if (target) Object.assign(target, values);
  }
  return merged;
}

/**
 * Resolve template copy as English baseline <- default-locale pack <-
 * requested-locale pack. Pack lookup accepts exact, case-insensitive exact,
 * and base-language matches in that order.
 */
export function resolveUIStrings(
  locale: string,
  { defaultLocale }: { defaultLocale: string },
): UIStrings {
  let resolved = structuredClone(EN_UI);
  resolved = mergeUI(resolved, packFor(defaultLocale));
  if (locale !== defaultLocale) resolved = mergeUI(resolved, packFor(locale));
  return resolved;
}

export { UI_PACKS } from "./ui-packs";
