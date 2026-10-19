import { fromHtml } from "hast-util-from-html";
import { toMdast } from "hast-util-to-mdast";
import { toMarkdown } from "mdast-util-to-markdown";
import { gfmToMarkdown } from "mdast-util-gfm";

type HtmlRoot = ReturnType<typeof fromHtml>;
type HtmlNode = HtmlRoot | HtmlRoot["children"][number];

/** Convert a content-only fragment, retaining GFM tables and resolving assets. */
export function htmlToMarkdown(html: string, pageUrl: string): string {
  const tree = fromHtml(html, { fragment: true });
  function clean(node: HtmlNode): void {
    if (!("children" in node)) return;
    node.children = node.children.filter((child) => {
      if (child.type === "comment") return false;
      if (child.type !== "element") return true;
      return (
        !["script", "style", "svg", "astro-dev-toolbar"].includes(
          child.tagName,
        ) &&
        child.properties.ariaHidden !== "true" &&
        child.properties.hidden !== true
      );
    });
    for (const child of node.children) {
      if (child.type === "element") {
        for (const key of ["href", "src"] as const) {
          const value = child.properties[key];
          if (typeof value === "string" && value && !value.startsWith("#")) {
            child.properties[key] = new URL(value, pageUrl).href;
          }
        }
      }
      clean(child);
    }
  }
  clean(tree);
  return toMarkdown(toMdast(tree), {
    extensions: [gfmToMarkdown()],
    bullet: "-",
    fences: true,
  });
}
