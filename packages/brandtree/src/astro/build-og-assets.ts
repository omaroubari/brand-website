import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveBrand } from "../brand/localize.ts";
import type { BrandtreeProject } from "../core/project-tree.ts";
import type { RuntimeOgAssets } from "../core/types.ts";

/** Bundle local assets before Astro changes working directories to prerender. */
export const buildOgAssets = async ({
  config,
  context,
  tree,
}: BrandtreeProject): Promise<{
  assets: RuntimeOgAssets;
  warnings: string[];
}> => {
  const assets: RuntimeOgAssets = { logos: {}, fontData: {} };
  const warnings: string[] = [];
  const og = config.seo.og;
  if (!og.enabled) return { assets, warnings };

  const locales = new Set([
    ...(config.i18n?.locales.map(({ code }) => code) ?? ["en"]),
    ...tree.pages.map(({ locale }) => locale),
  ]);
  const logos = new Set(
    [...locales].map(
      (locale) =>
        og.logo ??
        resolveBrand(config.brand, locale, config.i18n).logo.logotype.onDark,
    ),
  );
  for (const logo of logos) {
    if (
      typeof logo !== "string" ||
      !/\.svg$/iu.test(logo) ||
      /^https?:\/\//iu.test(logo)
    )
      continue;
    const file = logo.startsWith("/")
      ? resolve(context.root, "public", logo.slice(1))
      : resolve(context.root, logo);
    try {
      assets.logos[logo] = await readFile(file, "utf8");
    } catch (error) {
      warnings.push(
        `Cannot load OG logo ${file}: ${(error as Error).message}. Using the default mark.`,
      );
    }
  }
  for (const font of og.fonts ?? []) {
    if (typeof font !== "object" || !("src" in font)) continue;
    if (assets.fontData[font.src]) continue;
    const file = resolve(context.root, font.src);
    try {
      assets.fontData[font.src] = (await readFile(file)).toString("base64");
    } catch (error) {
      warnings.push(
        `Cannot load OG font ${file}: ${(error as Error).message}. Using the renderer's fallback font.`,
      );
    }
  }
  return { assets, warnings };
};
