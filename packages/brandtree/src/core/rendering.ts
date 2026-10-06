import type { ContentTree, Navigation, PageRecord } from "./types.ts";

import { getNavigation } from "./navigation.ts";
import {
  normalizeBasePath,
  mountRoute,
  pathParts,
  routePath,
} from "./paths.ts";
import { localizeRoute } from "./i18n.ts";
import type { ResolvedConfig } from "./schema.ts";

export interface ContentPageProps {
  page: PageRecord;
  navigation: Navigation;
}

/** Project cover URLs into Astro paths, including the prefixed-site root redirect. */
export function getCoverPagePaths(
  tree: ContentTree,
  config: Pick<ResolvedConfig, "basePath" | "i18n">,
) {
  const basePath = normalizeBasePath(config.basePath);
  const i18n = config.i18n;
  const defaultLocale = i18n?.defaultLocale ?? "en";
  const routes = [
    {
      route: mountRoute(basePath, "/"),
      locale: defaultLocale,
      redirect: Boolean(i18n && !i18n.hideDefaultLocalePrefix),
    },
  ];
  if (i18n) {
    routes.push(
      ...i18n.locales
        .filter(
          ({ code }) => !i18n.hideDefaultLocalePrefix || code !== defaultLocale,
        )
        .map(({ code }) => ({
          route: mountRoute(basePath, localizeRoute("/", code, i18n)),
          locale: code,
          redirect: false,
        })),
    );
  }
  return routes.map(({ route, locale, redirect }) => ({
    params: { base: route.slice(1) || undefined },
    props: { locale, redirect, navigation: getNavigation(tree, locale) },
  }));
}

/** Convert final URLs to Astro catch-all params. Astro adds base itself. */
export function getContentPagePaths(tree: ContentTree) {
  const covers = new Set(
    [tree.navigation, ...Object.values(tree.navigationByLocale)].map(
      (navigation) => navigation.root ?? "/",
    ),
  );
  return tree.pages.flatMap((page) => {
    const parts = pathParts(page.route);

    // Root indexes belong to the separate cover; nested indexes and hidden
    // pages remain routable at their resolved URLs.
    if (covers.has(routePath(parts))) return [];

    const props: ContentPageProps = {
      page,
      navigation: getNavigation(tree, page.locale),
    };

    return [{ params: { slug: page.route.slice(1) }, props }];
  });
}
