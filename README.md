# Brand Guidelines — Astro template

A reusable brand guidelines website. Clone it per client, edit one config file
and ten MDX sections, and hand over a living document instead of a PDF that
nobody opens twice.

Structured data (palette, type scale, logo artwork, contact details) lives in
**one typed file**. Prose lives in **MDX**, with brand components you drop in
where you need a specimen, a swatch grid or a misuse panel.

```
/                  cover + contents
/the-brand         purpose, mission, vision, values, audience
/tone-and-voice    archetypes, tone position, writing rules
/logo              logotype, brandmark, construction, clear space, scale, misuse
/colour            palette, proportion, contrast matrix
/typography        specimen, weights, glyphs, type scale
/iconography       the icon set and its grid
/photography       light, dark and duotone treatments
/layout            web, social and print grids
/digital           website, favicon, app icon, social
/print             stationery, posters, promotional, signage
```

---

## New client in eight steps

1. **Clone and rename.** Copy the repo, then set `name` in `package.json` and
   `wrangler.jsonc`.
2. **Fill in [`src/brand/config.ts`](src/brand/config.ts).** Name, palette,
   type scale, logo paths, contact. Everything else reads from here. Colour
   `id`s become `--color-{id}` and are referenced by `theme` — keep them stable
   while you change names and hex values.
3. **Drop in the artwork.** Replace the four placeholder SVGs in
   [`public/brand/`](public/brand/) and `public/favicon.svg`. Convert wordmark
   type to outlines. Keep each file single-colour — `LogoColorways` recolours
   the mark with a CSS mask, which only works on flat artwork.
4. **Set the typefaces.** Edit the `fonts` block in
   [`astro.config.ts`](astro.config.ts). Self-host a licensed file from
   `src/assets/fonts/`, or switch `provider` to `fontProviders.google()` and
   drop `options`. Whatever `cssVariable` you use must match
   `typography.display` / `typography.text` in the brand config.
5. **Rewrite the sections.** Ten files in
   [`src/content/sections/`](src/content/sections/). Delete one and it
   disappears from the nav, the contents list and the prev/next pager — the
   numbering closes up on its own.
6. **Swap the imagery.** Replace `src/assets/photography/` (see its
   `CREDITS.md` — the samples are Unsplash placeholders) and
   `src/assets/icons/`. Every SVG in the icons folder is picked up
   automatically.
7. **Check it.** `pnpm check` for types, `pnpm build` for the real thing.
8. **Ship it.** `pnpm deploy`.

---

## The two files you edit

### `src/brand/config.ts`

Fully typed against [`src/brand/types.ts`](src/brand/types.ts), so your editor
tells you what a field is for and the build fails on a typo rather than
rendering a blank swatch.

```ts
colors: {
  palette: [
    {
      id: 'orange',
      name: 'Orange',
      shades: {
        50: { space: 'hex', value: '#fff3ed' },
        500: { space: 'hex', value: '#ef3800' },
        950: { space: 'hex', value: '#3b1000' },
      },
    },
  ],
  swatches: [
    { id: 'orange-red', name: 'Orange/Red', color: 'orange-500', category: 'secondary' },
  ],
},

theme: {
  default: 'system',
  light: { background: 'white', foreground: 'black', primary: 'orange-500', /* … */ },
  dark:  { background: 'black', foreground: 'white', primary: 'orange-500', /* … */ },
},
```

Roles map onto stable shade references, and components only ever reference the
role — so the underlying source values can be Hex or OKLCH without changing
the UI contract. `black` and `white` are built-in colour tokens, available to
swatches and theme roles without palette entries.

### `src/content/sections/NN-slug.mdx`

The `NN-` prefix sets the order and the printed section number; the URL is the
slug alone (`03-logo.mdx` → `/logo`). Frontmatter is validated by
[`src/content.config.ts`](src/content.config.ts):

```mdx
---
title: Colour
summary: Two colour families, one signal colour, and the ratios that hold them together.
---

import { Block, ColorPalette } from "../../components/mdx";

<Block>
<Fragment slot="copy">

## Colour

### Palette

Two colour families, one signal colour, and the ratios that hold them together.

</Fragment>

<Fragment slot="content">

<ColorPalette />

</Fragment>

<Fragment slot="note">

Black and white carry the work. The accent is the exception, not the rule.

</Fragment>
</Block>
```

`Block` is the document's core layout. Its named slots are:

- `copy` — the block's Markdown/MDX richtext, including its heading,
  subheading, and any supporting paragraphs.
- `content` — rich component content such as an image gallery, type scale
  chart, colour palette, or specimen.
- `note` — optional secondary Markdown/MDX copy.

Use `Block` for split layouts only. It places the `copy` and `note` in a side
column beside the `content`; keep structural headings in the `copy` slot so
they remain native Markdown/MDX headings and can be included in the page
contents outline. The named slots are the API for that layout, not a
general-purpose wrapper.

For regular grouped content, write the headings, copy, and components directly
in the MDX flow. This keeps one subject together without creating multiple
split blocks:

```mdx
import { Logo, Panel } from "../../components/mdx";

## Logotype

### Primary logo

The primary logo is a logotype. Always place the supplied artwork.

<Panel ratio="16 / 9">
  <Logo mark="logotype" width="66%" />
</Panel>

### On black

On dark surfaces the logotype reverses to white.

<Panel bg="black" ratio="16 / 9">
  <Logo mark="logotype" on="dark" width="66%" />
</Panel>
```

The frontmatter `summary` becomes the standfirst on the section divider. Set
`draft: true` to keep a section visible in `dev` but out of the build.

---

## Components

One import line per file, from [`src/components/mdx.ts`](src/components/mdx.ts).

**Layout** — `Block` (split layouts with `copy`, `note`, and `content` slots),
`Statement` (the one oversized paragraph that carries a page), `Grid`, `Panel`,
`Figure`, `SpecList`, `Callout`. For grouped content without a split layout, use
normal MDX flow rather than wrapping it in `Block`.

**Colour** — `ColorPalette`, `ColorScale` (config-defined Tailwind-style
shades), `ColorSwatch`, `ContrastMatrix` (every pairing measured against WCAG,
failures struck through).

**Type** — `TypeSpecimen`, `FontWeights`, `Glyphs`, `TypeScale` (renders each
step at its real size beside its spec).

**Logo** — `Logo`, `LogoColorways`, `LogoScaling`, `LogoClearspace`,
`LogoMisuse`, `ConstructionGrid`.

**Everything else** — `IconGrid`, `PhotoGrid`, `LayoutGrid`, `ValueGrid`,
`PersonaCard`, `ToneSliders`, `Downloads`.

`Figure` renders a labelled placeholder frame when you give it no `src`, so
application pages read correctly before the client's mockups exist.

---

## How it hangs together

|                                         |                                                            |
| --------------------------------------- | ---------------------------------------------------------- |
| `src/brand/config.ts`                   | The client's brand, as data                                |
| `src/brand/types.ts`                    | What that data must look like                              |
| `src/brand/tokens.ts`                   | Config → CSS custom properties, contrast maths, tint ramps |
| `src/lib/sections.ts`                   | Ordering, numbering, prev/next                             |
| `src/styles/global.css`                 | The document's visual language — no brand values hardcoded |
| `src/components/ui/SectionOpener.astro` | The full-bleed accent divider that opens each section      |

Colour resolves twice: a raw `--color-{id}` per palette entry, then canonical
shadcn roles (`--background`, `--foreground`, `--primary`) pointing at them per
scheme. Light and dark both work without JavaScript; the toggle and the
pre-paint script only persist a preference.

---

## Commands

| Command        | Action                                             |
| -------------- | -------------------------------------------------- |
| `pnpm install` | Install dependencies                               |
| `pnpm dev`     | Dev server on `localhost:4321`                     |
| `pnpm check`   | Type-check `.astro`, `.ts` and content collections |
| `pnpm build`   | Build to `./dist/`                                 |
| `pnpm preview` | Preview the build locally                          |
| `pnpm deploy`  | Build and deploy to Cloudflare Workers             |

Images are optimised at build time, so `dist/` is plain static output — deploy
it to Cloudflare, or anywhere else.

---

## Notes

- **`noindex` is on by default** in `src/layouts/BaseLayout.astro`. A client's
  guidelines usually should not be in search results. Remove the meta tag if
  this one should be.
- **Placeholder assets ship with the template**: the logo SVGs and photography
  are stand-ins. The starter icon set is sourced from [Phosphor Icons](https://phosphoricons.com/);
- **`typescript` is pinned to 6.x** because `astro check` needs the programmatic
  API that TypeScript 7 does not yet expose.
