import type { ResolvedI18nConfig } from "../lib/core/schema";
import type { BrandConfig, BrandLocaleOverride } from "./schema";

/**
 * Resolve the locale-owned portion of a brand config without mutating the
 * canonical config. Palette values, artwork paths, URLs, dimensions and all
 * other invariant brand facts remain sourced from the canonical config.
 *
 * The i18n argument is optional so a single-locale site can resolve its
 * default locale without fabricating a project-level config. When present,
 * locale matching is case-insensitive and returns the configured casing.
 */
export function resolveBrand<T extends BrandConfig>(
  brand: T,
  locale: string,
  i18n?: ResolvedI18nConfig,
): T {
  const resolvedLocale = resolveLocale(locale, i18n);
  const override: BrandLocaleOverride =
    brand.localeOverrides?.[resolvedLocale] ?? {};

  const result: BrandConfig = {
    ...brand,
    meta: { ...brand.meta, ...override.meta },
    colors: {
      ...brand.colors,
      palette: mergeLocalizedCollection(
        brand.colors.palette,
        override.colors?.palette,
        "id",
      ),
      swatches: mergeLocalizedCollection(
        brand.colors.swatches,
        override.colors?.swatches,
        "id",
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
      ),
      weights: mergeLocalizedCollection(
        brand.typography.weights,
        override.typography?.weights,
        "weight",
      ),
      scale: mergeLocalizedCollection(
        brand.typography.scale,
        override.typography?.scale,
        "id",
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
          )
        : undefined,
  };

  return result as T;
}

function resolveLocale(
  locale: string | null | undefined,
  i18n?: ResolvedI18nConfig,
): string {
  if (!i18n) return locale || "en";
  const normalized = locale?.toLowerCase();
  return (
    i18n.locales.find((entry) => entry.code.toLowerCase() === normalized)
      ?.code ?? i18n.defaultLocale
  );
}

function mergeLocalizedCollection<
  T extends Record<K, string | number>,
  K extends keyof T,
>(
  canonical: T[],
  localized: Array<Pick<T, K> & Partial<T>> | undefined,
  identityKey: K,
): T[] {
  const localizedByIdentity = new Map<string | number, Partial<T>>();
  for (const item of localized ?? []) {
    localizedByIdentity.set(item[identityKey], item);
  }

  return canonical.map((item) => ({
    ...item,
    ...localizedByIdentity.get(item[identityKey]),
  }));
}
