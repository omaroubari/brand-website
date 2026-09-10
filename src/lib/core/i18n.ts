import { UI_PACKS } from "@/i18n/ui-packs/index.ts";
import type { ResolvedConfig, ResolvedI18nConfig } from "./schema.ts";

/**
 * Locale logic, centralized. Every seam that needs to reason about locales
 * (content discovery, navigation, manifest, runtime generation, the catch-all)
 * goes through these helpers so the routing rules live in exactly one place.
 */

/** Locale codes Brandtree recognizes (those it ships a UI pack for, plus English). */
const KNOWN_LOCALES = new Set(
  [...Object.keys(UI_PACKS), "en"].map((code) => code.toLowerCase()),
);

/** True when the project opts into i18n. */
export const i18nEnabled = (
  config: ResolvedConfig,
): config is ResolvedConfig & { i18n: ResolvedI18nConfig } =>
  config.i18n !== undefined;

/** All configured locale codes, default first as authored. */
export const localeCodes = (i18n: ResolvedI18nConfig): string[] =>
  i18n.locales.map((locale) => locale.code);

/** Text direction for a locale (`ltr` when unknown). */
export const localeDir = (
  code: string,
  i18n: ResolvedI18nConfig,
): "ltr" | "rtl" =>
  i18n.locales.find((locale) => locale.code === code)?.dir ?? "ltr";

/**
 * The locale a missing translation falls back to: `fallbackLocale` when set,
 * the default locale when `fallbackLocale` is omitted, or `null` (disabled)
 * when explicitly set to `null`.
 */
export const resolveFallbackLocale = (
  i18n: ResolvedI18nConfig,
): string | null => {
  if (i18n.fallbackLocale === null) {
    return null;
  }
  return i18n.fallbackLocale ?? i18n.defaultLocale;
};

/** URL prefix for a locale: `""` for the hidden default, else `/<code>`. */
export const localePrefix = (code: string, i18n: ResolvedI18nConfig): string =>
  code === i18n.defaultLocale && i18n.hideDefaultLocalePrefix ? "" : `/${code}`;

/**
 * Prefix a locale-agnostic route (e.g. `/guides/x` or `/`) with its locale.
 * `/` becomes `/fr` (or stays `/` for the hidden default).
 */
export const localizeRoute = (
  logicalRoute: string,
  code: string,
  i18n: ResolvedI18nConfig,
): string => {
  const prefix = localePrefix(code, i18n);
  if (!prefix) {
    return logicalRoute;
  }
  return logicalRoute === "/" ? prefix : `${prefix}${logicalRoute}`;
};

/**
 * Detect a leading configured locale directory in a path's segments. All
 * locales, including the default, may be explicit in the content tree. Returns
 * the resolved locale and the remaining locale-stripped segments.
 */
export const detectLocale = (parts: string[], i18n: ResolvedI18nConfig) => {
  // BCP 47 codes are case-insensitive: a conventional lowercase folder
  // (`pt-br/`) must match a configured `pt-BR`. The configured casing is what
  // flows into routes and labels.
  const first = parts[0]?.toLowerCase();
  const matched = i18n.locales.find(
    (locale) => locale.code.toLowerCase() === first,
  );
  if (matched) {
    return { locale: matched.code, rest: parts.slice(1) };
  }
  return { locale: i18n.defaultLocale, rest: parts };
};

/**
 * Resolve where a content file lives across locales, by parser:
 * - `dir`: a leading locale directory (`fr/page.mdx`)
 * - `dot`: a filename suffix (`page.fr.mdx`)
 *
 * A `.$.` infix (e.g. `changelog.$.mdx`) marks a shared, locale-agnostic file
 * that is materialized into every configured locale. Returns the locale-stripped
 * path (used for nav grouping) and the locale codes the file maps to (one for a
 * normal file, all locales for a shared one).
 */
export const localePlacement = (
  rel: string,
  ext: string,
  i18n: ResolvedI18nConfig,
) => {
  const base = rel.slice(0, rel.length - ext.length);

  // Shared `$` file: the same content in every locale. A shared file placed
  // inside a locale directory (`fr/changelog.$.mdx`) still sheds that
  // directory from its nav path — otherwise every locale's record would route
  // under `/fr/…`, nesting the default locale inside the French namespace and
  // the French copy at `/fr/fr/…`.
  if (base.endsWith(".$")) {
    const shared = `${base.slice(0, -2)}${ext}`;
    return {
      locales: i18n.locales.map((locale) => locale.code),
      navPath:
        i18n.parser === "dir"
          ? detectLocale(shared.split("/"), i18n).rest.join("/")
          : shared,
    };
  }

  if (i18n.parser === "dot") {
    const lastDot = base.lastIndexOf(".");
    // Only a dot inside the filename (not a directory) is a locale suffix. Any
    // configured locale counts — including the default, so the symmetric
    // authoring `intro.en.mdx` + `intro.fr.mdx` shares one translation key
    // instead of routing the default file to a literal `/intro.en`.
    if (lastDot > base.lastIndexOf("/")) {
      // Case-insensitive, like `detectLocale`: `intro.pt-br.mdx` matches a
      // configured `pt-BR` and adopts its casing.
      const suffix = base.slice(lastDot + 1).toLowerCase();
      const matched = i18n.locales.find(
        (locale) => locale.code.toLowerCase() === suffix,
      );
      if (matched) {
        return {
          locales: [matched.code],
          navPath: `${base.slice(0, lastDot)}${ext}`,
        };
      }
    }
    return { locales: [i18n.defaultLocale], navPath: rel };
  }

  const { locale, rest } = detectLocale(rel.split("/"), i18n);
  return { locales: [locale], navPath: rest.join("/") };
};

/**
 * The inverse of {@link localePlacement}: where a default-locale file's
 * translation into `locale` lives, by parser:
 * - `dir`: a leading locale directory (`guides/x.mdx` → `fr/guides/x.mdx`)
 * - `dot`: a filename suffix (`guides/x.mdx` → `guides/x.fr.mdx`)
 *
 * Under `dot`, a source authored with an explicit default-locale suffix
 * (`x.en.mdx`) swaps it for the target's (`x.fr.mdx`) — same case-insensitive
 * last-dot-inside-filename logic as `localePlacement`, so both spellings of a
 * default-locale file resolve to one canonical target.
 */
export const localeTargetPath = (
  rel: string,
  ext: string,
  locale: string,
  i18n: ResolvedI18nConfig,
): string => {
  if (i18n.parser === "dot") {
    let base = rel.slice(0, rel.length - ext.length);
    const lastDot = base.lastIndexOf(".");
    if (lastDot > base.lastIndexOf("/")) {
      const suffix = base.slice(lastDot + 1).toLowerCase();
      if (i18n.locales.some((entry) => entry.code.toLowerCase() === suffix)) {
        base = base.slice(0, lastDot);
      }
    }
    return `${base}.${locale}${ext}`;
  }
  return `${locale}/${rel}`;
};
