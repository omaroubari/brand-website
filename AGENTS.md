## What this is

A pnpm monorepo for a reusable Astro brand-guidelines framework and its dogfood
site. See README.md for the per-client setup checklist.

The shape that matters: **structured brand data is typed and centralised, prose
is MDX.** Keep it that way.

- `apps/web/src/brand/config.ts` — the only file that holds client-specific
  structured data. Typed against `packages/brandtree/src/brand/schema.ts`.
- `packages/brandtree/src/brand/tokens.ts` — derives CSS custom properties,
  contrast ratios and tint ramps from the config.
- `apps/web/src/content/brand-guidelines/NN-slug.mdx` — one file per section. The `NN-` prefix
  drives order and section number; the URL is the slug alone.
- `apps/web/src/components/mdx.ts` — the composition barrel supplied to every
  MDX file.
- `packages/brandtree` — reusable framework code. It must never import from
  `apps/web`.

### Rules

- **Never hardcode a brand value** in a component or in `global.css`. Colours go
  through `--ink` / `--surface` / `--accent` and friends; type goes through the
  `--type-*` properties. If something is not reachable from the config, add it
  to the config.
- Route and layout composition roots resolve the active `brand`, UI strings and
  navigation settings once. Brand, content, navigation and UI components
  receive the values they use through required props and forward them to
  nested components; they do not import `apps/web/src/brand/config.ts` or resolve
  locale-owned values themselves.
- Light and dark must both work **without JavaScript**. Any theme-dependent rule
  needs both a `:root[data-theme='dark']` selector and a
  `@media (prefers-color-scheme: dark)` fallback scoped to
  `:root:not([data-theme='light'])`.
- Wide components (tables, specimen rows, grids) must scroll inside their own
  container. The page body never scrolls horizontally.
- The measure (`--measure`) belongs to text elements, not to containers.

## Development

When starting the dev server, use background mode:

```
pnpm --filter web exec astro dev --background
```

Manage the background server from the web workspace with `astro dev stop`,
`astro dev status`, and `astro dev logs`.

Run `pnpm check` before considering a change done — it catches config/component
drift that the build alone will not.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Fonts](https://docs.astro.build/en/guides/fonts/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
