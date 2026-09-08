import { brand } from "../brand/config";
import type { BrandConfig, BrandLocaleOverride } from "../brand/types";
import { resolveUIStrings } from "../lib/i18n-ui";

export {
  EN_UI,
  resolveUIStrings,
  UI_PACKS,
  uiStringsOverrideSchema,
  uiStringsSchema,
  type UIStrings,
  type UIStringsOverride,
} from "../lib/i18n-ui";

type ConfiguredI18n = NonNullable<typeof brand.i18n>;
const configuredI18n = brand.i18n;

if (!configuredI18n) {
  throw new Error(
    "The current runtime requires brand.i18n; single-locale routing is not implemented yet.",
  );
}

/** Locales configured for the site, in language-switcher display order. */
export type Locale = ConfiguredI18n["locales"][number]["code"];
export const supportedLocales = configuredI18n.locales.map(({ code }) => code) as readonly Locale[];
export const defaultLocale = configuredI18n.defaultLocale as Locale;
export const LOCALE_COOKIE_NAME = "brand-locale";

export type LocaleDirection = "ltr" | "rtl";

export interface LocaleInfo {
  code: Locale;
  label: string;
  dir: LocaleDirection;
}

export const localeInfo = Object.fromEntries(
  configuredI18n.locales.map(({ code, label, dir }) => [code, { code, label, dir }]),
) as Record<Locale, LocaleInfo>;

const localeSet = new Set<string>(supportedLocales);

/** Return a supported locale, falling back to the configured default. */
export function getLocale(value: string | null | undefined): Locale {
  return value && localeSet.has(value) ? (value as Locale) : defaultLocale;
}

/** Read the locale prefix from a pathname, with the configured default as fallback. */
export function getLocaleFromPath(pathname: string): Locale {
  const firstSegment = pathname.replace(/^\/+/, "").split(/[/?#]/, 1)[0];
  return getLocale(firstSegment);
}

export function getDirection(locale: Locale | string | null | undefined): LocaleDirection {
  return localeInfo[getLocale(locale)].dir;
}

/**
 * Build a fully-prefixed locale URL. Existing locale prefixes are replaced so
 * language switchers can safely pass the current pathname back through this
 * helper. Query strings and hashes are preserved.
 */
export function getLocalizedPath(pathname: string, locale: Locale | string): string {
  const resolvedLocale = getLocale(locale);
  const match = pathname.match(/^([^?#]*)([?#].*)?$/);
  const rawPath = match?.[1] || "/";
  const suffix = match?.[2] ?? "";
  const withoutLeading = rawPath.replace(/^\/+/, "");
  const segments = withoutLeading.split("/");
  if (localeSet.has(segments[0] ?? "")) segments.shift();
  const rest = segments.filter(Boolean).join("/");
  return `/${resolvedLocale}/${rest}${suffix}`.replace(/\/$/, rest ? "" : "/");
}

/**
 * Return the complete template UI dictionary for a locale, using the site's
 * configured default locale as the resolver's intermediate fallback.
 */
export function getUi(locale: Locale | string | null | undefined) {
  return resolveUIStrings(locale ?? defaultLocale, { defaultLocale });
}

function mergeLocalizedCollection<T extends Record<K, string | number>, K extends keyof T>(
  canonical: T[],
  localized: Array<Pick<T, K> & Partial<T>> | undefined,
  identityKey: K,
  _path: string,
  _locale: string,
): T[] {
  const localizedByIdentity = new Map<string | number, Partial<T>>();
  for (const item of localized ?? []) {
    const identity = item[identityKey];
    localizedByIdentity.set(identity, item);
  }

  return canonical.map((item) => ({
    ...item,
    ...localizedByIdentity.get(item[identityKey]),
  }));
}

/**
 * Resolve locale-sensitive typography and translated copy onto a cloned
 * config. Palette values, artwork paths, URLs, dimensions and all other
 * invariant brand facts remain sourced from the canonical config.
 */
export function resolveBrand<T extends BrandConfig>(brand: T, locale: Locale | string): T {
  const resolvedLocale = getLocale(locale);
  const override: BrandLocaleOverride = brand.locales?.[resolvedLocale] ?? {};

  const result: BrandConfig = {
    ...brand,
    meta: { ...brand.meta, ...override.meta },
    colors: {
      ...brand.colors,
      palette: mergeLocalizedCollection(
        brand.colors.palette,
        override.colors?.palette,
        "id",
        "colors.palette",
        resolvedLocale,
      ),
      swatches: mergeLocalizedCollection(
        brand.colors.swatches,
        override.colors?.swatches,
        "id",
        "colors.swatches",
        resolvedLocale,
      ),
    },
    typography: {
      ...brand.typography,
      display: override.typography?.display ?? brand.typography.display,
      text: override.typography?.text ?? brand.typography.text,
      mono: override.typography?.mono ?? brand.typography.mono,
      families: mergeLocalizedCollection(
        brand.typography.families,
        override.typography?.families,
        "id",
        "typography.families",
        resolvedLocale,
      ),
      weights: mergeLocalizedCollection(
        brand.typography.weights,
        override.typography?.weights,
        "weight",
        "typography.weights",
        resolvedLocale,
      ),
      scale: mergeLocalizedCollection(
        brand.typography.scale,
        override.typography?.scale,
        "id",
        "typography.scale",
        resolvedLocale,
      ),
    },
    logo: {
      ...brand.logo,
      logotype: { ...brand.logo.logotype, ...override.logo?.logotype },
      brandmark: { ...brand.logo.brandmark, ...override.logo?.brandmark },
      pronunciation: override.logo?.pronunciation ?? brand.logo.pronunciation,
      clearspace: { ...brand.logo.clearspace, ...override.logo?.clearspace },
      colorways: mergeLocalizedCollection(
        brand.logo.colorways,
        override.logo?.colorways,
        "id",
        "logo.colorways",
        resolvedLocale,
      ),
    },
    contact: brand.contact
      ? {
          ...brand.contact,
          address: override.contact?.address ?? brand.contact.address,
          socials:
            brand.contact.socials || override.contact?.socials
              ? mergeLocalizedCollection(
                  brand.contact.socials ?? [],
                  override.contact?.socials,
                  "id",
                  "contact.socials",
                  resolvedLocale,
                )
              : undefined,
        }
      : brand.contact,
    downloads:
      brand.downloads || override.downloads
        ? mergeLocalizedCollection(
            brand.downloads ?? [],
            override.downloads,
            "id",
            "downloads",
            resolvedLocale,
          )
        : undefined,
  };

  return result as T;
}

/** Alias emphasizing that the returned config is safe to pass to components. */
export const getLocalizedBrand = resolveBrand;
