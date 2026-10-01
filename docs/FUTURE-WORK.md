# Brandtree future work

Features set aside during the CLI design interview on 2026-09-30. These are
outside the initial implementation, not a release schedule or a commitment to
implement every item. Unresolved decisions are kept in the ADRs rather than
treated as deferred features here.

## Search, hosted editing, remote content, and plugins

The author's eight-milestone draft excludes search, hosted editing, remote
content sources, and a general plugin system from the alpha release. Revisit
these capabilities after the local MDX, typed config, and static-output workflow
is established; the existing source-neutral core does not make them initial
implementation requirements.

## Ejection

Allow an author to take ownership of an ordinary Astro project derived from
the generated app. The ejection command, portable output, dependency manifest,
and maintenance contract after ejection remain to be designed.

Current boundary: Brandtree owns `.brandtree/`, which is disposable and is not
an authoring surface. See [Consumer contract](adr/0017-define-the-brandtree-consumer-project-contract.md).

## Browser error overlay

Consider an in-browser view of configuration regeneration errors after the
initial CLI workflow is established. No browser error overlay is supplied for
these errors in this phase.

Current boundary: the watcher logs `Regeneration failed: …` and preserves the
existing server and last successfully generated runtime for config loading or
validation errors. Startup and restart failures follow the limits in
[Consumer contract](adr/0017-define-the-brandtree-consumer-project-contract.md). This does not
require suppressing Astro's own error reporting for ordinary source errors.

## Initialization in existing projects

Consider adding Brandtree to a nonempty project after defining file-conflict,
manifest, and migration behavior. The alpha initializer requires an empty
target and refuses nonempty targets without writing anything; see
[Consumer contract](adr/0017-define-the-brandtree-consumer-project-contract.md).

## Standalone custom pages

Provide a separate author-owned `pages/` extension point for bespoke routes
such as landing pages or downloads pages outside the guidelines content tree.
Before implementing it, decide layout selection, navigation participation,
reserved routes, and collisions with generated routes and social-card output.

Current boundary: authors compose custom Astro and React components inside
Markdown/MDX content pages. Brandtree owns cover, guidelines, and social-card
route composition; no separate custom-page directory is supported initially.
See [Consumer contract](adr/0017-define-the-brandtree-consumer-project-contract.md).

## Additional component frameworks and integrations

Consider Vue, Svelte, and author-supplied renderer integrations after defining
how authors extend generated configuration without editing `.brandtree/`.

Current boundary: Astro and React components are supported, with React
integration supplied by Brandtree. See [Consumer contract](adr/0017-define-the-brandtree-consumer-project-contract.md).

## Author-owned global stylesheet

Provide an optional author-owned global stylesheet entry point for site-wide
customization without editing `.brandtree/`. The proposed convention is a
root-level `styles.css` loaded after Brandtree's styles; finalize the filename,
ordering, and customization contract before implementation.

Current boundary: a dedicated global stylesheet entry point was explicitly
deferred on 2026-10-01. Existing brand configuration and custom component-owned
styles remain available; this does not prohibit ordinary source-level CSS
imports or component styles.

## Global custom component registration

Consider a shared author component registry or automatic component exposure
if repeated MDX imports justify an additional API. Define collision and
built-in override rules before introducing it.

Current boundary: custom components require explicit imports; built-in
Brandtree MDX components remain automatically available. See
[Consumer contract](adr/0017-define-the-brandtree-consumer-project-contract.md).

## Server-rendered sites

Consider server output after defining adapter configuration, deployment, and
runtime behavior for a concrete use case.

Current boundary: `brandtree build` produces a static site at the author
project's `dist/`. Interactive React components remain supported through client
hydration. See [Consumer contract](adr/0017-define-the-brandtree-consumer-project-contract.md).

## Additional font providers

Consider providers beyond local font files and Google Fonts, or custom
font-provider integrations, if a concrete author use case requires them.

Declarative font loading was brought back into the initial scope on 2026-10-01,
limited to local and Google sources. It is no longer a deferred feature. See
[Consumer contract](adr/0017-define-the-brandtree-consumer-project-contract.md).
