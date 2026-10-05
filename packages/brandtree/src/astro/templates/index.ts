const coverImports = (): string => `import data from "brandtree:data";
import { resolveBrand, localeDir, resolveUIStrings, getNavigation, type Navigation, type ContentTree } from "brandtree";
import { CoverPage, generatedOgImagePath, RootLayout, withBase, type BareRootLayoutProps } from "brandtree/runtime";

const config = data.config;
const tree: ContentTree = { ...data.tree, routes: new Map(data.tree.routes) };
`;

const coverBody = (): string => `const brand = config.brand;
const localizedBrand = resolveBrand(brand, locale, config.i18n);
const defaultLocale = config.i18n?.defaultLocale ?? "en";
const ui = resolveUIStrings(locale, { defaultLocale });
const dir = config.i18n ? localeDir(locale, config.i18n) : "ltr";
const route = navigation.root ?? "/";
const siteUrl = localizedBrand.meta.url.replace(/\\/$/u, "");
const absolute = (path: string) =>
  path.startsWith("/") ? \`\${siteUrl}\${withBase(path)}\` : path;

const ogGenerated = Boolean(config.seo.og.enabled ?? true);
const ogImage = ogGenerated ? generatedOgImagePath(route) : null;

const localeSwitch = config.i18n
  ? config.i18n.locales.map(({ code, label, dir }) => ({
      code,
      label,
      dir,
      href: getNavigation(tree, code).root ?? "/",
      isCurrent: code === locale,
      isFallback: false,
    }))
  : [];
const localeAlternates = config.i18n
  ? config.i18n.locales.map(({ code }) => ({
      hreflang: code,
      href: absolute(getNavigation(tree, code).root ?? "/"),
    }))
  : [];
const xDefault =
  localeAlternates.find(
    ({ hreflang }) => hreflang === defaultLocale,
  )?.href ?? null;

const layoutProps = {
  brand: localizedBrand,
  contentLayout: "bare",
  site: {
    title: \`\${localizedBrand.meta.name} — \${localizedBrand.meta.documentTitle}\`,
    description: localizedBrand.meta.description,
  },
  logo: {
    light: localizedBrand.logo.logotype.onLight,
    dark: localizedBrand.logo.logotype.onDark,
    alt: localizedBrand.logo.logotype.altText ?? localizedBrand.meta.name,
    href: route,
  },
  favicon: localizedBrand.logo.favicon ?? "/favicon.svg",
  appleIcon: null,
  banner: null,
  analytics: null,
  navigation,
  navigationNumbering: config.navigation.numbering,
  mcp: null,
  page: {
    title: "",
    description: localizedBrand.meta.description,
    route,
  },
  imageZoom: true,
  codeWrap: false,
  themeMode: localizedBrand.theme.default,
  fontCssVariables: [],
  searchEnabled: false,
  indexable: true,
  ogImage: ogImage ? absolute(ogImage) : null,
  ogGenerated,
  x: undefined,
  canonical: absolute(route),
  editUrl: null,
  askEnabled: false,
  feedback: false,
  exportPdf: false,
  exportEpub: false,
  openInChat: [],
  feeds: [],
  discovery: null,
  siteUrl,
  pageType: undefined,
  published: null,
  lastModified: null,
  noindex: false,
  structuredDataEnabled: false,
  locale,
  dir,
  contentDir: dir,
  ui,
  localeSwitch,
  localeAlternates,
  xDefault,
  versionNotice: null,
  searchVersion: null,
} satisfies BareRootLayoutProps;
---

<RootLayout {...layoutProps}>
  <CoverPage
    brand={localizedBrand}
    ui={ui}
    navigation={navigation}
    numbering={config.navigation.numbering}
  />
</RootLayout>
`;

/** Root cover, or a static default-locale redirect for fully prefixed sites. */
export const indexPageTemplate = (): string => `---
${coverImports()}
export const prerender = true;

const locale = config.i18n?.defaultLocale ?? "en";
const navigation = getNavigation(tree, locale);
if (config.i18n && !config.i18n.hideDefaultLocalePrefix) {
  return Astro.redirect(withBase(navigation.root ?? \`/\${locale}\`), 302);
}

${coverBody()}`;

/** Locale covers; the unprefixed default locale is handled by index.astro. */
export const localizedIndexPageTemplate = (): string => `---
${coverImports()}
export const prerender = true;

interface Props {
  locale: string;
  navigation: Navigation;
}

export function getStaticPaths() {
  const config = data.config;
  const tree: ContentTree = { ...data.tree, routes: new Map(data.tree.routes) };
  const i18n = config.i18n;
  if (!i18n) return [];
  return i18n.locales
    .filter(({ code }) =>
      !i18n.hideDefaultLocalePrefix || code !== i18n.defaultLocale,
    )
    .map(({ code }) => ({
      params: { lang: code },
      props: { locale: code, navigation: getNavigation(tree, code) },
    }));
}

const { locale, navigation } = Astro.props;
${coverBody()}`;
