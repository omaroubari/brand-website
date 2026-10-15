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
| `brandtree --help`    | Show available commands                                     |
| `brandtree --version` | Show the installed version                                  |

Dev options: `--host [address]`, `--port <number>`, `--open`, `--debug`,
`--strict` to abort startup on error diagnostics, and `--preview` to include drafts.
Stop with Ctrl+C or SIGTERM. Each project allows one active dev session.

## Repository notes

Within this repository, `pnpm dev` and `pnpm build` prepare the framework package before running the web app. `pnpm test` runs framework tests, and `pnpm check` runs workspace type checks once the check command is available. Framework source lives in [`packages/brandtree`](packages/brandtree/).
