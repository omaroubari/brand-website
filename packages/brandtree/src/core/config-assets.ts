import {
  defaultFont,
  collectBrandAssetInputs,
  resolveTypographyFonts,
} from "../brand/index.ts";

import {
  checkLocalAssets,
  localAssetDiagnostics,
  resolveAssetReference,
} from "./local-assets.ts";
import type { ResolvedConfig } from "./schema.ts";
import type { AssetReference, Diagnostic, ProjectContext } from "./types.ts";

/** Collect local font sources, preserving each declaration's field location. */
export function collectFontAssetInputs(
  fonts: ResolvedConfig["fonts"],
): Pick<AssetReference, "value" | "path">[] {
  const references: Pick<AssetReference, "value" | "path">[] = [];
  fonts.forEach((font, fontIndex) => {
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

/** Collect enabled social-card logo/font references, preserving authored values. */
export function collectSocialCardAssetInputs(
  og: ResolvedConfig["seo"]["og"],
): Pick<AssetReference, "value" | "path">[] {
  if (!og.enabled) return [];
  const references: Pick<AssetReference, "value" | "path">[] = [];
  if (typeof og.logo === "string") {
    references.push({ value: og.logo, path: ["seo", "og", "logo"] });
  }
  og.fonts?.forEach((font, index) => {
    if (typeof font === "object" && "src" in font) {
      references.push({
        value: font.src,
        path: ["seo", "og", "fonts", index, "src"],
      });
    }
  });
  return references;
}

/**
 * Collect brand, font, and social-card references, then resolve them against root.
 * Preserve authored values and config field locations. No availability checks
 * or directory discovery occur.
 */
export function collectConfigAssetReferences(
  config: ResolvedConfig,
  root: string,
): AssetReference[] {
  const references = [
    ...collectBrandAssetInputs(config.brand),
    ...collectFontAssetInputs(config.fonts),
    ...collectSocialCardAssetInputs(config.seo.og),
  ];
  return references.map((reference) => resolveAssetReference(root, reference));
}

/**
 * Check asset references, return availability diagnostics, and
 * apply supported fallbacks to a copy of the config. Authored config and context
 * references stay intact so missing files can be watched and restored.
 */
export async function prepareConfigAssets(
  config: ResolvedConfig,
  context: ProjectContext,
): Promise<{
  config: ResolvedConfig;
  diagnostics: Diagnostic[];
}> {
  const failures = await checkLocalAssets(context.assetReferences);

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

  // Add default Inter for fallback only when a declared font is pruned.
  if (
    unavailableFontCSSVariables.size > 0 &&
    !fonts.some((font) => font.cssVariable === defaultFont.cssVariable)
  ) {
    fonts.push({
      ...defaultFont,
      weights: [...defaultFont.weights],
      styles: [...defaultFont.styles],
      fallbacks: [...defaultFont.fallbacks],
    });
  }

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
    diagnostics: localAssetDiagnostics(failures, {
      file: context.configFile ?? undefined,
    }),
  };
}
