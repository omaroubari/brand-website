import { describe, expect, it } from "vitest";

import { buildNavigation } from "../src/core/navigation.ts";
import type { NavNode, PageRecord } from "../src/core/types.ts";
import {
  pageMetaSchema,
  type FolderMeta,
  type PageMeta,
} from "../src/core/schema.ts";

const page = (
  id: string,
  route: string,
  title: string,
  sidebar: PageMeta["sidebar"] = {},
  draft = false,
): PageRecord => ({
  // anchors: [],
  contentType: "doc",
  // format: "mdx",
  groups: [],
  headings: [],
  id,
  // links: [],
  locale: "",
  // Mirrors deriveTitle's real behavior: an explicit frontmatter title always
  // equals the page's resolved title, which most fixtures want to simulate.
  meta: pageMetaSchema.parse({ draft, sidebar, title }),
  navPath: id,
  route,
  segments: [],
  source: { name: "filesystem", ref: id },
  sourcePath: `/abs/${id}`,
  title,
  translationKey: route,
  version: "",
  versionKey: route,
});

const asGroup = (node: NavNode | undefined) => {
  if (!node || node.kind !== "group") {
    throw new Error("expected a group node");
  }
  return node;
};

const asPage = (node: NavNode | undefined) => {
  if (!node || node.kind !== "page") {
    throw new Error("expected a page node");
  }
  return node;
};

const labels = (nodes: NavNode[]): string[] => nodes.map((node) => node.label);

const empty = new Map<string, FolderMeta>();

describe("buildNavigation — filesystem sidebar", () => {
  it("nests pages into groups by directory and orders by numeric prefix", () => {
    const nav = buildNavigation(
      [
        page("01-intro.md", "/intro", "Intro"),
        page("guide/02-config.md", "/guide/config", "Config"),
        page("guide/01-setup.md", "/guide/setup", "Setup"),
        page("guide/index.md", "/guide", "Guide Home"),
      ],
      { folderMeta: empty },
    );

    expect(labels(nav.sidebar)).toStrictEqual(["Intro", "Guide"]);
    const guide = asGroup(nav.sidebar[1]);
    // The index promotes the group itself to a linked destination; its sibling
    // pages then retain numeric-prefix order.
    expect(guide.route).toBe("/guide");
    expect(labels(guide.children)).toStrictEqual(["Setup", "Config"]);
  });

  it("excludes pages hidden from the sidebar", () => {
    const nav = buildNavigation(
      [page("a.md", "/a", "A"), page("b.md", "/b", "B", { hidden: true })],
      { folderMeta: empty },
    );
    expect(labels(nav.sidebar)).toStrictEqual(["A"]);
  });

  it("applies sidebar label and badge overrides", () => {
    const nav = buildNavigation(
      [page("a.md", "/a", "Original", { badge: "New", label: "Custom" })],
      { folderMeta: empty },
    );
    const node = asPage(nav.sidebar[0]);
    expect(node.label).toBe("Custom");
    expect(node.badge).toBe("New");
    expect(node.route).toBe("/a");
  });

  // it("honors an explicit sidebar.order over the filename", () => {
  //   const nav = buildNavigation(
  //     [
  //       page("a.md", "/a", "A", { order: 2 }),
  //       page("b.md", "/b", "B", { order: 1 }),
  //     ],
  //     { folderMeta: empty },
  //   );
  //   expect(labels(nav.sidebar)).toStrictEqual(["B", "A"]);
  // });

  it("treats (group) folders as labeled groups, stripping the parens", () => {
    const nav = buildNavigation(
      [page("(legal)/privacy.md", "/privacy", "Privacy")],
      { folderMeta: empty },
    );
    const group = asGroup(nav.sidebar[0]);
    expect(group.label).toBe("Legal");
    expect(labels(group.children)).toStrictEqual(["Privacy"]);
  });

  // it("hoists loose pages above groups in flat display", () => {
  //   const nav = buildNavigation(
  //     [
  //       page("provider/biome.md", "/provider/biome", "Biome"),
  //       page("rules.md", "/rules", "Rules"),
  //       page("setup.md", "/setup", "Setup"),
  //     ],
  //     { folderMeta: empty },
  //   );
  //   // Alphabetically "Provider" sorts before "Rules"/"Setup", but a loose page
  //   // after a flat group header would read as that group's child.
  //   expect(labels(nav.sidebar)).toStrictEqual(["Rules", "Setup", "Provider"]);
  // });

  // it("hoists pages recursively inside nested flat groups", () => {
  //   const nav = buildNavigation(
  //     [
  //       page("guide/advanced/deep.md", "/guide/advanced/deep", "Deep"),
  //       page("guide/zz-usage.md", "/guide/usage", "Usage"),
  //     ],
  //     { folderMeta: empty },
  //   );
  //   const guide = asGroup(nav.sidebar[0]);
  //   expect(labels(guide.children)).toStrictEqual(["Usage", "Advanced"]);
  // });

  it("excludes the root tab from tab-section scoping under a basePath", () => {
    // A `path: "/"` tab spans the whole tree. Tab paths are rebased before
    // tab-section matching, so under `basePath: "/docs"` the root tab becomes
    // `/docs` — exactly a root-level `(group)` folder's routePath. It must
    // still be recognized as the root and not hoist that group's pages above
    // its subgroups (non-flat displays keep file order inside groups).
    const pages = [
      page("(intro)/alpha/one.md", "/docs/alpha/one", "One"),
      page("(intro)/zeta.md", "/docs/zeta", "Zeta"),
    ];
    const options = {
      display: "group" as const,
      folderMeta: empty,
      tabs: [{ label: "Docs", path: "/" }],
    };
    const based = buildNavigation(pages, { ...options, basePath: "/docs" });
    const baseless = buildNavigation(
      [
        page("(intro)/alpha/one.md", "/alpha/one", "One"),
        page("(intro)/zeta.md", "/zeta", "Zeta"),
      ],
      options,
    );
    // The based sidebar must order exactly like the base-less one.
    expect(labels(asGroup(based.sidebar[0]).children)).toStrictEqual(
      labels(asGroup(baseless.sidebar[0]).children),
    );
    // The root is carried on the navigation (in based/localized path space) so
    // render-time tab scoping recognizes the root tab the same way.
    expect(based.root).toBe("/docs");
    expect(baseless.root).toBe("/");
  });

  it("applies folder meta: title, collapsed, and explicit page order", () => {
    const folderMeta = new Map<string, FolderMeta>([
      [
        "guide",
        {
          collapsed: true,
          order: 0,
          pages: ["beta", "alpha"],
          title: "Guides",
        },
      ],
    ]);
    const nav = buildNavigation(
      [
        page("guide/alpha.md", "/guide/alpha", "Alpha"),
        page("guide/beta.md", "/guide/beta", "Beta"),
      ],
      { folderMeta },
    );
    const group = asGroup(nav.sidebar[0]);
    expect(group.label).toBe("Guides");
    expect(group.collapsed).toBe(true);
    expect(labels(group.children)).toStrictEqual(["Beta", "Alpha"]);
  });
});

describe("buildNavigation — group route paths", () => {
  it("keeps the folder route when the index page is inserted first", () => {
    // index.mdx sorts before its siblings, and an index page's route has no
    // page segment to drop — the group used to get "/" and tab scoping broke.
    const nav = buildNavigation(
      [
        page("guides/index.mdx", "/guides", "Guide Home"),
        page("guides/quickstart.mdx", "/guides/quickstart", "Quickstart"),
      ],
      { folderMeta: empty },
    );
    expect(asGroup(nav.sidebar[0]).path).toBe("/guides");
  });

  it("treats a numeric-prefixed index (01-index) as the folder index", () => {
    // Route mapping strips the ordering prefix before dropping `index`, so
    // `01-index.mdx` routes to the folder — it must sort first (like `index`)
    // and keep the group's route path, not shift it by a phantom page segment.
    const nav = buildNavigation(
      [
        // Inserted first so the group's routePath comes from the index page.
        page("guides/01-index.mdx", "/guides", "Guide Home"),
        page("guides/02-setup.mdx", "/guides/setup", "Setup"),
      ],
      { folderMeta: empty },
    );
    const group = asGroup(nav.sidebar[0]);
    expect(group.path).toBe("/guides");
    expect(group.route).toBe("/guides");
    expect(labels(group.children)).toStrictEqual(["Setup"]);
  });

  it("paths nested groups from a nested index page", () => {
    const nav = buildNavigation([page("a/b/index.mdx", "/a/b", "B Home")], {
      folderMeta: empty,
    });
    const a = asGroup(nav.sidebar[0]);
    expect(a.path).toBe("/a");
    expect(asGroup(a.children[0]).path).toBe("/a/b");
  });

  it("skips (group) folders when mapping dirs to route segments", () => {
    const nav = buildNavigation(
      [page("(main)/guides/setup.mdx", "/guides/setup", "Setup")],
      { folderMeta: empty },
    );
    const main = asGroup(nav.sidebar[0]);
    // The wrapper group contributes no route segment and spans the root.
    expect(main.path).toBe("/");
    expect(asGroup(main.children[0]).path).toBe("/guides");
  });

  it("right-aligns a locale/base route prefix onto the folder segments", () => {
    const nav = buildNavigation(
      [
        page("guides/index.mdx", "/fr/guides", "Accueil"),
        page("guides/setup.mdx", "/fr/guides/setup", "Setup"),
      ],
      { folderMeta: empty },
    );
    expect(asGroup(nav.sidebar[0]).path).toBe("/fr/guides");
  });
});
