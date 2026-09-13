/** The generated card path for a public page route. */
export function generatedOgImagePath(route: string): string {
  const normalized = route.replace(/^\/+|\/+$/gu, "");
  return `/og/${normalized || "index"}.png`;
}

export interface ResolvedOgImage {
  generated: boolean;
  path: string | null;
}

/** A page image always wins; generation is only consulted when it is absent. */
export function resolveOgImage(
  route: string,
  pageImage: string | null | undefined,
  generationEnabled: boolean,
): ResolvedOgImage {
  if (pageImage) return { generated: false, path: pageImage };
  if (!generationEnabled) return { generated: false, path: null };
  return { generated: true, path: generatedOgImagePath(route) };
}
