# ADR 0014: Reserve forward-compatible page metadata

- Status: accepted
- Date: 2026-09-10

## Context

The content core will serve more projections than the current sidebar and MDX
page renderer. Search, editorial tooling, version switching, SEO, and a future
content editor need stable places to carry information even when their complete
interfaces are delivered later.

Removing every field without a current visual consumer would repeatedly break
the page contract as committed framework features arrive. Treating every
reserved field as already supported, however, would mislead authors.

## Decision

Accept forward-compatible metadata in `PageRecord` and the page metadata schema
when it belongs to a committed Brandtree capability. Reserved metadata may
include:

- SEO title, description, canonical URL, image, and `noindex` policy;
- source provenance, edit URL, and last-modified information;
- locale fallback and version identity;
- navigation badge, icon, hidden, collapsed, and deprecated state;
- source format, content type, extracted headings, links, and expanded include
  provenance needed by future search and editor tooling.

Distinguish three states in documentation and types:

- **supported**: validated and consumed end to end;
- **accepted foundation**: validated and preserved, with a committed consumer
  still pending;
- **internal**: adapter or implementation data not offered as an authoring API.

An accepted foundation must not silently imply visible behavior. For example,
parsing `seo.canonical` is not equivalent to rendering a canonical link, and
carrying `collapsed` is not equivalent to implementing collapsible navigation.
README documentation should expose a field only when it is supported or label
its pending behavior explicitly.

Reserved fields should remain concrete and typed. Open-ended `any` bags and
unrelated CMS-specific fields do not become part of the core merely because a
future editor is planned.

## Consequences

- Committed future features can evolve without repeatedly replacing page
  identity and metadata contracts.
- Current renderers may ignore accepted foundations intentionally.
- Tests must distinguish preservation from end-to-end behavior.
- Public documentation cannot claim a feature solely because its field exists.
- Periodic review should remove foundations whose corresponding feature is no
  longer committed.

## Superseded decisions

This ADR supersedes ADR 0007's blanket exclusion of search/editorial metadata
and expanded SEO behavior as model concerns. It does not claim that their
rendering and UI are complete.
