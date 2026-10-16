# Brandtree

Brandtree is a framework for building living brand-guidelines websites with Astro.
Keep structured brand data in one typed `brandtree.config.ts` and write prose in
Markdown or MDX. Brandtree supplies the components, navigation, themes, and
build tooling, generating a disposable `.brandtree/` runtime and a static `dist/` site.

## Get started

Brandtree is currently a private alpha. Try it locally with the included example
site. Requires Node.js 22.12+ and pnpm 11.18+.

```sh
git clone https://github.com/omaroubari/brand-website.git
cd brand-website
pnpm install
pnpm dev
```

Edit the example's [brand configuration](apps/web/brandtree.config.ts) and
[MDX content](apps/web/content/). See the [web app README](apps/web/README.md)
for customization and deployment, or the [feature sandbox](apps/sandbox/README.md)
for consumer examples.

A consumer project owns these inputs:

```text
brandtree.config.ts   # brand data and site settings
content/              # Markdown/MDX pages and folder metadata
components/           # optional custom Astro or React components
assets/               # imported fonts, images, and icons
public/               # files served unchanged
package.json          # Brandtree, author dependencies, and scripts
```

## Supported features

- Typed, validated brand configuration for colours, typography, logos, and themes.
- Markdown/MDX content with nested groups, ordered navigation, page contents, and pagination.
- Built-in brand exhibits for palettes, contrast, typography, logos, icons, photography, and layouts.
- Localized routes and brand overrides, including right-to-left layouts.
- Light and dark themes that work without JavaScript.
- Local and Google font loading, generated social cards, and page SEO metadata.
- Explicit asset imports and custom Astro and React components, including hydrated React islands.
- Static production output and a development server that watches authored changes.

See the [consumer contract](docs/adr/0017-define-the-brandtree-consumer-project-contract.md)
for detailed authoring and ownership rules.

## CLI commands

Run the CLI from the consumer root containing `brandtree.config.ts`; it does not
search parent directories. Brandtree supplies Astro and its integrations.

| Command               | Action                                                      |
| --------------------- | ----------------------------------------------------------- |
| `brandtree dev`       | Generate the runtime and start the development server       |
| `brandtree build`     | Regenerate the runtime and build the static site to `dist/` |
| `brandtree check`     | Validate inputs and check types without a production build  |
| `brandtree preview`   | Serve the existing production build through the generated app |
| `brandtree --help`    | Show available commands                                     |
| `brandtree --version` | Show the installed version                                  |

Brandtree supplies Astro, React, integrations, styling, and check tooling.
Dependencies imported by custom author code remain the author's responsibility:
React components need `react`, `react-dom`, `@types/react`, and `@types/react-dom`;
author code importing Astro APIs or components needs `astro`. Imports resolve
through normal package exports. The generated tsconfig does not alias author
imports to private framework dependencies.

Dev options: `--host [address]`, `--port <number>`, `--open`, `--debug`,
`--strict` to abort startup on error diagnostics, and `--preview` to include drafts.
Stop with Ctrl+C or SIGTERM. Each project allows one active dev session.
Both dev and preview accept ports from `1–65535` (default `4321`).

## Previewing a build

Run `brandtree build`, then `brandtree preview` from the consumer root. Preview
uses Astro to serve existing root-level `dist/` through the generated
`.brandtree/` app without rebuilding or regenerating it. Unbuilt source or
`public/` edits take effect only after another build. If `.brandtree/` or
production output is missing, preview exits nonzero with exactly:
``No build found. Run `brandtree build` first.``

Preview accepts `--host [address]`, `--port <number>`, and `--open`.
Ctrl+C or SIGTERM closes the server.

## Checking a project

Consumer projects run `brandtree check` from their project root. It recreates
`.brandtree`, scans configuration and content, runs Astro sync, then runs one
Astro type check. If the project has `tsconfig.json`, that file controls code
coverage and compiler options. Otherwise it uses `.brandtree/tsconfig.json`,
which covers the generated runtime and authored Astro/React/TypeScript files.
The two configs are not combined. Content scanning runs independently of the
selected tsconfig's `include`/`exclude` rules.

Type errors fail the command. Valid YAML with invalid frontmatter values produces
`BRANDTREE_FRONTMATTER_INVALID` diagnostics and a dropped-entry count. Without
`--strict`, checking continues with those entries excluded; with `--strict`, it
fails before generating the runtime. Malformed YAML rejects during source loading
and fails regardless of `--strict`. Invalid configuration and unsafe source paths
also always fail. Recoverable warnings remain
nonfatal. `--preview` includes drafts in the content graph. `--isolated` prepares
and syncs `.brandtree-verify/` instead, leaving a dev session's `.brandtree/`
untouched. Checking produces no production build and leaves `dist/` unchanged.
Astro and check tooling are supplied by Brandtree. This checkout currently uses
the filesystem content scanner; CMS sources and include expansion are separate
scanner work.

## Repository notes

Within this repository, `pnpm dev` and `pnpm build` prepare the framework package before running the web app. `pnpm test` runs framework tests, and `pnpm check` runs framework and consumer type checks. Framework source lives in [`packages/brandtree`](packages/brandtree/).

## Author documentation

Run `pnpm docs:dev` to read the complete author guide at `http://localhost:4323`.
It covers setup, configuration, MDX, navigation, components, assets, localization,
customization, CLI commands, and publishing. Source pages live in
[`apps/docs/docs/`](apps/docs/docs/); see the [docs app README](apps/docs/README.md)
for maintenance and build commands.
