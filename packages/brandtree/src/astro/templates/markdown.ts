/** Markdown is generated from the same page records and MDX modules as HTML. */
export const markdownEndpointTemplate = (): string => String.raw`
import type { APIRoute, GetStaticPaths } from "astro";
import { getEntry, render, type CollectionKey } from "astro:content";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import mdxRenderer from "@astrojs/mdx/server.js";
import reactRenderer from "@astrojs/react/server.js";
import data from "brandtree:data";
import { getContentPagePaths, getCoverPagePaths, resolveBrand, resolveUIStrings, resolveFallbackLocale, localeDir, type ContentTree, type ContentPageProps, type Navigation } from "brandtree";
import { Content, Cover, createMarkdownRenderers, htmlToMarkdown } from "brandtree/markdown";

const config = data.config;
interface MarkdownProps extends Record<string, unknown> {
  page?: ContentPageProps["page"];
  locale: string;
  navigation: Navigation;
}
export const prerender = true;
export const getStaticPaths: GetStaticPaths = () => {
  const tree: ContentTree = { ...data.tree, routes: new Map(data.tree.routes) };
  return [
    ...getContentPagePaths(tree).map(({ params, props }) => ({ params, props: { ...props, locale: props.page.locale } })),
    ...getCoverPagePaths(tree, config).map(({ params, props }) => ({
      params: { slug: params.base ?? "index" }, props,
    })),
  ];
};

export const GET: APIRoute<MarkdownProps> = async ({ props, request }) => {
  const { page, locale, navigation } = props;
  const brand = resolveBrand(config.brand, locale, config.i18n);
  const ui = resolveUIStrings(locale, { defaultLocale: config.i18n?.defaultLocale ?? "en" });
  const fallbackLocale = config.i18n ? resolveFallbackLocale(config.i18n) : null;
  const contentLocale = page?.fallback && fallbackLocale ? fallbackLocale : locale;
  const dir = config.i18n ? localeDir(contentLocale, config.i18n) : "ltr";
  const route = page?.route ?? navigation.root ?? "/";
  const pageUrl = new URL(route.replace(/\/$/u, "") + "/", brand.meta.url).href;
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: mdxRenderer });
  container.addServerRenderer({ name: "@astrojs/react", renderer: reactRenderer });
  container.addClientRenderer({ name: "@astrojs/react", entrypoint: "@astrojs/react/client.js" });
  let html: string;
  if (page) {
    const entry = await getEntry((page.collection ?? "docs") as CollectionKey, page.entryId ?? page.source.ref);
    if (!entry) return new Response(null, { status: 404 });
    const { Content: MdxContent } = await render(entry);
    html = await container.renderToString(Content, {
      request,
      props: { Content: MdxContent, title: page.title, description: page.description, brand, ui, dir, componentRenderers: createMarkdownRenderers() },
    });
  } else {
    html = await container.renderToString(Cover, {
      request, props: { brand, ui, dir, navigation },
    });
  }
  return new Response(htmlToMarkdown(html, pageUrl), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
`;
