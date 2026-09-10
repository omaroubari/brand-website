# ADR 0007: Derive nested content routes from the filesystem

- Status: accepted
- Date: 2026-08-30

## Context

The guidelines currently treat every localized MDX file as one flat section.
The catch-all page route can technically receive nested slugs, but the content
loader, navigation, contents page, opener context, and pager all reduce content
to a single ordered list. Larger guidelines therefore cannot express a stable
information hierarchy without adding another hand-maintained manifest.

The template's authoring contract is that structured brand data is centralized
and prose remains file-based MDX. Navigation structure should follow that same
contract: moving or adding content in the filesystem should be sufficient to
produce its route and place it in navigation.

## Decision

Build one locale-specific recursive `ContentTree` from
`src/content/sections/{locale}`:

- directories become nested URL segments and always-expanded navigation
  groups;
- Markdown and MDX files become pages;
- numeric prefixes on files and folders affect sibling order but are removed
  from routes and fallback labels;
- `index.md` or `index.mdx` is the directory's landing page and is represented
  by the linked group label rather than duplicated as a child;
- a top-level `index` remains the locale cover page and is not part of the
  sections collection;
- group and page labels fall back to humanized filesystem names;
- alphabetical fallback uses `Intl.Collator` for the active locale;
- previous/next navigation follows a depth-first traversal of the same tree.

The sidebar and cover contents consume the same resolved tree. Optional section
numbers apply only to top-level groups and ungrouped pages. Page openers no
longer display section numbers. A child page instead displays its ancestor group
path; a group index or ungrouped page displays no eyebrow.

### Folder metadata

An optional locale-specific `meta.ts` beside a folder's pages statically
configures that group:

```ts
import { defineMeta } from "../../../../lib/content-meta";

export default defineMeta({
  title: "Logo",
  icon: "shapes",
  order: 3,
  pages: ["logotype", "brandmark", "usage-rules"],
});
```

`title`, `icon`, `order`, and `pages` are optional. `defineMeta` accepts only a
static object. Computed or asynchronous metadata and shared `meta.$.ts` files
are outside this decision.

The `pages` array orders non-index child pages and groups by normalized slug.
Anything omitted follows filesystem order: numeric prefix, then localized
alphabetical label. The index cannot appear in `pages` because it belongs to
the group node itself. Invalid, duplicate, or unknown entries fail validation.

Icons use a small typed registry of explicitly imported Phosphor React icons.
Metadata stores stable kebab-case names; runtime case conversion and importing
the complete icon package are not permitted.

### Page metadata

The page schema remains behavior-driven:

- optional `title`, falling back to the humanized filename;
- optional `description`, replacing the former `summary` name;
- optional final-segment `slug` override;
- `draft`, with the existing development and production behavior;
- `sidebar.label`, `sidebar.icon`, `sidebar.badge`, and `sidebar.hidden`;
- the existing `seo.title` and `seo.description` fields.

A slug override must be one safe URL segment and cannot be set on an index.
`sidebar.hidden` keeps a page built and routable but removes it from sidebar,
cover contents, and previous/next traversal. Page and group icons share the
typed Phosphor registry; badges render only in the sidebar.

### Validation and scope

Validation rejects unknown metadata references or icons, duplicate metadata
entries, multiple indexes, unsafe slugs, and normalized route collisions. The
recursive model supports arbitrary depth; the interface is optimized and
tested through three levels.

This decision does not add collapsible or drill-in group display modes,
pathless groups, computed metadata, shared locale metadata, search/editorial
frontmatter, or expanded SEO behavior.

## Subsequent decisions

ADR 0008 broadens the content tree into the internal core of the Brandtree
framework. ADR 0009 defines the complete content-i18n model. ADR 0010
supersedes this ADR's static-only, locale-only folder-metadata scope. ADR 0012
supersedes the requirement that every recoverable content-topology mistake fail
the build. ADR 0014 accepts additional page metadata as forward-compatible
framework foundations.

The filesystem-derived hierarchy, index-page behavior, recursive projections,
and reading-order decisions in this ADR remain in force.

## Consequences

- The filesystem becomes the canonical route and navigation hierarchy.
- Nested URLs, sidebar groups, cover contents, opener context, and pagination
  cannot drift because they derive from one tree.
- Locale folders may independently translate and order their group metadata.
- Moving a non-index page into a folder changes its URL by design; a folder
  index preserves the former group URL when used during a migration.
- Authors gain strict failures for ambiguous routes instead of silent ordering
  or navigation bugs.
- Existing consumers of a flat `SectionLink[]` must migrate to the recursive
  content-tree vocabulary.

## Terminology

See [`docs/GLOSSARY.md`](../GLOSSARY.md) for `ContentTree`, `ContentGroup`,
`ContentPage`, `Group index`, `Folder metadata`, and `Reading order`.
