export const ogEndpointTemplate = (): string =>
  String.raw`import type { APIRoute, GetStaticPaths } from "astro";
import { fontData as astroFontData, experimental_getFontFileURL } from "astro:assets";
import { loadOgFonts, resolveOgFontFamily } from "brandtree/og/fonts";
import bundledAssets from "../../generated/og-assets.json";
import data from "brandtree:data";
import type { ContentTree, RuntimeOgAssets } from "brandtree";

import { resolveBrand } from "brandtree";
import { colorCss, resolveColor } from "brandtree";
import { getNavigation } from "brandtree";
import { renderOgImage } from "brandtree/runtime";
import { resolveOgLayer, resolveOgLogo } from "brandtree/runtime";
import { localeDir } from "brandtree";

const config = data.config;
const assets: RuntimeOgAssets = bundledAssets;
const loadedFonts = () => fontsPromise ??= loadOgFonts(config.fonts, astroFontData, experimental_getFontFileURL, assets.fontData);
let fontsPromise: ReturnType<typeof loadOgFonts> | undefined;
export const prerender = true;
const brandConfig = config.brand;

interface OgImageProps extends Record<string, unknown> {
  title: string;
  description?: string;
  locale: string;
}

const slugForRoute = (route: string): string =>
  route.replace(/^\/+|\/+$/gu, "") || "index";

export const getStaticPaths: GetStaticPaths = async () => {
  const tree: ContentTree = { ...data.tree, routes: new Map(data.tree.routes) };
  const paths: {
    params: { slug: string };
    props: OgImageProps;
  }[] = [];
  const seen = new Set<string>();

  // Return early if site wide OG generation is disabled
  if (!Boolean(config.seo.og.enabled ?? true)) {
    return [];
  }

  const add = (route: string, props: OgImageProps) => {
    const slug = slugForRoute(route);
    if (seen.has(slug)) return;
    seen.add(slug);
    paths.push({ params: { slug }, props });
  };

  for (const page of tree.pages) {
    const brand = resolveBrand(brandConfig, page.locale, config.i18n);
    if (page.meta.seo.image) {
      seen.add(slugForRoute(page.route));
      continue;
    }
    add(page.route, {
      title: page.meta.seo.title ?? page.title,
      description:
        page.meta.seo.description ??
        page.description ??
        brand.meta.description,
      locale: page.locale,
    });
  }

  const locales = config.i18n?.locales.map(({ code }) => code) ?? ["en"];

  for (const locale of locales) {
    const brand = resolveBrand(brandConfig, locale, config.i18n);
    add(getNavigation(tree, locale).root ?? "/", {
      title: brand.meta.documentTitle,
      description: brand.meta.description,
      locale,
    });
  }

  return paths;
};

export const GET: APIRoute<OgImageProps> = async ({ props }) => {
  const brand = resolveBrand(brandConfig, props.locale, config.i18n);
  const og = config.seo.og;
  const light = brand.theme.light;
  const siteTitle = brand.meta.documentTitle;
  const color = (reference: Parameters<typeof resolveColor>[1]) =>
    colorCss(resolveColor(brand, reference).value);
  const { fonts, renderer } = await loadedFonts();
  const logoSource = og.logo ?? brand.logo.logotype.onDark;
  const bundledLogo = typeof logoSource === "string" ? assets.logos[logoSource] : logoSource;


  const png = await renderOgImage({
    renderer,
    title: props.title,
    siteTitle,
    eyebrow: resolveOgLayer(og.eyebrow, siteTitle),
    description: resolveOgLayer(og.description, props.description),
    logo: resolveOgLogo(og.logo, bundledLogo),
    site: resolveOgLayer(og.site, new URL(brand.meta.url).host),
    fonts,
    titleFont: resolveOgFontFamily(brand.typography.display, config.fonts, fonts),
    bodyFont: resolveOgFontFamily(brand.typography.text, config.fonts, fonts),
    palette: {
      accent: og.palette?.accent ?? color(light.accent),
      background: og.palette?.background ?? color(light.background),
      border: og.palette?.border ?? color(light.border),
      foreground: og.palette?.foreground ?? color(light.foreground),
      muted: og.palette?.muted ?? color(light.mutedForeground),
    },
    dir: config.i18n ? localeDir(props.locale, config.i18n) : "ltr",
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/png",
    },
  });
};
`;
