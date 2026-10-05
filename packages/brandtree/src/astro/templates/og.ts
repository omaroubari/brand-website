export const ogEndpointTemplate = (): string =>
  String.raw`import type { APIRoute, GetStaticPaths } from "astro";
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
const fontData = assets.fontData;
export const prerender = true;
const brand = config.brand;

interface OgPageProps extends Record<string, unknown> {
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
    props: OgPageProps;
  }[] = [];
  const seen = new Set<string>();

  // Return early if site wide OG generation is disabled
  if (!Boolean(config.seo.og.enabled ?? true)) {
    return [];
  }

  const add = (route: string, props: OgPageProps) => {
    const slug = slugForRoute(route);
    if (seen.has(slug)) return;
    seen.add(slug);
    paths.push({ params: { slug }, props });
  };

  for (const page of tree.pages) {
    const localizedBrand = resolveBrand(brand, page.locale, config.i18n);
    if (page.meta.seo.image) continue;
    add(page.route, {
      title: page.meta.seo.title ?? page.title,
      description:
        page.meta.seo.description ??
        page.description ??
        localizedBrand.meta.description,
      locale: page.locale,
    });
  }

  const locales = config.i18n?.locales.map(({ code }) => code) ?? ["en"];
  for (const locale of locales) {
    const localizedBrand = resolveBrand(brand, locale, config.i18n);
    add(getNavigation(tree, locale).root ?? "/", {
      title: localizedBrand.meta.documentTitle,
      description: localizedBrand.meta.description,
      locale,
    });
  }

  return paths;
};

export const GET: APIRoute<OgPageProps> = async ({ props }) => {
  const localizedBrand = resolveBrand(brand, props.locale, config.i18n);
  const og = config.seo.og;
  const light = localizedBrand.theme.light;
  const siteTitle = localizedBrand.meta.documentTitle;
  const color = (reference: Parameters<typeof resolveColor>[1]) =>
    colorCss(resolveColor(localizedBrand, reference).value);
  const localFonts = (og.fonts ?? []).filter(
    (font): font is Extract<typeof font, { src: string }> =>
      typeof font === "object" && "src" in font,
  );
  const availableFonts = localFonts.filter((font) => fontData[font.src]);
  const primaryFont = availableFonts[0]?.name;
  const logoSource = og.logo ?? localizedBrand.logo.logotype.onDark;
  const bundledLogo = typeof logoSource === "string" ? assets.logos[logoSource] : logoSource;

  const png = await renderOgImage({
    title: props.title,
    siteTitle,
    eyebrow: resolveOgLayer(og.eyebrow, siteTitle),
    description: resolveOgLayer(og.description, props.description),
    logo: resolveOgLogo(og.logo, bundledLogo),
    site: resolveOgLayer(og.site, new URL(localizedBrand.meta.url).host),
    fonts: availableFonts,
    fontData,
    titleFont: primaryFont,
    bodyFont: primaryFont,
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
