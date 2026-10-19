import type { BrandConfig, BrandSwatch } from "./schema.ts";

/** Shared by the website and Markdown so filtering and validation stay aligned. */
export function selectSwatches(
  brand: BrandConfig,
  only?: string[],
  category?: BrandSwatch["category"],
) {
  return only
    ? only.map((id) => {
        const match = brand.colors.swatches.find((color) => color.id === id);
        if (!match) throw new Error(`[ColorPalette] Unknown colour id "${id}"`);
        return match;
      })
    : category
      ? brand.colors.swatches.filter((color) => color.category === category)
      : brand.colors.swatches;
}

export function selectColorFamilies(brand: BrandConfig, only?: string[]) {
  return only
    ? only.map((id) => {
        const match = brand.colors.palette.find((family) => family.id === id);
        if (!match) throw new Error(`[ColorScale] Unknown colour id "${id}"`);
        return match;
      })
    : brand.colors.palette;
}

export function selectTypeStyles(brand: BrandConfig, only?: string[]) {
  return only
    ? only.map((name) => {
        const match = brand.typography.scale.find(
          (style) => style.name === name || style.id === name,
        );
        if (!match) throw new Error(`[TypeScale] Unknown type style "${name}"`);
        return match;
      })
    : brand.typography.scale;
}

/** The demonstration sizes used by both logo-scaling renderers. */
export const defaultLogoSizes = [
  { width: "18rem", label: "288 px / 49 mm" },
  { width: "11.25rem", label: "180 px / 30 mm" },
  { width: "9rem", label: "144 px / 24 mm" },
  { width: "4.5rem", label: "72 px / 12 mm" },
  { width: "2.25rem", label: "36 px / 6 mm" },
];
