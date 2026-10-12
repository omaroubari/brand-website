import type { AssetReference } from "../core/types.ts";
import { resolveAssetReference } from "../core/local-assets.ts";
import type { BrandConfig } from "./schema.ts";

/** Resolve artwork and download references against root; copy and ordinary URLs are not assets. */
export function collectBrandAssetReferences(
  brand: BrandConfig,
  root: string,
): AssetReference[] {
  const references: Pick<AssetReference, "value" | "path">[] = [];
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
  return references.map((reference) => resolveAssetReference(root, reference));
}
