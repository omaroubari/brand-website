import type { Heading } from "../../core/types";

export interface TocItem extends Heading {
  children: TocItem[];
}

export interface Toc {
  items: TocItem[];
  count: number;
}

export interface TocConfig {
  minLevel: number;
  maxLevel: number;
}

/** Build a table-of-contents outline for the configured heading range. */
export function buildToc(
  headings: readonly Heading[],
  { minLevel, maxLevel }: TocConfig,
): Toc {
  const items: TocItem[] = [];
  const ancestors: TocItem[] = [];
  let count = 0;

  for (const heading of headings) {
    if (heading.depth < minLevel || heading.depth > maxLevel) continue;

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
