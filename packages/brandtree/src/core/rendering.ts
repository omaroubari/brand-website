import type { ContentTree, Navigation, PageRecord } from "./types";

import { getNavigation } from "./navigation";
import { pathParts, routePath } from "./paths";

export interface ContentPageProps {
  page: PageRecord;
  navigation: Navigation;
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
