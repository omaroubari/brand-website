# ADR 0020: Render Markdown exports through semantic component alternatives

- Status: accepted
- Date: 2026-10-19

## Context

Brandtree pages combine authored prose with components that derive content from
structured brand configuration. Serving the source MDX would leave component
tags, imports and expressions unresolved. Extracting text from the visual page
would lose information conveyed through colour, geometry or CSS, such as shade
values, clearspace ratios and tone-slider positions.

A Markdown export must preserve the page's prose and brand guidance while using
a document structure that readers and tools can consume independently of the
website. It must follow the same route and locale decisions as HTML without
introducing a second authored document or another source of brand values.

This extends the generated consumer runtime described in
[ADR 0017](0017-define-the-brandtree-consumer-project-contract.md) and the resolved
content routing established in
[ADR 0007](0007-derive-nested-content-routes-from-the-filesystem.md) and
[ADR 0009](0009-support-complete-i18n-content-routing.md).

## Decision

Generate a `[...slug].md.ts` endpoint in the disposable Astro app. Reuse the HTML
page and cover path projections rather than rediscovering files or deriving
routes from source filenames. A page at `/en/logo/logotype` receives an export at
`/en/logo/logotype.md`; locale covers use paths such as `/en.md`, and the site
root uses `/index.md`. The endpoint runs on request during development and
produces static Markdown files during production builds. Locale prefixes,
custom slugs, fallback sources and sidebar-hidden pages follow the HTML route
projections; pages excluded from the build have no Markdown export.

Load and render the same content entry as HTML. Resolve the localized brand, UI
strings and content direction at the endpoint, including fallback content
selection, and pass them into the rendering tree. Frontmatter supplies the page
title and description. Imports, expressions, spreads and authored overrides
execute through the existing MDX pipeline.

### Select alternatives by component identity

Keep the shared MDX machinery in `src/mdx/index.ts` and `src/mdx/runtime.ts`,
exposed through `brandtree/mdx` and `brandtree/mdx/runtime`. Both HTML and
Markdown rendering use this machinery. The shared context accepts a
format-neutral `componentRenderers` map; Markdown-specific alternatives remain
owned by `src/markdown/renderers.ts`.

Extend the MDX compiler's component-call helper to accept a per-render map from
original component identities to alternate renderers. Identity matching supports
built-ins provided through the component registry, explicit import aliases and
namespace members. It does not depend on JSX tag spelling or filesystem paths.
Importing `ColorPalette` under another name still selects its Markdown renderer;
an unrelated author component also named `ColorPalette` does not acquire that
renderer or built-in status through its name.

Evaluate each component reference and its authored props once at the intercepted
call, preserving the JSX runtime's remaining arguments. Continue injecting base
props according to the original built-in identity, with authored props taking
precedence. HTML renders omit the alternative map. Store no page-specific render
state in a global registry.

The Markdown content wrapper supplies the same built-in component registry as
the HTML page. The alternate-renderer map chooses an implementation for a defined
component; it does not make an otherwise missing MDX component available.
The endpoint creates the renderer map with `createMarkdownRenderers()` and passes
it as `componentRenderers` with the resolved brand, UI strings and direction.
The wrapper forwards that render context into MDX props. The `transformBrandtreeMdxCalls` recma plugin captures
those props in `_createMdxContent` and wraps JSX runtime calls with
`renderMdxComponent`, which passes the context to `resolveMdxComponent` and
`injectMdxProps`. The renderer map is separate from brand configuration and the
built-in identity registry used for prop injection. Imported MDX partials forward
`{...props}` to retain that context.

### Render semantic HTML, then serialize Markdown

Give components explicit document representations where their visual HTML would
lose meaning. Examples include colour and type-scale tables, contrast ratios
with threshold comparisons, clearspace instructions with numeric ratios, linked
artwork and downloads, and blockquotes for callouts. Layout wrappers preserve
content in reading order. Reuse existing renderers when their semantic HTML
already carries the necessary content.

Account for every built-in in the typed renderer registry. Derive alternate
renderer props from the original component and share selection and validation
helpers where both formats select the same brand data. Brand values remain in
the consumer configuration. The explicit coverage lives in
`packages/brandtree/src/markdown/renderers.ts`; alternative props use Astro's
`ComponentProps` type, and shared palette and type-style selection helpers live
in `packages/brandtree/src/brand/selections.ts`. Adding a built-in requires choosing
an alternative renderer or deliberately retaining its semantic HTML.

Use Astro's Container API with the MDX and React server renderers to render a
content-only fragment, without website navigation or layout chrome. Parse the
fragment into an HTML syntax tree, remove comments, scripts, styles, SVG elements
and explicitly hidden content, and resolve non-fragment asset and link URLs
against the public HTML page URL. Convert that tree into a Markdown syntax tree
and serialize it with GitHub-flavoured Markdown support. This delegates escaping,
code fences, nested lists, tables, strikethrough and task lists to established
serializers rather than handwritten string concatenation.

## Alternatives considered

- **Serve source MDX.** Simple, but leaves config-driven guidance and component
  expressions unresolved.
- **Replace component tags in the source syntax tree.** Can handle literal props,
  but resolving imported partials, dynamic expressions and spreads would require
  reproducing MDX execution or restricting authoring.
- **Convert the visual page directly.** Reuses rendering, but CSS and SVG can carry
  essential guidance absent from its text, and website controls add noise.
- **Have every component return Markdown strings.** Provides direct control, but
  duplicates escaping and nesting rules across renderers. Semantic HTML gives
  prose and component output one serialization path.

## Consequences

The export reflects the resolved brand and authored component props without a
second content source. Component authors must maintain document meaning alongside
visual meaning, and upgrades must preserve the MDX compiler interception and
Astro's experimental Container API integration.

Custom server-rendered components fall back to conversion of their HTML.
Components nested inside custom Astro or framework components do not automatically
receive MDX call interception. Browser-only behaviour and meaning expressed
exclusively through CSS or SVG require an explicit semantic alternative; the
converter does not infer them. The `brandtree/markdown` export provides
`createMarkdownRenderers(overrides)` for custom rendering integrations, but the generated endpoint currently uses the
built-in map and exposes no consumer-config override setting.

Exports are readable representations, not source round-trips or screenshots.
Links point to public HTML pages and assets. Development responses set
`text/markdown; charset=utf-8`; production hosting determines headers for the
static files. Content negotiation, discovery links and a combined site export
are outside this decision.

Consumer integration tests exercise development responses and static builds,
including localization, fallback content, plain Markdown, imported components,
partials and named slots. Serializer tests cover document syntax and URL
resolution. Astro upgrades should run the consumer integration test because the
Container API is experimental.

Definitions of [Markdown export](../GLOSSARY.md#markdown-export),
[Markdown representation](../GLOSSARY.md#markdown-representation),
[Markdown renderer](../GLOSSARY.md#markdown-renderer),
[renderer map](../GLOSSARY.md#renderer-map) and
[render context](../GLOSSARY.md#render-context) live in the glossary.
