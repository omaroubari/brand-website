export type OgLayerOverride = string | false | undefined;

/** Resolve a site-level card layer: a string replaces the default, false hides it. */
export function resolveOgLayer(
  override: OgLayerOverride,
  fallback: string | undefined,
): string | undefined {
  return override === false ? undefined : (override ?? fallback);
}

/** A configured false hides the mark; a path has already been bundled upstream. */
export function resolveOgLogo(
  override: string | false | undefined,
  bundled: string | false | undefined,
): string | false | undefined {
  return override === false || bundled === false ? false : bundled;
}
