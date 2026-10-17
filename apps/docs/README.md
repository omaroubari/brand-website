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

Each public MDX export from `brandtree/components` has its own page there, with
required props, defaults, and an MDX usage example. Keep the catalog synchronized
with `packages/brandtree/src/components/mdx.ts` when adding or removing exports.

Verify examples against
`packages/brandtree/src/` and `apps/web/`; ADRs may describe future APIs.

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

Logo, ColorPalette, and TypeScale use Blume's native `<Component path="…" />`
with Astro examples under `examples/`. Their Preview/Code tabs show actual
Brandtree component usage. `components/demos/PreviewShell.astro` supplies the
sample brand tokens, local font, overflow container, and optional client-only
clipboard/toast controller. `examples.css` imports Brandtree's stylesheet into
Blume's existing Tailwind pipeline. Keep helpers outside `examples/` so they do
not become preview routes themselves. Blume generates isolated example routes,
synchronizes their theme with the docs, and measures their height automatically.
Native previews follow the page theme without a separate theme selector.

The remaining 25 reference pages use `components/ComponentDemo.astro`, registered
through Blume's `components.ts` MDX map. It embeds an isolated static route from
`pages/previews/[component].astro`, which renders actual `brandtree/components`
with the framework stylesheet and generated brand tokens. These legacy frames
fit their contents, scroll tall examples locally, and offer a per-preview
light/dark selector in addition to following the docs theme.

`components/demos/catalog.ts` lists the legacy routes; `DemoContent.astro` supplies
their examples. Both preview systems share `demo-data.ts`, which resolves the web
example's brand once and rewrites its artwork/download paths to imported build
assets. This reuses the central sample configuration rather than maintaining a
second brand. Photographs, icons, and font files are imported explicitly from
`apps/web`; keep their original credits and licensing information with that app.
Brandtree source changes appear in the previews after rebuilding the docs. Root
docs dev/build scripts build the framework package first.
