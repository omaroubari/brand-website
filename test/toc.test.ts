import { describe, expect, it } from "vitest";
import { buildToc } from "../src/components/nav/toc-utils";

describe("buildToc", () => {
  it("builds the configured outline in one pass", () => {
    const toc = buildToc(
      [
        { depth: 1, slug: "title", text: "Title" },
        { depth: 2, slug: "first", text: "First" },
        { depth: 3, slug: "first-detail", text: "First detail" },
        { depth: 4, slug: "ignored", text: "Ignored" },
        { depth: 2, slug: "second", text: "Second" },
        { depth: 3, slug: "second-detail", text: "Second detail" },
      ],
      { minLevel: 2, maxLevel: 3 },
    );

    expect(toc.count).toBe(4);
    expect(toc.items).toEqual([
      {
        depth: 2,
        slug: "first",
        text: "First",
        children: [
          {
            depth: 3,
            slug: "first-detail",
            text: "First detail",
            children: [],
          },
        ],
      },
      {
        depth: 2,
        slug: "second",
        text: "Second",
        children: [
          {
            depth: 3,
            slug: "second-detail",
            text: "Second detail",
            children: [],
          },
        ],
      },
    ]);
  });

  it("keeps an h3 at the root when no preceding h2 can own it", () => {
    const toc = buildToc(
      [
        { depth: 3, slug: "orphan", text: "Orphan" },
        { depth: 2, slug: "parent", text: "Parent" },
      ],
      { minLevel: 2, maxLevel: 3 },
    );

    expect(toc.items.map(({ slug }) => slug)).toEqual(["orphan", "parent"]);
  });

  it("uses the configured range and nests deeper included headings", () => {
    const toc = buildToc(
      [
        { depth: 2, slug: "excluded", text: "Excluded" },
        { depth: 3, slug: "first", text: "First" },
        { depth: 4, slug: "detail", text: "Detail" },
        { depth: 5, slug: "also-excluded", text: "Also excluded" },
      ],
      { minLevel: 3, maxLevel: 4 },
    );

    expect(toc).toEqual({
      count: 2,
      items: [
        {
          depth: 3,
          slug: "first",
          text: "First",
          children: [
            {
              depth: 4,
              slug: "detail",
              text: "Detail",
              children: [],
            },
          ],
        },
      ],
    });
  });
});
