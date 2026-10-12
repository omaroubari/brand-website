import {
  collectBrandAssetReferences,
  resolveTypographyFonts,
} from "../brand/index.ts";

import {
  checkLocalAssets,
  localAssetDiagnostics,
  resolveAssetReference,
} from "./local-assets.ts";
import type { ResolvedConfig } from "./schema.ts";
import type { AssetReference, Diagnostic, ProjectContext } from "./types.ts";

/** Resolve local font sources against root, preserving each declaration's field location. */
export function collectFontAssetReferences(
  fonts: ResolvedConfig["fonts"],
  root: string,
): AssetReference[] {
  const references: AssetReference[] = [];
  fonts.forEach((font, fontIndex) => {
    if (font.provider !== "local") return;
    font.options.variants.forEach((variant, variantIndex) => {
      variant.src.forEach((value, srcIndex) => {
        references.push(
          resolveAssetReference(root, {
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
          }),
        );
      });
    });
  });
  return references;
}

/** Resolve enabled social-card logo/font references, including legacy bare root-relative paths. */
export function collectSocialCardAssetReferences(
  og: ResolvedConfig["seo"]["og"],
  root: string,
): AssetReference[] {
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
  return references.map((reference) => {
    const value = /^(?:\.?\/|[a-z][a-z0-9+.-]*:|#)/iu.test(reference.value)
      ? reference.value
      : `./${reference.value}`;
    return resolveAssetReference(root, reference, value);
  });
}

/**
 * Merge resolved references from brand, font, and social-card collectors.
 * Each source resolves authored paths against root and preserves values and
 * config field locations. No availability checks or directory discovery occur.
 */
export function collectConfigAssetReferences(
  config: ResolvedConfig,
  root: string,
): AssetReference[] {
  return [
    ...collectBrandAssetReferences(config.brand, root),
    ...collectFontAssetReferences(config.fonts, root),
    ...collectSocialCardAssetReferences(config.seo.og, root),
  ];
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
