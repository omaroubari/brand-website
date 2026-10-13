import type { CollectedAssetReference } from "../core/types.ts";
import type { BrandConfig } from "./schema.ts";

/** Collect artwork and download references; copy and ordinary URLs are not assets. */
export function collectBrandAssetInputs(
  brand: BrandConfig,
): CollectedAssetReference[] {
  const references: CollectedAssetReference[] = [];
  for (const mark of ["logotype", "brandmark"] as const) {
    for (const scheme of ["onLight", "onDark"] as const) {
      references.push({
        value: brand.logo[mark][scheme],
        path: ["brand", "logo", mark, scheme],
      });
    }
  }
  if (brand.logo.favicon !== undefined) {
    references.push({
      value: brand.logo.favicon,
      path: ["brand", "logo", "favicon"],
    });
  }
  brand.downloads?.forEach(({ href }, index) => {
    references.push({
      value: href,
      path: ["brand", "downloads", index, "href"],
    });
  });
  // Locale overlays only translate artwork/download metadata, not file paths.
  return references;
}
