export const catchAllPageTemplate = (): string =>
  `---
import { getEntry, render, type CollectionKey } from "astro:content";
import data from "brandtree:data";
import type { ContentTree } from "brandtree";
import { getContentPagePaths, type ContentPageProps } from "brandtree";
import { resolveBrand } from "brandtree";
import { localeDir, localizeRoute, resolveFallbackLocale } from "brandtree";
import { resolveUIStrings } from "brandtree";
import {
  resolveOgImage,
  RootLayout,
  withBase,
  type ContentRootLayoutProps,
} from "brandtree/runtime";
import * as components from "brandtree/components";

const config = data.config;
const tree: ContentTree = { ...data.tree, routes: new Map(data.tree.routes) };

export function getStaticPaths() {
  const tree: ContentTree = { ...data.tree, routes: new Map(data.tree.routes) };
  return getContentPagePaths(tree);
}

type Props = ContentPageProps;

const { page, navigation } = Astro.props;
const brand = config.brand;

const entry = await getEntry(
  (page.collection ?? "docs") as CollectionKey,
  page.entryId ?? page.source.ref,
);

if (!entry) {
  return new Response(null, { status: 404 });
}

const { Content, headings } = await render(entry);

const localizedBrand = resolveBrand(brand, page.locale, config.i18n);
const defaultLocale = config.i18n?.defaultLocale ?? "en";
const ui = resolveUIStrings(page.locale, { defaultLocale });
const fallbackLocale = config.i18n ? resolveFallbackLocale(config.i18n) : null;
const dir = config.i18n ? localeDir(page.locale, config.i18n) : "ltr";
const contentLocale =
  page.fallback && fallbackLocale ? fallbackLocale : page.locale;
const contentDir = config.i18n ? localeDir(contentLocale, config.i18n) : "ltr";
const siteUrl = localizedBrand.meta.url.replace(/\\/$/u, "");
const absolute = (path: string) =>
  path.startsWith("/") ? \`\${siteUrl}\${withBase(path)}\` : path;

const noindex = page.meta.noindex || page.meta.seo.noindex;

const customOgImage = page.meta.seo.image ?? null;
const resolvedOgImage = resolveOgImage(
  page.route,
  customOgImage,
  Boolean(config.seo.og.enabled ?? true),
);
const ogGenerated = resolvedOgImage.generated;
const ogImage = resolvedOgImage.path;

const translations = tree.pages.filter(
  (candidate) =>
    candidate.translationKey === page.translationKey && !candidate.fallback,
);
const translationsByLocale = new Map(
  tree.pages
    .filter((candidate) => candidate.translationKey === page.translationKey)
    .map((candidate) => [candidate.locale, candidate]),
);
const i18n = config.i18n;
const localeSwitch = i18n
  ? i18n.locales.map(({ code, label, dir: localeDirection }) => {
      const translation = translationsByLocale.get(code);
      return {
        code,
        label,
        dir: localeDirection,
        href:
          translation?.route ??
          localizeRoute(page.translationKey, code, i18n),
        isCurrent: code === page.locale,
        isFallback: translation?.fallback === true,
      };
    })
  : [];
const localeAlternates = translations.map((translation) => ({
  hreflang: translation.locale,
  href: absolute(translation.route),
}));

const xDefault =
  localeAlternates.find(({ hreflang }) => hreflang === fallbackLocale)?.href ??
  null;

const layoutProps = {
  brand: localizedBrand,
  site: {
    title: \`\${localizedBrand.meta.name} \${localizedBrand.meta.documentTitle}\`,
    description: localizedBrand.meta.description,
  },
  contentLayout: "content",
  logo: {
    light: localizedBrand.logo.logotype.onLight,
    dark: localizedBrand.logo.logotype.onDark,
    alt: localizedBrand.logo.logotype.altText ?? localizedBrand.meta.name,
    href: navigation.root ?? "/",
  },
  favicon: localizedBrand.logo.favicon ?? "/favicon.svg",
  appleIcon: null,
  banner: null,
  analytics: null,
  navigation,
  navigationNumbering: config.navigation.numbering,
  mcp: null,
  page: {
    ...page,
    title: page.meta.seo.title ?? page.title,
    description: page.meta.seo.description ?? page.description,
  },
  headings,
  imageZoom: true,
  codeWrap: false,
  themeMode: localizedBrand.theme.default,
  fontCssVariables: config.fonts.map(({ cssVariable }) => cssVariable),
  searchEnabled: false,
  indexable: !noindex,
  ogImage: ogImage ? absolute(ogImage) : null,
  ogGenerated,
  x: undefined,
  canonical: page.meta.seo.canonical ?? absolute(page.route),
  editUrl: null,
  askEnabled: false,
  feedback: false,
  exportPdf: false,
  exportEpub: false,
  openInChat: [],
  feeds: [],
  discovery: null,
  siteUrl,
  pageType: page.contentType,
  published: null,
  lastModified: page.lastModified ?? null,
  noindex,
  structuredDataEnabled: false,
  locale: page.locale,
  dir,
  contentDir,
  ui,
  localeSwitch,
  localeAlternates,
  xDefault,
  versionNotice: null,
  searchVersion: page.version ?? null,
  toc: { enabled: true, minLevel: 2, maxLevel: 3 },
} satisfies ContentRootLayoutProps;
---

<RootLayout {...layoutProps}>
  <Content
    brand={localizedBrand}
    ui={ui}
    dir={contentDir}
    components={components}
  />
</RootLayout>
`;
