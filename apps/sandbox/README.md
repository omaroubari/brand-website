# Brandtree feature sandbox

This sandbox exercises Brandtree features as they are implemented. It defines
the Fieldwork sample brand, with palette, typography, light/dark themes,
logo files, and localized exhibits in English and Arabic. It also demonstrates
the consumer ownership contract in [ADR 0017](../../docs/adr/0017-define-the-brandtree-consumer-project-contract.md).

Add focused demonstrations here as framework features become available. Keep
brand data in the config and prose in MDX, and use the same authoring contract
as an external consumer. Feature coverage should grow beyond this initial
minimal content set.

The sandbox installs `brandtree.tgz`, a packed snapshot of the framework, rather
than linking the workspace package.

From the repository root, refresh the snapshot and build:

```sh
pnpm sandbox:pack
pnpm --filter brandtree-sandbox update brandtree --offline
pnpm --filter brandtree-sandbox build
```

Include both `apps/sandbox/brandtree.tgz` and `pnpm-lock.yaml` when committing a
snapshot update. This checks packed files and exports inside the monorepo.

## Files authors maintain

```text
brandtree.config.ts                 # complete Fieldwork config
package.json                       # Brandtree and author-declared React dependencies
.gitignore
content/
  _partials/ArtworkNote.mdx         # importable, never a routed page
  en/03-logo/
    meta.ts                        # static, package-imported defineMeta
    index.mdx                      # relative component/partial/SVG imports
    01-logotype.mdx                 # brand-aware built-in exhibits
  ar/03-logo/
    meta.ts
    index.mdx
    01-logotype.mdx
components/AuthorNote.astro         # explicitly imported custom Astro component
components/TypeTester.tsx           # explicitly imported, hydrated React component
content/{en,ar}/04-exhibits.mdx      # palette, type, interactive type, photography
assets/photography/field.jpg        # explicitly imported image
assets/fonts/Inter-Variable.woff2    # local Inter for canonical typography
assets/icons/arrow.svg              # explicitly imported raw SVG
public/
  favicon.svg
  brand/
    logotype-dark.svg
    logotype-light.svg
    brandmark-dark.svg
    brandmark-light.svg
```

Only the brand config holds structured brand data. It adapts the web app's
schema without importing that app or using repository aliases. Required palette
shades and complete light/dark roles are retained; a complete config is larger
than the minimal author-file layout because the current schema requires them.
The sandbox trims the documented type scale and disables generated social cards.
Its top-level `fonts` array registers Inter through Astro's local provider from
`./assets/fonts/Inter-Variable.woff2`, with variable weights `100 900` and normal
style; display and text reference
`--font-sandbox`.
Google Rubik is registered under `--font-sandbox-arabic`, with variable weights
`300 900`, normal style, and Arabic/Latin subsets. Arabic locale overrides use
that variable for display and text. Documented brand families and type scales
remain separate from these runtime font-loading declarations.

For now, canonical `brand.typography.display`, `text`, and `mono` are required
strings. Missing or `undefined` values fail config validation; font fallbacks
cannot supply missing config fields. Locale overrides may omit these fields to
inherit the canonical values. Font fallbacks handle unavailable font families or
undefined CSS variables within valid typography strings.

To verify provider loading, build the packed sandbox and inspect
`dist/_astro/fonts/` plus the English and Arabic HTML: English typography must
reference local Inter, and Arabic typography must reference Google Rubik. Both
fonts must emit font-face CSS and preload links. Rebuild after removing the
disposable `.brandtree/` directory to verify project-root resolution survives
regeneration. Astro owns remote downloads and caching; a timeout warning with
only fallback typography does not verify successful Google loading.
Logo SVGs and favicon are author-owned Fieldwork sample artwork.
The arrow SVG is copied from its Phosphor-based icon set.

## What Brandtree manages

```text
.brandtree/                        # generated Astro config, collection,
                                   # routes, component binding, runtime glue
dist/                              # generated static production output
```

Both are ignored and neither is supplied as authored source. Delete
`.brandtree/` and all the authored files above still exist. The next `dev`,
`build`, or `check` invocation recreates it. Preview serves existing `dist/`
even after `.brandtree/` is deleted.

## Source imports and routes

These author files demonstrate agreed extension rules:

- **AuthorNote.astro:** a custom component explicitly imported from `components/`.
- **TypeTester.tsx:** a React type tester hydrated with `client:load`; its label
  and initial text come from the resolved page UI and brand props.
- **04-exhibits.mdx:** built-in palette and typography exhibits receive required
  `brand={props.brand}` and `ui={props.ui}` props. PhotoGrid receives an image
  explicitly imported from the original author asset path.
- **ArtworkNote.mdx:** a reusable partial under `_partials/`, importable but
  excluded from page routes.

These files are illustrative sandbox content, not additional framework features.

The generated collection reads `content/` directly. In the English group
overview, `../../../components/AuthorNote.astro` and
`../../../assets/icons/arrow.svg?raw` resolve from that original MDX file. The
partial import resolves into `content/_partials/`; exclusion from page discovery
does not prevent an import. IconGrid receives explicit data, with no adapter
scanning an icon folder.

The nested logotype page preserves the current required-prop flow:

```mdx
<Panel brand={props.brand} ratio="16 / 9">
  <Logo brand={props.brand} mark="logotype" width="66%" />
</Panel>
```

Brandtree supplies built-in component names and resolved page props centrally;
custom components are imported explicitly. The author declares `react` and
`react-dom` directly; Brandtree supplies the React integration.

The current app's `dir` parser and visible default-locale prefix are retained:

| Authored file                        | Expected content route |
| ------------------------------------ | ---------------------- |
| `content/en/03-logo/index.mdx`       | `/en/logo`             |
| `content/en/03-logo/01-logotype.mdx` | `/en/logo/logotype`    |
| `content/ar/03-logo/index.mdx`       | `/ar/logo`             |
| `content/ar/03-logo/01-logotype.mdx` | `/ar/logo/logotype`    |
| `content/en/04-exhibits.mdx`         | `/en/exhibits`         |
| `content/ar/04-exhibits.mdx`         | `/ar/exhibits`         |
| `content/_partials/ArtworkNote.mdx`  | None                   |

Numeric prefixes drive ordering, not URLs. Metadata orders only the single
included child, rather than retaining references to omitted template pages.
The linked `/brand/logotype-dark.svg` is served from `public/brand/`, not resolved
as a filesystem-absolute path. Other locale modes remain supported by the
contract; this small example demonstrates the existing app's directory mode.

## Commands

Run from the consumer root, since Brandtree uses the current directory and does
not search ancestors. The implemented dev and build commands can run through the workspace:

```sh
pnpm --filter brandtree-sandbox dev
pnpm --filter brandtree-sandbox build
```

The dev command watches authored inputs, validates saves, regenerates the
runtime, and restarts Astro. Invalid watched config keeps the last successful
runtime/server; correcting the config retries automatically. Invalid startup
config requires rerunning dev. A failed restart can leave the server down until
the next successful save. Regeneration errors appear in the terminal, without a
custom browser overlay. SIGINT/SIGTERM close the watcher and server.

`pnpm --filter brandtree-sandbox check` prepares and type-checks the site without
a production build. `pnpm --filter brandtree-sandbox preview` serves existing
`dist/`, even after deleting `.brandtree/`. Dev and preview accept `--host` and
`--port`. The root check includes the packed sandbox.

For a browser hydration check after building, edit the type tester input on
`/en/exhibits` or `/ar/exhibits` and verify that the specimen updates.
