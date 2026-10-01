# ADR 0017: Define the Brandtree consumer project contract

- Status: accepted
- Date: 2026-10-01
- Tracking: [Define the project contract, issue #4](https://github.com/omaroubari/brand-website/issues/4)

## Context

Brandtree is becoming an installable framework that drives a disposable Astro
app from authored brand configuration and Markdown/MDX. This document
consolidates the individual decisions from the design interview into one consumer
contract, with initial minimal consumer inputs in the
[Valence feature sandbox](../../apps/sandbox/README.md), adapted from the current
web app and intended to grow as framework features are implemented.

This is the agreed alpha contract, not a claim that the CLI already exists.
Package consumption and one-page generation are the next implementation gates.
The current `apps/web` keeps its maintained Astro composition until its later
[migration issue #10](https://github.com/omaroubari/brand-website/issues/10).

## Decision

### Ownership and conventional locations

| Location                                    | Owner     | Purpose                                                                     |
| ------------------------------------------- | --------- | --------------------------------------------------------------------------- |
| `brandtree.config.ts`                       | Author    | Typed brand data and site settings; default export from `defineConfig`      |
| `content/`                                  | Author    | Markdown/MDX pages, nested groups, folder metadata, and importable partials |
| `components/`                               | Author    | Custom Astro and React components, explicitly imported by content           |
| `assets/`                                   | Author    | Explicitly imported assets and configured local font files                  |
| `public/`                                   | Author    | Files served unchanged at public URLs                                       |
| `package.json` and package-manager lockfile | Author    | Brandtree dependency, author-code dependencies, and command scripts         |
| `.gitignore`                                | Author    | Excludes generated/runtime output and installed dependencies                |
| `.brandtree/`                               | Brandtree | Ignored, generated, disposable Astro composition and runtime artifacts      |
| `dist/`                                     | Brandtree | Static production output, independently previewable                         |

Authors never edit `.brandtree/`. No authored content, configuration, component,
or asset has its only copy there. Deleting it loses no authored work; `dev`,
`build`, and `check` prepare it automatically. Framework upgrades can replace
generated composition. Generated Astro configuration, content collection
configuration, route modules, component binding, and styles belong to Brandtree.
Framework code must not import the dogfood app or use repository-only aliases.
Preparation uses current authored inputs and the installed framework version;
caching must not change that behavior or require a separate generation command.

### Root selection and path resolution

For `dev`, `build`, and `check`, use `process.cwd()` as the author project root.
Read `brandtree.config.ts` there only. Do not search ancestors or siblings, infer
a root from a manifest, or silently select another project if configuration is
missing. Conventional input locations above are the supported starting layout;
no alternate-location API is established by this contract.

| Reference                                         | Resolution                                   |
| ------------------------------------------------- | -------------------------------------------- |
| Configured file `assets/fonts/BrandSans.woff2`    | Relative to the author project root          |
| MDX import `../../../components/AuthorNote.astro` | Relative to the original MDX file            |
| Public URL `/brand/logotype-dark.svg`             | Author file `public/brand/logotype-dark.svg` |

A public URL is not an absolute filesystem path. Generated configuration must
translate paths as needed without changing their authored meaning. Preview
serves the selected project's existing `dist/`; initialization's target
argument details are still to be defined.
No custom path-prefix syntax is introduced. If alternate config locations are
supported later, moving the config does not implicitly move the path base.

### Content acquisition and identity

The generated collection uses Astro's `glob()` with its base pointing at the
original author `content/` directory outside `.brandtree/`. Astro compiles the
original MDX file; Brandtree does not rewrite its imports or copy its component
dependencies into the generated app.

Discover Markdown and MDX recursively inside the content root. Exclude files
and every descendant of directories whose names start with `_` from page
discovery. Excluded partials remain importable. Preserve source IDs including
extensions so collisions can be diagnosed before normalized route ownership
is chosen.

Retain the existing content model rather than defining a second routing system:

- Numeric prefixes determine sibling order and are removed from public slugs.
- Nested folders create groups; `index.md`/`index.mdx` is the group landing page.
- Static `defineMeta` folder metadata controls localized labels and ordering.
- Both directory and dot locale parsers, shared `.$.` content, translation
  identity, default-locale prefix policy, and configured fallback behavior remain
  as described in ADR 0009. The example preserves the current app's explicit
  `en/` and `ar/` directories and visible default-locale prefix.
- Draft pages are visible in development and excluded from production.
- ADR 0012's deterministic collision recovery and recoverable diagnostics remain
  authoritative; optional topology mistakes do not become new fatal errors.

Normalize acquisition into the existing source-neutral content model. Routes,
navigation, pagination, and locale lookup share the resolved graph. Do not derive
independent page orders or collision winners in separate renderers.

### Components, props, assets, and dependencies

Route/layout composition roots resolve active brand, UI strings, and navigation
settings once and forward the values through required props. Rendered MDX
receives those values in `props`; a brand-aware exhibit uses, for example:

```mdx
<ColorPalette brand={props.brand} ui={props.ui} />
```

Built-in MDX components are supplied centrally. Custom components use explicit
MDX imports; there is no global custom registration or built-in override API.
Astro and React components are supported, with the React integration supplied
by Brandtree in generated configuration. IconGrid requires an explicit `icons`
array of records containing `name` and raw `svg` data; no default icon set is
supplied. Images are explicit imports passed to components such as
PhotoGrid. No general icon or asset-directory scanning occurs.
Generated composition binds the author public directory for development and
production; authors do not maintain another public directory inside `.brandtree/`.

Brandtree owns its framework dependencies, including Astro, MDX, React, React
DOM, integrations, and CLI/check tooling. A standard consumer declares only
Brandtree. Authors declare packages imported by their own source; they do not
declare Astro merely to run a CLI command. Framework and custom React components
must use compatible shared React runtime resolution, verified under pnpm and
through packed-package consumers without incidental hoisting.

Brand configuration remains the only structured brand-data source and prose
remains MDX. Components use configured/generated colour and typography tokens;
light/dark rendering works without JavaScript. Wide exhibits scroll internally
and readable measures belong to text elements, preserving repository rules.

### Fonts and social cards

Top-level optional `fonts` declares local or Google font loading, separate from
`brand.typography`. Brand typography retains CSS-variable references, system
stacks, locale overrides, and its documented scale. Loading translates into
Astro configuration without author-imported provider factories. Local file
paths are project-root-relative; other providers are out of scope.
Each loaded font declares its `cssVariable`. There is no font-ID selection API
or bundled default brand typeface when declarations are omitted.

Website and generated social cards reuse loading declarations without repeated
sources under `seo.og.fonts`. Undeclared font variables, missing local files, and
failed Google downloads warn and fall back rather than blocking the site.
Browser text uses system stacks; cards use packaged Inter, with its lack of
Arabic coverage explicitly accepted. Malformed declarations and invalid config
syntax remain errors. Exact declaration fields and format handling are resolved
in the font implementation issues, not invented by this contract example.
Affected typography references and declared-but-unavailable font variables
must resolve to usable system-font stacks; a warning alone is insufficient.
Warnings identify the affected reference/declaration and reason for fallback.

### Commands and error behavior

| Command             | Contract                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `brandtree dev`     | Prepare the generated app, start development, and apply source/config changes without manual CLI restart                                      |
| `brandtree build`   | Prepare the generated app and build static production output to root-level `dist/`                                                            |
| `brandtree check`   | Prepare the generated app, validate inputs, and run Astro type checks without producing a production build                                    |
| `brandtree preview` | Serve existing `dist/` without rebuilding or requiring `.brandtree/`; report a missing build                                                  |
| `brandtree init`    | Generate a complete starter in an empty target; reject nonempty targets without writes; skip dependency installation and print setup commands |

Development watches original MDX, custom components, asset/public changes, page
additions/deletions/renames, and configuration. Configuration loading and
validation happen before runtime regeneration. If they throw during watching,
log `Regeneration failed: …`, retain the last successful runtime and existing
server, and retry after a corrected save. No custom browser regeneration overlay
is provided. Invalid startup config fails before server/watcher start and
requires rerunning `dev`. A failed server restart leaves the CLI alive but may
leave the server down until a subsequent edit succeeds. Shutdown closes server
and watcher resources.
The last-successful-runtime guarantee applies to watched config loading and
validation errors, not every content, component, or regeneration failure.
Automatic updates do not promise browser-state preservation across restarts.
Initialization generates its starter without network access or automatic
installation; dependency installation is a separate author action.

### Extension and release boundaries

Alpha supports local MDX, typed configuration, built-in components, explicit
Astro/React component imports, assets, and static output. It does not provide
standalone custom pages, a global stylesheet entry point, custom renderer/font
providers, global custom component registration, server output, or ejection.
Search, hosted editing, remote sources, and a general plugin system also remain
outside alpha. See [Future work](../FUTURE-WORK.md).

Implementation order and completion are managed by
[GitHub's Framework alpha milestone](https://github.com/omaroubari/brand-website/milestone/9),
not a duplicate local roadmap. Packed-package consumption is verified outside
the monorepo before expanding the generator or migrating the current app.

## Consumer feature sandbox

The [sandbox](../../apps/sandbox/README.md) initially preserves Valence palette/theme,
logo artwork, localized copy, required-prop component use, and folder metadata
from `apps/web`, with a smaller documented type scale and no external font
loading. It intentionally contains no authored Astro config, collection config,
route modules, or generated app. Its manifest documents the intended dependency
and commands; it is not yet a runnable or published CLI demonstration.
Extend it with focused feature demonstrations as implementation progresses,
while preserving the consumer authoring contract. External packed-package
checks remain necessary to prove consumption without workspace resolution.

## Consequences

- There is one reviewable contract for authoring, generation, and alpha scope.
- The interview's separate consumer-contract drafts are replaced by this record.
  Earlier content, locale, typography, and validation ADRs remain authoritative
  where this contract reuses their existing behavior.
- The sandbox can exercise implemented features and supply inputs for external
  packed-package fixtures without extracting dogfood brand data at runtime.
- This milestone proves ownership and conventions. Later issues must prove
  installation, original-source imports, static output, and live regeneration.

## References

- [Astro content collections](https://docs.astro.build/en/guides/content-collections/#the-glob-loader)
- [Astro routing](https://docs.astro.build/en/guides/routing/)
