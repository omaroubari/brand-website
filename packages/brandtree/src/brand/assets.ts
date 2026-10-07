import type { LocalAssetReference } from "../core/local-assets.ts";
import type { BrandConfig } from "./schema.ts";

/** Only file-bearing brand fields are assets; copy and ordinary URLs are not. */
export function collectBrandAssetReferences(
  brand: BrandConfig,
): LocalAssetReference[] {
  const references: LocalAssetReference[] = [];
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
