import { collectBrandAssetReferences } from "../brand/assets.ts";
import {
  checkLocalAssets,
  localAssetDiagnostics,
  type LocalAssetReference,
} from "./local-assets.ts";
import type { ResolvedConfig } from "./schema.ts";
import type { Diagnostic } from "./types.ts";

/** Typed asset fields opt into the shared path and availability contract. */
export function collectConfigAssetReferences(
  config: Pick<ResolvedConfig, "brand">,
): LocalAssetReference[] {
  return collectBrandAssetReferences(config.brand);
}

/** Report unavailable assets without changing authored references. */
export async function prepareConfigAssets(
  config: ResolvedConfig,
  options: { root: string; file?: string; source?: string },
): Promise<{ config: ResolvedConfig; diagnostics: Diagnostic[] }> {
  const failures = await checkLocalAssets(
    collectConfigAssetReferences(config),
    options.root,
  );
  return { config, diagnostics: localAssetDiagnostics(failures, options) };
}
