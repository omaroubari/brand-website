import type { BrandConfig } from "../brand/schema.ts";

/** The default is part of resolved configuration, not component-owned styling. */
export const defaultFont = {
  name: "Inter",
  cssVariable: "--font-brandtree-default",
  provider: "google" as const,
  weights: ["100 900"] as const,
  styles: ["normal", "italic"] as const,
  fallbacks: ["system-ui", "sans-serif"],
};

/** Preserve authored families while making unresolved variables usable in CSS. */
export function resolveTypographyFonts(
  brand: BrandConfig,
  fonts: readonly { cssVariable: string }[],
): BrandConfig {
  const system = defaultFont.fallbacks.join(", ");
  const fallback = fonts.some(
    ({ cssVariable }) => cssVariable === defaultFont.cssVariable,
  )
    ? `var(${defaultFont.cssVariable}, ${system})`
    : system;
  const resolveFamily = (family: string): string => {
    // A trailing family cannot rescue an undefined var(); its fallback must
    // be inside the function. Existing explicit var() fallbacks stay intact.
    const resolved = family.replace(
      /var\(\s*(--[a-zA-Z_][a-zA-Z0-9_-]*)\s*\)/gu,
      (_, variable: string) => `var(${variable}, ${fallback})`,
    );
    if (!resolved.trim()) return fallback;
    // An authored generic family already terminates the stack intentionally.
    if (/\b(?:serif|sans-serif|monospace|system-ui)\s*$/u.test(resolved))
      return resolved;
    return resolved.endsWith(fallback) ? resolved : `${resolved}, ${fallback}`;
  };
  const resolveTypography = <T extends { display?: string; text?: string }>(
    typography: T,
  ): T => ({
    ...typography,
    ...(typography.display !== undefined && {
      display: resolveFamily(typography.display),
    }),
    ...(typography.text !== undefined && {
      text: resolveFamily(typography.text),
    }),
  });

  return {
    ...brand,
    typography: resolveTypography(brand.typography),
    ...(brand.localeOverrides && {
      localeOverrides: Object.fromEntries(
        Object.entries(brand.localeOverrides).map(([locale, override]) => [
          locale,
          {
            ...override,
            ...(override.typography && {
              typography: resolveTypography(override.typography),
            }),
          },
        ]),
      ),
    }),
  };
}
