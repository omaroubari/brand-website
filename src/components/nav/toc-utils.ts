import type { MarkdownHeading } from "astro";

export interface TocItem extends MarkdownHeading {
  children: TocItem[];
}

export interface Toc {
  items: TocItem[];
  count: number;
}

export interface TocConfig {
  minHeadingLevel: number;
  maxHeadingLevel: number;
}

/** Build a table-of-contents outline for the configured heading range. */
export function buildToc(
  headings: readonly MarkdownHeading[],
  { minHeadingLevel, maxHeadingLevel }: TocConfig,
): Toc {
  const items: TocItem[] = [];
  const ancestors: TocItem[] = [];
  let count = 0;

  for (const heading of headings) {
    if (
      heading.depth < minHeadingLevel ||
      heading.depth > maxHeadingLevel
    )
      continue;

    const item = { ...heading, children: [] };
    count += 1;

    while (true) {
      const ancestor = ancestors.at(-1);
      if (!ancestor || ancestor.depth < heading.depth) break;
      ancestors.pop();
    }

    const parent = ancestors.at(-1);
    if (parent) {
      parent.children.push(item);
    } else {
      items.push(item);
    }
    ancestors.push(item);
  }

  return { items, count };
}
