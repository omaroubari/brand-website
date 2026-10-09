import {
  collectBrandAssetReferences,
  resolveTypographyFonts,
} from "../brand/index.ts";

import {
  checkLocalAssets,
  localAssetDiagnostics,
  type LocalAssetReference,
} from "./local-assets.ts";

import type { ResolvedConfig } from "./schema.ts";
import type { Diagnostic } from "./types.ts";

/** Enumerate typed asset fields rather than guessing from arbitrary strings. */
export function collectConfigAssetReferences(
  config: ResolvedConfig,
): LocalAssetReference[] {
  const references = collectBrandAssetReferences(config.brand);
  config.fonts.forEach((font, fontIndex) => {
    if (font.provider !== "local") return;
    font.options.variants.forEach((variant, variantIndex) => {
      variant.src.forEach((value, srcIndex) => {
        references.push({
          value,
          path: [
            "fonts",
            fontIndex,
            "options",
            "variants",
            variantIndex,
            "src",
            srcIndex,
          ],
        });
      });
    });
  });
  return references;
}

/** Local availability is recoverable; authored inputs and remote providers stay intact. */
export async function prepareConfigAssets(
  config: ResolvedConfig,
  options: { root: string; file?: string; source?: string },
): Promise<{ config: ResolvedConfig; diagnostics: Diagnostic[] }> {
  const failures = await checkLocalAssets(
    collectConfigAssetReferences(config),
    options.root,
  );
  const unavailablePaths = new Set(
    failures.map(({ reference }) => JSON.stringify(reference.path)),
  );
  const fonts: ResolvedConfig["fonts"] = [];
  const unavailableFontCSSVariables = new Set<string>();

  // Prune unavailable local font sources, empty variants, and empty fonts.
  // Track removed fonts' CSS variables for typography fallbacks.
  config.fonts.forEach((font, fontIndex) => {
    if (font.provider !== "local") {
      fonts.push(font);
      return;
    }
    const variants: (typeof font.options.variants)[number][] = [];
    font.options.variants.forEach((variant, variantIndex) => {
      // Select valid variant sources only
      const validVariantSources = variant.src.filter(
        (_, srcIndex) =>
          !unavailablePaths.has(
            JSON.stringify([
              "fonts",
              fontIndex,
              "options",
              "variants",
              variantIndex,
              "src",
              srcIndex,
            ]),
          ),
      );

      // Promote variants with atleast one valid source
      const [first, ...rest] = validVariantSources;
      if (first !== undefined) {
        variants.push({ ...variant, src: [first, ...rest] });
      }
    });
    const [first, ...rest] = variants;
    if (first !== undefined) {
      // Push fonts with atleast one valid variant
      fonts.push({ ...font, options: { variants: [first, ...rest] } });
    } else {
      // Remove the font if no variants remain, recording its CSS variable
      unavailableFontCSSVariables.add(font.cssVariable);
    }
  });

  return {
    config: {
      ...config,
      fonts,
      brand: resolveTypographyFonts(
        config.brand,
        config.fonts,
        unavailableFontCSSVariables,
      ),
    },
    diagnostics: localAssetDiagnostics(failures, options),
  };
}
