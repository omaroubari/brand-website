import { config } from "../brand/config";
import type { BrandConfig, BrandLocaleOverride } from "../brand/schema";

type ConfiguredI18n = NonNullable<typeof config.i18n>;
const configuredI18n = config.i18n;

if (!configuredI18n) {
  throw new Error(
    "The current runtime requires config.i18n; single-locale routing is not implemented yet.",
  );
}

/** Locales configured for the site, in language-switcher display order. */
export type Locale = ConfiguredI18n["locales"][number]["code"];
export const supportedLocales = configuredI18n.locales.map(
  ({ code }) => code,
) as readonly Locale[];
export const defaultLocale = configuredI18n.defaultLocale as Locale;
export const LOCALE_COOKIE_NAME = "brand-locale";

export type LocaleDirection = "ltr" | "rtl";

export interface LocaleInfo {
  code: Locale;
  label: string;
  dir: LocaleDirection;
}

export const localeInfo = Object.fromEntries(
  configuredI18n.locales.map(({ code, label, dir }) => [
    code,
    { code, label, dir },
  ]),
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

export function getDirection(
  locale: Locale | string | null | undefined,
): LocaleDirection {
  return localeInfo[getLocale(locale)].dir;
}

/**
 * Build a fully-prefixed locale URL. Existing locale prefixes are replaced so
 * language switchers can safely pass the current pathname back through this
 * helper. Query strings and hashes are preserved.
 */
export function getLocalizedPath(
  pathname: string,
  locale: Locale | string,
): string {
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

export interface UiStrings {
  brandGuidelines: string;
  contents: string;
  assets: string;
  contact: string;
  contactLead: string;
  document: string;
  sections: string;
  previous: string;
  next: string;
  onThisPage: string;
  light: string;
  dark: string;
  system: string;
  close: string;
  menu: string;
  toggleSidebar: string;
  copy: string;
  copied: string;
  copyFailed: string;
  colourCopied: string;
  copyToClipboard: string;
  textOn: string;
  sameColourNoContrast: string;
  shade: string;
  size: string;
  leading: string;
  tracking: string;
  weight: string;
  print: string;
  hex: string;
  rgb: string;
  cmyk: string;
  pantone: string;
  section: string;
  version: string;
  minimumSize: string;
  portraitPending: string;
  language: string;
  note: string;
  do: string;
  dont: string;
  artworkPending: string;
  switchToTheme: string;
  display: string;
  text: string;
  licenceAndDownloads: string;
  clearspaceInstruction: string;
  uppercase: string;
  lowercase: string;
  letters: string;
  numerals: string;
  punctuation: string;
}

type BuiltInLocale = "en" | "ar";

/** UI dictionaries shipped by the template. Brand locales are configured independently. */
export const ui: Record<BuiltInLocale, UiStrings> = {
  en: {
    brandGuidelines: "Brand guidelines",
    contents: "Contents",
    assets: "Assets",
    contact: "Contact",
    contactLead:
      "Anything this document does not answer, ask before you improvise.",
    document: "Document",
    sections: "Sections",
    previous: "Previous",
    next: "Next",
    onThisPage: "On this page",
    light: "Light",
    dark: "Dark",
    system: "System",
    close: "Close",
    menu: "Menu",
    toggleSidebar: "Toggle sidebar",
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Copy failed",
    colourCopied: "Colour copied",
    copyToClipboard: "Copy to clipboard",
    textOn: "Text on",
    sameColourNoContrast: "Same colour, no contrast",
    shade: "Shade",
    size: "Size",
    leading: "Leading",
    tracking: "Tracking",
    weight: "Weight",
    print: "Print",
    hex: "HEX",
    rgb: "RGB",
    cmyk: "CMYK",
    pantone: "PMS",
    section: "Section",
    version: "Version",
    minimumSize: "Minimum size",
    portraitPending: "Portrait pending",
    language: "Language",
    note: "Note",
    do: "Do",
    dont: "Don't",
    artworkPending: "Artwork pending",
    switchToTheme: "Switch to",
    display: "Display",
    text: "Text",
    licenceAndDownloads: "Licence and downloads",
    uppercase: "Uppercase",
    lowercase: "Lowercase",
    letters: "Letters",
    numerals: "Numerals",
    punctuation: "Punctuation",
    clearspaceInstruction:
      "{unit} = x. Keep at least x of clear space on every side of the {mark}. No type, image or graphic element may enter this zone.",
  },
  ar: {
    brandGuidelines: "دليل الهوية",
    contents: "المحتويات",
    assets: "الأصول",
    contact: "التواصل",
    contactLead: "إذا لم تجد الإجابة في هذا الدليل، فتواصل معنا قبل الاجتهاد.",
    document: "المستند",
    sections: "الأقسام",
    previous: "السابق",
    next: "التالي",
    onThisPage: "في هذه الصفحة",
    light: "فاتح",
    dark: "داكن",
    system: "النظام",
    close: "إغلاق",
    menu: "القائمة",
    toggleSidebar: "تبديل الشريط الجانبي",
    copy: "نسخ",
    copied: "تم النسخ",
    copyFailed: "تعذّر النسخ",
    colourCopied: "تم نسخ اللون",
    copyToClipboard: "نسخ إلى الحافظة",
    textOn: "النص على",
    sameColourNoContrast: "اللون نفسه، لا يوجد تباين",
    shade: "درجة",
    size: "الحجم",
    leading: "التباعد الرأسي",
    tracking: "التقارب",
    weight: "السماكة",
    print: "الطباعة",
    hex: "HEX",
    rgb: "RGB",
    cmyk: "CMYK",
    pantone: "PMS",
    section: "القسم",
    version: "الإصدار",
    minimumSize: "الحد الأدنى للحجم",
    portraitPending: "الصورة قيد الإعداد",
    language: "اللغة",
    note: "ملاحظة",
    do: "افعل",
    dont: "لا تفعل",
    artworkPending: "العمل الفني قيد الإعداد",
    switchToTheme: "التبديل إلى",
    display: "عرض",
    text: "نص",
    licenceAndDownloads: "الترخيص والتنزيلات",
    uppercase: "الأحرف الكبيرة",
    lowercase: "الأحرف الصغيرة",
    letters: "الأحرف",
    numerals: "الأرقام",
    punctuation: "علامات الترقيم",
    clearspaceInstruction:
      "{unit} = x. اترك مساحة فارغة لا تقل عن x حول {mark} من جميع الجهات. لا يجوز أن يدخل أي نص أو صورة أو عنصر رسومي إلى هذه المنطقة.",
  },
};

/** Resolve a translated UI label. The key is typed against the complete UI catalog. */
export function t(
  locale: Locale | string | null | undefined,
  key: keyof UiStrings,
): string {
  return getUi(locale)[key] ?? ui.en[key];
}

/**
 * Return the complete UI dictionary for a locale. Template copy resolves by
 * exact locale, then base language (for example `ar-SA` → `ar`), then English.
 */
export function getUi(locale: Locale | string | null | undefined): UiStrings {
  const requested = locale ?? defaultLocale;
  if (Object.hasOwn(ui, requested)) return ui[requested as BuiltInLocale];

  const base = requested.split("-", 1)[0].toLowerCase();
  if (Object.hasOwn(ui, base)) return ui[base as BuiltInLocale];

  return ui.en;
}

function mergeLocalizedCollection<
  T extends Record<K, string | number>,
  K extends keyof T,
>(
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
export function resolveBrand<T extends BrandConfig>(
  brand: T,
  locale: Locale | string,
): T {
  const resolvedLocale = getLocale(locale);
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
