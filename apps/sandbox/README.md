# Brandtree feature sandbox

This sandbox exercises Brandtree features as they are implemented. It adopts
the Valence brand from `apps/web`, starting with its palette, light/dark themes,
logo files, and two nested logo pages in English and Arabic. It also demonstrates
the consumer ownership contract in [ADR 0017](../../docs/adr/0017-define-the-brandtree-consumer-project-contract.md).

Add focused demonstrations here as framework features become available. Keep
brand data in the config and prose in MDX, and use the same authoring contract
as an external consumer. Feature coverage should grow beyond this initial
minimal content set.

This milestone documents the intended consumer contract. The package is still
private/source-consumed and the CLI does not exist yet. The manifest's `0.0.1`
matches the current package version; it does not assert that a compatible npm
release exists. The sandbox is not yet installation/build proof. Later
packed-package tests must install the actual tarball in an external directory.
The sandbox is excluded from pnpm workspace execution until the CLI exists;
it does not change the current web app.

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
assets/icons/arrow.svg              # explicitly imported raw SVG
public/
  favicon.svg
  brand/
    logotype-dark.svg
    logotype-light.svg
    brandmark-dark.svg
    brandmark-light.svg
```

Only the brand config holds structured brand data. It copies the current app's
data without importing that app or using repository aliases. Required palette
shades and complete light/dark roles are retained; a complete config is larger
than the minimal author-file layout because the current schema requires them.
The initial sandbox trims the documented type scale, uses system-font stacks, and
disables generated social cards. This avoids copied licensed fonts or dependence
on the later font/social-card implementation. Display family documentation is
retained as a brand fact; it does not claim the system-font fixture loads those
families. Logo SVGs and favicon are the template's existing placeholder artwork.
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

## Intended commands once implemented

Run from the consumer root, since Brandtree uses the current directory and does
not search ancestors. After installing an available compatible package:

```sh
pnpm dev
pnpm check
pnpm build
pnpm preview
```

These scripts document the contract; they cannot run against today's package.
Initialization generates this shape for an empty target without installing
dependencies. Its eventual command arguments and starter details are decided
in the initialization issue, not implemented by this example.
