# ADR 0008: Establish Brandtree as an Astro brand-site framework

- Status: accepted
- Date: 2026-09-10

## Context

The repository began as a reusable Astro template for brand-guidelines sites.
Nested content, localization, future versioning, and authoring tools now require
more than page-specific helpers. If each feature derives routes, navigation,
and content identity independently, those projections will drift.

Astro remains the rendering framework. Brandtree needs an internal domain model
that describes a brand website without making Astro collection entries the
contract for every future content source.

## Decision

Treat Brandtree as a framework for building brand websites on Astro. Keep a
small content core between content acquisition and Astro rendering:

```text
content source -> SourceEntry -> PageRecord/ContentTree -> Astro routes and UI
```

The core owns stable content identity, normalized routes, locale and version
placement, navigation hierarchy, reading order, and metadata. Astro owns build
integration, MDX rendering, components, assets, and deployment.

The filesystem collection is the only production content source today. The
source-neutral boundary is intentional preparation for a dedicated,
user-friendly editor or CMS with a Mintlify-like authoring experience. That
tool may remain Git- and filesystem-backed; supporting an editor does not imply
making remote databases canonical.

Source-specific data is normalized at the acquisition boundary. Downstream
navigation and rendering code consume `PageRecord` and `ContentTree`, not
filesystem paths, Astro entry shapes, or a future editor's native records.
Astro rendering identity may be attached to a page as adapter data, but it does
not define the page's domain identity.

The core is internal to Brandtree. It should expose seams required by committed
framework capabilities, but it is not an independent general-purpose content
platform. New abstractions must correspond to a supported feature or an
accepted ADR foundation.

Breaking changes to the template's pre-framework content APIs and authoring
layout are acceptable. Compatibility aliases are not required; migrations
should be documented when existing sites need to update.

## Consequences

- Filesystem and future editor content share one route and navigation model.
- Astro-specific rendering remains at the outer boundary.
- Content-source expansion does not require rewriting navigation consumers.
- The core may carry accepted future-facing fields, but speculative platform
  features without a Brandtree use case remain out of scope.
- Existing flat-section helpers and IDs may be replaced rather than preserved.

## Explicitly deferred

- Selecting or implementing the editor/CMS.
- Choosing whether the editor commits directly to Git or synchronizes through
  another service.
- Publishing the content core as a standalone package.
