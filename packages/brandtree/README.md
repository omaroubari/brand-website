# Brandtree

Fast, beautiful, and agent-friendly brand websites.

Brandtree turns your brand identity into a living guidelines website, built with
Astro. Keep colours, typography, logos, and site settings in one typed
`brandtree.config.ts`; write the story and usage rules in Markdown or MDX.
Brandtree brings them together with ready-made exhibits, navigation, and themes.

Your content and configuration stay in ordinary files, easy for people and coding
agents to read, edit, and version in Git.

Brandtree is in alpha. APIs may change between releases.

## Quickstart

Requires Node.js **22.12 or later**. Once Brandtree is published on npm, create a
project with:

```sh
npx brandtree init my-brand --package-manager npm
cd my-brand
npm install
npm run dev
```

If you're trying a release published under the `alpha` tag, use
`npx brandtree@alpha init my-brand --package-manager npm` for the first command.

The initializer asks for your project directory and brand name, creates starter
files, and prints the next steps. It does not install dependencies or start a
server. Open the local URL printed by the development server.

To skip the prompts:

```sh
npx brandtree init my-brand --yes --title "My Brand" --package-manager npm
```

Then make it yours:

1. Edit `brandtree.config.ts` with your brand name, palette, typography, and logo paths.
2. Replace the placeholder artwork in `public/brand/` and `public/favicon.svg`.
3. Write your guidelines in `content/`.
4. Run `npm run check` and `npm run build` before deploying.

Before the first npm release, use the local development setup below.

## Features

- **One typed brand configuration.** Centralize structured brand data and validate
  it before rendering, with editor autocomplete and checks for invalid references.
- **Markdown and MDX authoring.** Organize pages into nested groups, with navigation,
  page contents, and previous/next links derived from your content.
- **Brand exhibits.** Show palettes, colour scales, contrast ratios, type specimens,
  font weights, logo variations, clear space, icons, photography, and layouts.
- **Light and dark themes.** Theme styles work without JavaScript, including the
  visitor's system colour preference.
- **Multiple languages.** Localized routes, brand overrides, and right-to-left
  layouts, with built-in English and Arabic interface strings.
- **Fonts and social cards.** Load local or Google fonts and generate social images
  and page metadata at build time.
- **Custom components.** Import your own Astro or React components into MDX,
  including interactive React components hydrated in the browser.
- **Static output.** Build a deployable site without a production Node.js server.

## CLI

Run commands from the project root containing `brandtree.config.ts`. The CLI does
not search parent directories for a project.

| Command                | What it does                                                 |
| ---------------------- | ------------------------------------------------------------ |
| `brandtree init [dir]` | Create a starter project; defaults to the current directory. |
| `brandtree dev`        | Generate the runtime and start the development server.       |
| `brandtree check`      | Validate configuration and content, then check types.        |
| `brandtree build`      | Generate the runtime and build the static site to `dist/`.   |
| `brandtree preview`    | Serve an existing production build locally.                  |
| `brandtree --help`     | Show commands and usage.                                     |
| `brandtree --version`  | Print the installed version.                                 |

The starter includes `dev`, `check`, `build`, and `preview` package scripts, so you
can use `npm run dev` instead of invoking the CLI directly.

Useful options:

- `init`: `--yes`, `--title`, and `--package-manager npm|pnpm|yarn|bun`.
- `dev` and `preview`: `--host [address]`, `--port <number>`, and `--open`.
- `dev` and `check`: `--strict` to fail on recoverable content diagnostics,
  and `--preview` to include draft content.
- `check`: `--isolated` to check through `.brandtree-verify/` without replacing a
  running development session's `.brandtree/` directory.

Run `brandtree <command> --help` for command-specific options. Stop the development
or preview server with Ctrl+C. Preview requires a previous build and both its
`.brandtree/` and `dist/` directories.

## How it works

A Brandtree project owns its configuration, content, and assets:

```text
my-brand/
├── brandtree.config.ts   # Structured brand data and site settings
├── content/              # Markdown/MDX pages and folder metadata
├── components/           # Optional custom Astro or React components
├── assets/               # Imported fonts, images, and icons
├── public/               # Files served unchanged
└── package.json          # Dependencies and project scripts
```

The initializer creates a complete configuration using `defineConfig` from
`brandtree`. Update that configuration rather than copying brand values into
individual components. Shared exhibits then use the same palette, typography,
and artwork throughout the site.

Numbered filenames control page order. For example, `content/02-colour.mdx`
becomes `/colour`; the numeric prefix is omitted from the URL. A folder can hold
an `index.mdx` overview and nested pages. Optional `meta.ts` files customize group
navigation. Multilingual projects can organize content into locale directories.

Built-in exhibits are available directly in MDX:

```mdx
---
title: Colour
description: Our palette and accessible colour combinations.
---

## Palette

<ColorPalette />

## Contrast

<ContrastMatrix />
```

Brandtree supplies built-in components with the active brand, interface strings,
and text direction. Custom components use explicit imports and receive the data
they need through props, such as `brand={props.brand}`.

When you run the CLI, Brandtree generates a disposable Astro application in
`.brandtree/`. It handles routes, layouts, component bindings, and integrations,
then builds your production site into `dist/`. Keep authored files outside these
generated directories and exclude both directories from Git; the initializer
adds the ignore rules for you.

## Deployment

Set `brand.meta.url` in `brandtree.config.ts` to your public site URL, then run:

```sh
npm run check
npm run build
npm run preview
```

Upload `dist/` to a static host. For a Git-connected host, use these settings
relative to your consumer project's root:

| Setting          | Value           |
| ---------------- | --------------- |
| Install command  | `npm install`   |
| Build command    | `npm run build` |
| Output directory | `dist`          |
| Node.js version  | 22.12 or later  |

If you commit a `package-lock.json`, use `npm ci` for reproducible installs.
Use the equivalent commands for your chosen package manager.

The production output contains HTML, styles, browser scripts, fonts, images, and
generated social cards. No Astro server adapter is required for static hosting.
Deploy at the domain root, such as `https://brand.example.com/`; hosting beneath
an infrastructure subpath such as `/client-site/` is currently unsupported.

The repository's example site includes a Cloudflare deployment configuration.
See its [deployment guide](https://github.com/omaroubari/brand-website/blob/main/apps/web/README.md#deployment)
for that specific setup.

## Compatibility

- **Runtime:** Node.js 22.12 or later for the CLI and builds. Production hosting
  serves static files.
- **Package managers:** The initializer supports npm, pnpm, Yarn, and Bun command
  suggestions. Node.js remains the CLI runtime requirement.
- **Framework:** Brandtree supplies Astro 7, React 19, Tailwind CSS 4, and its
  integrations as dependencies.
- **Author dependencies:** Declare dependencies imported by your own code in your
  project's `package.json`. Custom React components need `react`, `react-dom`,
  `@types/react`, and `@types/react-dom`; code importing Astro APIs needs `astro`.
- **JavaScript:** Themes work without it. Interactive components require browser
  JavaScript and Astro hydration directives such as `client:load`.
- **Fonts:** Remote font providers need network access or a populated build cache.
  Supply fonts covering the scripts used by your content and social cards.

## Development

To work on Brandtree itself, clone the monorepo. Use Node.js 22.12 or later and
the pinned pnpm version, **11.18.0**:

```sh
git clone https://github.com/omaroubari/brand-website.git
cd brand-website
pnpm install
pnpm dev
```

Framework code lives in `packages/brandtree/`; `apps/web/` is the example site.
The root development and build scripts compile the framework before running the
site through the same CLI used by external projects.

| Command        | What it does                                                    |
| -------------- | --------------------------------------------------------------- |
| `pnpm dev`     | Start the example site.                                         |
| `pnpm check`   | Build the framework and run framework and consumer type checks. |
| `pnpm test`    | Run framework tests.                                            |
| `pnpm build`   | Build the framework and example site.                           |
| `pnpm preview` | Preview the example site's existing build.                      |

Run `pnpm check` before considering a change complete. To verify the package as
an installed dependency, use the
[packed consumer sandbox](https://github.com/omaroubari/brand-website/blob/main/apps/sandbox/README.md).
The [consumer contract](https://github.com/omaroubari/brand-website/blob/main/docs/adr/0017-define-the-brandtree-consumer-project-contract.md)
describes ownership and extension rules in more detail.

## License

[MIT](./LICENSE) © 2026 Omar Oubari.

Fonts, photographs, icons, and other third-party assets retain their own licenses.
