# Brandtree feature sandbox

This sandbox exercises Brandtree features as they are implemented. It adopts
the Valence brand from `apps/web`, starting with its palette, light/dark themes,
logo files, and two nested logo pages in English and Arabic. It also demonstrates
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
pnpm --filter brandtree-sandbox update brandtree
pnpm --filter brandtree-sandbox build
```

Include both `apps/sandbox/brandtree.tgz` and `pnpm-lock.yaml` when committing a
snapshot update. This checks packed files and exports inside the monorepo.

## Files authors maintain

```text
brandtree.config.ts                 # complete Valence-derived config
package.json                       # only Brandtree; no extra package imports
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
components/AuthorNote.astro         # explicitly imported custom component
assets/fonts/Inter-Variable.woff2    # local fixture for offline framework tests
assets/icons/arrow.svg              # explicitly imported raw SVG
public/
  favicon.svg
  brand/
    logotype-dark.svg
    logotype-light.svg
    brandmark-dark.svg
    brandmark-light.svg
```

Only the brand config holds structured brand data. It copies the web app's
data without importing that app or using repository aliases. Required palette
shades and complete light/dark roles are retained; a complete config is larger
than the minimal author-file layout because the current schema requires them.
The sandbox trims the documented type scale and disables generated social cards.
Its top-level `fonts` array registers Inter through Astro's Google provider with
variable weights `100 900` and normal style; display and text reference
`--font-sandbox`.
Arabic locale overrides keep system-font stacks.
Logo SVGs and favicon are the template's existing placeholder artwork.
The arrow SVG is copied from its Phosphor-based icon set.

## Font defaults and fallbacks

For generated Brandtree sites, omitting the top-level `fonts` field registers
Google Inter (variable weights `100 900`, normal and italic), exposed as
`--font-brandtree-default`. Display and text typography retain authored families,
then fall back to Inter and `system-ui, sans-serif`. A bare `var(--font-name)`
also receives a fallback inside `var()` so an undefined variable stays usable.
Existing explicit variable fallbacks and generic system stacks keep their priority.
Locale overrides follow the same rules; monospace and documented font-family
metadata are unchanged. Inter does not cover every script, including Arabic.

Set `fonts: []` to opt out of managed fonts. An explicit nonempty `fonts` array
replaces the default registration; typography then falls back to system fonts.
Local font paths resolve from the project root: `./assets/fonts/font.woff2`,
`./src/fonts/font.woff2`, and `./public/fonts/font.woff2` are all supported.

Google fonts are downloaded during the build and served as site assets. Download
failure recovery and warnings for undeclared font variables remain follow-up work;
the CSS fallback stack does not make a failed provider download nonfatal.
Social-card fonts still use the separate `seo.og.fonts` configuration.

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

Two illustrative files demonstrate agreed extension rules:

- **AuthorNote.astro:** a custom component explicitly imported from `components/`.
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
the custom component is imported explicitly. It imports no third-party package,
so the manifest needs only Brandtree. Custom source importing React or another
package would declare that dependency directly.

The current app's `dir` parser and visible default-locale prefix are retained:

| Authored file                        | Expected content route |
| ------------------------------------ | ---------------------- |
| `content/en/03-logo/index.mdx`       | `/en/logo`             |
| `content/en/03-logo/01-logotype.mdx` | `/en/logo/logotype`    |
| `content/ar/03-logo/index.mdx`       | `/ar/logo`             |
| `content/ar/03-logo/01-logotype.mdx` | `/ar/logo/logotype`    |
| `content/_partials/ArtworkNote.mdx`  | None                   |

Numeric prefixes drive ordering, not URLs. Metadata orders only the single
included child, rather than retaining references to omitted template pages.
The linked `/brand/logotype-dark.svg` is served from `public/brand/`, not resolved
as a filesystem-absolute path. Other locale modes remain supported by the
contract; this small example demonstrates the existing app's directory mode.

## Commands

Run from the consumer root, since Brandtree uses the current directory and does
not search ancestors. The implemented build command can run through the workspace:

```sh
pnpm --filter brandtree-sandbox build
```

The `dev`, `check`, and `preview` scripts describe planned commands and remain
unimplemented. The root check therefore still excludes the sandbox.
