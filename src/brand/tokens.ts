import type {
  BrandColorFamily,
  BrandColorToken,
  BrandColorValue,
  BrandConfig,
  BrandScheme,
  BrandShadeStep,
  BrandSpecialColor,
  BrandSwatch,
} from "./types";

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** The fixed order used by Tailwind-style shade scales. */
export const shadeSteps = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const satisfies readonly BrandShadeStep[];

/** System colours that are always available without a palette declaration. */
const specialColors: Record<BrandSpecialColor, BrandColorValue> = {
  black: { space: "hex", value: "#000000" },
  white: { space: "hex", value: "#ffffff" },
};

interface ResolvedColor {
  value: BrandColorValue;
  css: string;
  family?: BrandColorFamily;
  shade?: BrandShadeStep;
}

/** The canonical order and complete runtime shape of the shadcn contract. */
export const schemeRoles = [
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
] as const satisfies ReadonlyArray<keyof BrandScheme>;

function validateColor(value: BrandColorValue, label: string): void {
  if (value.space === "hex") {
    if (!HEX.test(value.value)) {
      throw new Error(`[brand] Invalid hex for ${label}: "${value.value}".`);
    }
    return;
  }

  if (
    value.l < 0 ||
    value.l > 1 ||
    value.c < 0 ||
    value.h < 0 ||
    value.h > 360 ||
    (value.alpha !== undefined && (value.alpha < 0 || value.alpha > 1))
  ) {
    throw new Error(`[brand] Invalid OKLCH value for ${label}.`);
  }
}

function validatePalette(brand: BrandConfig): void {
  const familyIds = new Set<string>();
  const swatchIds = new Set<string>();

  for (const family of brand.colors.palette) {
    if (!ID.test(family.id)) {
      throw new Error(
        `[brand] Invalid palette family id "${family.id}". Use lowercase kebab-case.`,
      );
    }
    if (familyIds.has(family.id)) {
      throw new Error(`[brand] Duplicate palette family id "${family.id}".`);
    }
    for (const step of shadeSteps) {
      validateColor(family.shades[step], `${family.id}-${step}`);
    }
    familyIds.add(family.id);
  }

  for (const swatch of brand.colors.swatches) {
    if (!ID.test(swatch.id)) {
      throw new Error(
        `[brand] Invalid swatch id "${swatch.id}". Use lowercase kebab-case.`,
      );
    }
    if (swatchIds.has(swatch.id)) {
      throw new Error(`[brand] Duplicate swatch id "${swatch.id}".`);
    }
    resolveColor(brand, swatch.color);
    if (swatch.on) resolveColor(brand, swatch.on);
    swatchIds.add(swatch.id);
  }
}

function validateScheme(brand: BrandConfig, name: "light" | "dark"): void {
  const scheme = brand.theme[name];
  const roles = new Set(Object.keys(scheme));

  for (const role of schemeRoles) {
    if (!roles.has(role)) {
      throw new Error(`[brand] ${name} scheme is missing role "${role}".`);
    }
    resolveColor(brand, scheme[role]);
  }
}

function validateBrandTheme(brand: BrandConfig): void {
  validatePalette(brand);
  validateScheme(brand, "light");
  validateScheme(brand, "dark");
}

/** Look a named documentation swatch up by id. */
export function swatch(brand: BrandConfig, id: string): BrandSwatch {
  const found = brand.colors.swatches.find((candidate) => candidate.id === id);
  if (!found) {
    const known = brand.colors.swatches.map((color) => color.id).join(", ");
    throw new Error(`[brand] Unknown swatch id "${id}". Known ids: ${known}`);
  }
  return found;
}

/** Resolve a palette shade or built-in black/white token to its source value. */
export function resolveColor(
  brand: BrandConfig,
  reference: BrandColorToken,
): ResolvedColor {
  if (reference === "black" || reference === "white") {
    return { value: specialColors[reference], css: reference };
  }

  const shade = shadeSteps.find((step) => reference.endsWith(`-${step}`));
  const familyId = shade
    ? reference.slice(0, `-${shade}`.length * -1)
    : undefined;
  const family = familyId
    ? brand.colors.palette.find((candidate) => candidate.id === familyId)
    : undefined;

  if (!shade || !family) {
    const known = [
      ...Object.keys(specialColors),
      ...brand.colors.palette.flatMap((candidate) =>
        shadeSteps.map((step) => `${candidate.id}-${step}`),
      ),
    ].join(", ");
    throw new Error(
      `[brand] Unknown colour reference "${reference}". Known references: ${known}`,
    );
  }


  return { family, shade, value: family.shades[shade], css: `var(--color-${reference})` };
}

/** Returns the label of a named swatch where there is one, otherwise the family and shade. */
export function colorName(
  brand: BrandConfig,
  reference: BrandColorToken,
): string {
  if (reference === "black") return "Black";
  if (reference === "white") return "White";

  const named = brand.colors.swatches.find(
    (candidate) => candidate.color === reference,
  );
  if (named) return named.name;

  const { family, shade } = resolveColor(brand, reference);
  if (!family || !shade) return reference;
  return `${family.name} ${shade}`;
}

/** CSS-ready output from either supported source colour format. */
export function colorCss(value: BrandColorValue): string {
  if (value.space === "hex") return value.value;

  const alpha = value.alpha === undefined ? "" : ` / ${value.alpha}`;
  return `oklch(${value.l * 100}% ${value.c} ${value.h}${alpha})`;
}

/** `#f0f` and `#ff00ff` → `[r, g, b]`. */
export function hexToRgb(hex: string): [number, number, number] {
  let value = hex.replace("#", "").trim();
  if (value.length === 3) {
    value = value
      .split("")
      .map((channel) => channel + channel)
      .join("");
  }
  const integer = Number.parseInt(value.slice(0, 6), 16);
  return [(integer >> 16) & 255, (integer >> 8) & 255, integer & 255];
}

function linearToSrgb(value: number): number {
  const bounded = Math.max(0, Math.min(1, value));
  return bounded <= 0.0031308
    ? 12.92 * bounded
    : 1.055 * bounded ** (1 / 2.4) - 0.055;
}

/** Convert an OKLCH source colour to sRGB for contrast and print values. */
function oklchToRgb(
  value: Extract<BrandColorValue, { space: "oklch" }>,
): [number, number, number] {
  const hue = (value.h * Math.PI) / 180;
  const a = value.c * Math.cos(hue);
  const b = value.c * Math.sin(hue);
  const l = (value.l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (value.l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (value.l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const blue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return [r, g, blue].map((channel) =>
    Math.round(linearToSrgb(channel) * 255),
  ) as [number, number, number];
}

/** Convert either supported source colour format to sRGB. */
export function colorToRgb(value: BrandColorValue): [number, number, number] {
  return value.space === "hex" ? hexToRgb(value.value) : oklchToRgb(value);
}

/** A derived sRGB Hex value for print specs and other legacy outputs. */
export function colorToHex(value: BrandColorValue): string {
  return `#${colorToRgb(value)
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** A concise representation of the configured source format. */
export function formatColor(value: BrandColorValue): string {
  return value.space === "hex" ? value.value.toLowerCase() : colorCss(value);
}

/** Relative luminance per WCAG 2.1. */
export function luminance(value: BrandColorValue): number {
  const channel = (component: number) => {
    const srgb = component / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = colorToRgb(value);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two configured colour values, 1–21. */
export function contrastRatio(a: BrandColorValue, b: BrandColorValue): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort(
    (left, right) => right - left,
  );
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG grade for a pairing, used by the contrast matrix. */
export function contrastGrade(
  ratio: number,
): "AAA" | "AA" | "AA Large" | "Fail" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

function schemeVars(scheme: BrandScheme): string {
  return schemeRoles
    .map((role) => `--${kebab(role)}: var(--color-${scheme[role]});`)
    .join("\n\t\t");
}

function kebab(value: string): string {
  return value
    .replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
    .replace(/([a-z])([0-9])/g, "$1-$2");
}

/**
 * Every brand-derived custom property, as one `<style>` body.
 *
 * Built-in black/white and each family/shade pair get raw tokens. Semantic
 * shadcn roles then point to those tokens per scheme.
 */
export function brandStyleSheet(brand: BrandConfig): string {
  validateBrandTheme(brand);

  const palette = [
    ...Object.entries(specialColors).map(
      ([id, value]) => `--color-${id}: ${colorCss(value)};`,
    ),
    ...brand.colors.palette.flatMap((family) =>
      shadeSteps.map(
        (step) =>
          `--color-${family.id}-${step}: ${colorCss(family.shades[step])};`,
      ),
    ),
  ].join("\n\t\t");

  const darkScheme = `:root[data-theme='dark'] {
\t\t${schemeVars(brand.theme.dark)}

\t\tcolor-scheme: dark;
\t}`;

  const defaultScheme =
    brand.theme.default === "dark"
      ? `
\t:root:not([data-theme='light']):not([data-theme='dark']) {
\t\t${schemeVars(brand.theme.dark)}

\t\tcolor-scheme: dark;
\t}`
      : brand.theme.default === "system"
        ? `
\t@media (prefers-color-scheme: dark) {
\t\t:root:not([data-theme='light']) {
\t\t\t${schemeVars(brand.theme.dark)}

\t\t\tcolor-scheme: dark;
\t\t}
\t}`
        : "";

  return `:root {
\t\t${palette}

\t\t--font-display: ${brand.typography.display};
\t\t--font-text: ${brand.typography.text};
\t\t--font-mono: ${brand.typography.mono};

\t\t${schemeVars(brand.theme.light)}

\t\tcolor-scheme: light;
\t}

\t${darkScheme}
${defaultScheme}`;
}
