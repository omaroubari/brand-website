import type { BrandConfig, BrandScheme, BrandSwatch } from "./types";

const SWATCH_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

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

function validatePalette(brand: BrandConfig): void {
  const seen = new Set<string>();

  for (const swatch of brand.palette) {
    if (!SWATCH_ID.test(swatch.id)) {
      throw new Error(
        `[brand] Invalid swatch id "${swatch.id}". Use lowercase kebab-case.`,
      );
    }
    if (seen.has(swatch.id)) {
      throw new Error(`[brand] Duplicate swatch id "${swatch.id}".`);
    }
    if (!HEX.test(swatch.hex)) {
      throw new Error(
        `[brand] Invalid hex for swatch "${swatch.id}": "${swatch.hex}".`,
      );
    }
    seen.add(swatch.id);
  }
}

function validateScheme(brand: BrandConfig, name: "light" | "dark"): void {
  const scheme = brand.theme[name];
  const roles = new Set(Object.keys(scheme));

  for (const role of schemeRoles) {
    if (!roles.has(role)) {
      throw new Error(`[brand] ${name} scheme is missing role "${role}".`);
    }

    const id = scheme[role];
    if (!brand.palette.some((swatch) => swatch.id === id)) {
      throw new Error(
        `[brand] Unknown swatch id "${id}" in ${name} scheme role "${role}".`,
      );
    }
  }
}

function validateBrandTheme(brand: BrandConfig): void {
  validatePalette(brand);
  validateScheme(brand, "light");
  validateScheme(brand, "dark");
}

/** Look a palette entry up by id. Throws early so typos fail the build, not the page. */
export function swatch(brand: BrandConfig, id: string): BrandSwatch {
  validatePalette(brand);
  const found = brand.palette.find((c) => c.id === id);
  if (!found) {
    const known = brand.palette.map((c) => c.id).join(", ");
    throw new Error(`[brand] Unknown swatch id "${id}". Known ids: ${known}`);
  }
  return found;
}

/** `#f0f` and `#ff00ff` → `[r, g, b]`. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative luminance per WCAG 2.1. */
export function luminance(hex: string): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two hex colours, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Black or white — whichever is legible on `hex`. */
export function readableOn(hex: string): "#000000" | "#ffffff" {
  return contrastRatio(hex, "#000000") >= contrastRatio(hex, "#ffffff")
    ? "#000000"
    : "#ffffff";
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

/** `steps` tints of `hex`, lightest last, matching the ramps in the printed guidelines. */
export function tintRamp(hex: string, steps = 9): string[] {
  const [r, g, b] = hexToRgb(hex);
  return Array.from({ length: steps }, (_, i) => {
    const mix = (i + 1) / (steps + 1);
    const blend = (c: number) => Math.round(c + (255 - c) * mix);
    return `rgb(${blend(r)} ${blend(g)} ${blend(b)})`;
  });
}

function schemeVars(brand: BrandConfig, scheme: BrandScheme): string {
  return schemeRoles
    .map((role) => {
      const id = scheme[role];
      return `--${kebab(role)}: var(--color-${swatch(brand, id).id});`;
    })
    .join("\n\t\t");
}

function kebab(s: string): string {
  return s
    .replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
    .replace(/([a-z])([0-9])/g, "$1-$2");
}

/**
 * Every brand-derived custom property, as one `<style>` body.
 *
 * Emitted once in `BaseLayout`. Colours resolve twice — a raw `--color-{id}`
 * for each palette entry, then canonical shadcn roles pointing at them per
 * scheme — so components only ever reference semantic UI intent.
 */
export function brandStyleSheet(brand: BrandConfig): string {
  validateBrandTheme(brand);

  const palette = brand.palette
    .map((c) => `--color-${c.id}: ${c.hex};`)
    .join("\n\t\t");

  const darkScheme = `:root[data-theme='dark'] {
		${schemeVars(brand, brand.theme.dark)}

		color-scheme: dark;
	}`;

  const defaultScheme =
    brand.theme.default === "dark"
      ? `
	:root:not([data-theme='light']):not([data-theme='dark']) {
		${schemeVars(brand, brand.theme.dark)}

		color-scheme: dark;
	}`
      : brand.theme.default === "system"
        ? `
	@media (prefers-color-scheme: dark) {
		:root:not([data-theme='light']) {
			${schemeVars(brand, brand.theme.dark)}

			color-scheme: dark;
		}
	}`
        : "";

  return `:root {
		${palette}

		--font-display: ${brand.typography.display};
		--font-text: ${brand.typography.text};
		--font-mono: ${brand.typography.mono};

		${schemeVars(brand, brand.theme.light)}

		color-scheme: light;
	}

	${darkScheme}
${defaultScheme}`;
}
