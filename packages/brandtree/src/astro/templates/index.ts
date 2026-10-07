const coverImports = (): string => `import data from "brandtree:data";
import { getCoverPagePaths, resolveBrand, localeDir, resolveUIStrings, getNavigation, type Navigation, type ContentTree } from "brandtree";
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
  fontCssVariables: config.fonts.map(({ cssVariable }) => cssVariable),
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

/** One route serves the mount root and every configured locale cover. */
export const indexPageTemplate = (): string => `---
${coverImports()}
export const prerender = true;

interface Props {
  locale: string;
  redirect: boolean;
  navigation: Navigation;
}

export function getStaticPaths() {
  const tree: ContentTree = { ...data.tree, routes: new Map(data.tree.routes) };
  return getCoverPagePaths(tree, data.config);
}

const { locale, navigation, redirect } = Astro.props;
if (redirect) {
  return Astro.redirect(withBase(navigation.root ?? \`/\${locale}\`), 302);
}
${coverBody()}`;
