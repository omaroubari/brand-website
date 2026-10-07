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
      variant.src.forEach((value, sourceIndex) => {
        references.push({
          value,
          path: [
            "fonts",
            fontIndex,
            "options",
            "variants",
            variantIndex,
            "src",
            sourceIndex,
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
  const unavailable = new Set(
    failures.map(({ reference }) => JSON.stringify(reference.path)),
  );
  const fonts: ResolvedConfig["fonts"] = [];
  const unavailableVariables = new Set<string>();
  config.fonts.forEach((font, fontIndex) => {
    if (font.provider !== "local") {
      fonts.push(font);
      return;
    }
    const variants: (typeof font.options.variants)[number][] = [];
    font.options.variants.forEach((variant, variantIndex) => {
      const [first, ...rest] = variant.src.filter(
        (_, sourceIndex) =>
          !unavailable.has(
            JSON.stringify([
              "fonts",
              fontIndex,
              "options",
              "variants",
              variantIndex,
              "src",
              sourceIndex,
            ]),
          ),
      );
      if (first !== undefined)
        variants.push({ ...variant, src: [first, ...rest] });
    });
    const [first, ...rest] = variants;
    if (first !== undefined)
      fonts.push({ ...font, options: { variants: [first, ...rest] } });
    else unavailableVariables.add(font.cssVariable);
  });
  return {
    config: {
      ...config,
      fonts,
      brand: resolveTypographyFonts(
        config.brand,
        config.fonts,
        unavailableVariables,
      ),
    },
    diagnostics: localAssetDiagnostics(failures, options),
  };
}
