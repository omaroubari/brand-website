# Brandtree Docs

A [Blume](https://useblume.dev/docs/quickstart) documentation app in the pnpm
workspace. Blume owns the Astro runtime; edit the config and content here rather
than the generated `.blume/` directory.

From the repository root:

```sh
pnpm install --prefer-offline --network-concurrency=4 --fetch-timeout=600000 --fetch-retries=5
pnpm docs:dev
```

The app uses port 4323 so it can run alongside the brand site. Node.js 22.19 or
newer is required by Blume.

| Command                         | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| `pnpm docs:dev`                 | Start the docs app with hot reload.           |
| `pnpm docs:build`               | Build the static site into `apps/docs/dist/`. |
| `pnpm docs:preview`             | Preview the production build.                 |
| `pnpm --filter docs check`      | Check types and templates.                    |
| `pnpm --filter docs run doctor` | Diagnose config and content.                  |

Add pages under `docs/` using Markdown or MDX with `title` and `description`
frontmatter. The explicit sidebar in `blume.config.ts` places pages in the author workflow;
add each new page there so it appears in navigation. Keep site-wide settings
in `blume.config.ts`. The root `pnpm check` includes this app automatically.

`--prefer-offline` reuses pnpm's package cache while still downloading missing
packages. Four concurrent requests reduce contention on a slow connection;
the timeout allows ten minutes per request, with up to five retries.

## Author guide coverage

The pages in `docs/` cover consumer setup, validated config, MDX/frontmatter,
navigation, all built-in components, assets/fonts/social cards, localization,
custom components, CLI diagnostics, and deployment. Navigation uses five workflow groups: Getting started,
Brand configuration, Content creation, Site management, and Reference. The
component catalog is nested under Content creation, with subgroups for layout,
logos, colors, typography, voice, and collections. The explicit sidebar in
`blume.config.ts` controls order while preserving existing page URLs.

`components/Sidebar.astro` uses Blume's navigation tree with eager child rows.
Groups retain their configured collapsed state, but opening a group does not
need JavaScript or a fragment request. The Sidebar layout override also supplies
the mobile drawer. Keep this behavior when changing sidebar components.

Each public MDX export from `brandtree/components` has its own page there, with
required props, defaults, and an MDX usage example. Keep the catalog synchronized
with `packages/brandtree/src/components/index.ts` when adding or removing exports.

Verify examples against `packages/brandtree/src/` and the docs' own
`brandtree.config.ts`; ADRs may describe future APIs.

The docs app has two configuration files: `blume.config.ts` controls the docs
website, and `brandtree.config.ts` defines its independent Brandtree example
identity. Brand data, artwork paths, font declarations, and downloads for the
component previews belong in the latter. Never import runtime data or assets
from another app.

The docs app uses Google Fonts through Blume: DM Sans for body and display,
and DM Mono (400 and 500) for code. Blume downloads and self-hosts the fonts at
build time. The first build needs network access to Google Fonts; subsequent
builds can reuse Astro's font cache.

Before shipping documentation changes, run the root `pnpm check`,
`pnpm docs:build`, and `pnpm --filter docs run doctor`. Check code examples and
internal links in the generated output as well: fenced examples are prose, so a
successful type check does not compile the code shown inside them.

## Writing documentation

Use task guides for procedures and the reference pages for complete field and
prop definitions. Brand configuration explains reusable brand data; Content
creation explains page authoring; Site management explains navigation,
localization, validation, SEO, and deployment. Cross-link tasks that span config
sections rather than duplicating instructions. `fonts` is top-level, while
localized brand labels use `brand.localeOverrides` alongside root `i18n`.

Use Blume's built-in MDX components without imports: `CardGroup`/`Card` for
entry points, `Steps`/`Step` for ordered procedures, `Tree` for folder layouts,
`Callout` for important constraints, and `Panel` for supporting explanations.
Keep essential steps visible. Avoid routine closing card groups that repeat
previous/next navigation or links already explained on the page. Reserve closing
cards for useful connections to other topics; one card is enough when there is
only one relevant destination. Introduce retained cards with a task-specific
explanation of why the reader should go there. When a guide configures a whole
brand area, link to that area's component catalog rather than picking one
component without explaining the choice. Use manual `TypeTable` definitions checked against
the schemas and component source; do not assume inferred Zod types can be
extracted automatically. Blume's documentation components and Brandtree's
components inside fenced examples have different APIs (for example, Blume
`Callout` uses `type`; Brandtree `Callout` uses `tone` and receives `ui`).

## Live component previews

All 28 reference pages use `ComponentPreview`, registered in `components.ts`.
Each Astro file under `examples/` renders the actual Brandtree component through
`previews/PreviewShell.astro`. Blume generates the isolated example routes
and synchronizes their theme with the docs. `examples.css` loads Brandtree's
stylesheet into the preview-only Tailwind pipeline.

Each guide imports its displayed MDX from `snippets/*.mdx?raw`. Keep
the snippet's props aligned with its matching Astro example. Snippets omit
`brand`, `ui`, and `dir` unless demonstrating an override: Brandtree supplies
these automatically in content MDX. The Astro harnesses still pass resolved
fixtures explicitly because the MDX transform does not run in Astro templates.
Page props remain available in snippets for selectors and derived values.
Media snippets include authored asset imports relative to a content-root page;
adjust those paths for nested or localized content. Other Usage examples may
demonstrate additional variants.

`PreviewShell` supplies generated brand tokens, the sample font, local overflow,
and optional client-only clipboard/toast behavior for color examples. Keep shared
helpers outside `examples/` so they do not become example routes. The shared
`previews/brand.ts` resolves the docs' own brand and mounts its public artwork/download
paths; `previews/media.ts` supplies docs-owned photography and icons. Public artwork
lives under `public/brand/`; fonts, photographs, icons, licenses, and credits live
under `assets/`. Preview fonts load from bundled local files independently of
the Google Fonts provider used by the surrounding docs website. Register any
new local font file in `PreviewShell`'s static asset map so Vite can bundle it.

`ComponentPreview` uses Blume’s tabs and Astro’s `Code` renderer with Blume’s
configured themes and transformers. It explicitly loads JSX/TSX grammars for
MDX component markup, and displays authored MDX rather than the Astro harness. It validates the origin and sender
of Blume's example-height messages and keeps both tabs the same height. When
upgrading Blume, verify this protocol and the `blume:examples` lookup still match.

Brandtree source changes appear after rebuilding the framework. Root docs
dev/build scripts build the framework first. Use isolated checks/builds while
the docs dev server is running.

## Component page structure

The project-local authoring skill lives at
`../../.agents/skills/component-docs/SKILL.md`. Use readable page titles such as
“Color Palette” while keeping `ColorPalette` in code examples.

Use `color-palette.mdx`, `logo.mdx`, and `grid.mdx` as the reference pattern:
a specific frontmatter description, an immediate default preview, minimal Usage,
task-focused Examples, Behavior only where needed, and an API reference last.
Keep shared MDX conventions in the component overview. Do not repeat the props
table in prose. Each visual variation has a matching `snippets/` MDX file and
`examples/` Astro harness; keep their props and children synchronized. Simple
components need fewer examples, not empty template sections. Audit public enum
values, meaningful booleans, slot layouts, and configuration sources against
labeled examples; mentioning an option in the API table is not example coverage.
