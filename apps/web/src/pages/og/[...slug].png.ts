import type { APIRoute, GetStaticPaths } from "astro";
import { fontData, logo as bundledLogo } from "virtual:og-assets";

import { brand, config } from "@/brand/config";
import { resolveBrand } from "brandtree";
import { colorCss, resolveColor } from "brandtree";
import { getNavigation } from "brandtree";
import { getContentTree } from "@/core/loader";
import { renderOgImage } from "brandtree/runtime";
import { resolveOgLayer, resolveOgLogo } from "brandtree/runtime";
import { localeDir } from "brandtree";

export const prerender = true;

interface OgPageProps extends Record<string, unknown> {
  title: string;
  description?: string;
  locale: string;
}

const slugForRoute = (route: string): string =>
  route.replace(/^\/+|\/+$/gu, "") || "index";

export const getStaticPaths: GetStaticPaths = async () => {
  const tree = await getContentTree();
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
  const primaryFont = localFonts[0]?.name;

  const png = await renderOgImage({
    title: props.title,
    siteTitle,
    eyebrow: resolveOgLayer(og.eyebrow, siteTitle),
    description: resolveOgLayer(og.description, props.description),
    logo: resolveOgLogo(og.logo, bundledLogo),
    site: resolveOgLayer(og.site, new URL(localizedBrand.meta.url).host),
    fonts: localFonts,
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
    dir: localeDir(props.locale, config.i18n),
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/png",
    },
  });
};
