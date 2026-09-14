# Brandtree

A reusable brand guidelines website. Clone it per client, edit one config file
and ten MDX sections, and hand over a living document instead of a PDF that
nobody opens twice.

Structured data (palette, type scale, logo artwork, contact details, locale
settings and navigation presentation) lives in **one Zod-validated file**.
Prose lives in **MDX**, with brand components you drop in where you need a
specimen, a swatch grid or a misuse panel.

## Workspace

Brandtree is a pnpm monorepo with one reusable framework package and one
dogfood site:

- `packages/brandtree` owns the typed brand/content model, components, layouts,
  styles, and rendering helpers. It is private and source-consumed for now.
- `apps/web` owns the current brand config, content, assets, public files, and
  the Astro composition layer that makes the example site runnable.

The current Astro-native app is an intentional transition state. A later CLI
phase may replace its composition layer with a disposable generated app:

```text
apps/web content + config + custom pages
                    │
                    ▼
             brandtree package/CLI
                    │
                    ▼
       generated hidden .brandtree Astro app
                    │
              ┌─────┴─────┐
              ▼           ▼
         dev server   production build
```

That generator and `.brandtree` directory are not implemented yet.

```
/                  cover + contents
/the-brand         purpose, mission, vision, values, audience
/tone-and-voice    archetypes, tone position, writing rules
/logo              logo system overview
/logo/logotype     logotype artwork and applications
/logo/brandmark    brandmark and construction grid
/logo/usage-rules  clear space, colourways, scale and misuse
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

1. **Clone and rename.** Copy the repo, then set the Cloudflare Worker `name` in
   `apps/web/wrangler.jsonc`; workspace package names remain stable.
2. **Fill in [`apps/web/src/brand/config.ts`](apps/web/src/brand/config.ts).** Put name, palette,
   type scale, logo paths, and contact under `config.brand`; configure site
   behavior with `config.i18n` and `config.navigation`. Everything else reads
   from this parsed configuration. Colour `id`s become
   `--color-{id}` and are referenced by `theme` — keep them stable while you
   change names and hex values. Unknown keys and invalid cross-references fail
   validation at the configuration boundary.
3. **Drop in the artwork.** Replace the four placeholder SVGs in
   [`apps/web/public/brand/`](apps/web/public/brand/) and `apps/web/public/favicon.svg`. Convert wordmark
   type to outlines. Keep each file single-colour — `LogoColorways` recolours
   the mark with a CSS mask, which only works on flat artwork.
4. **Set the typefaces.** Edit the `fonts` block in
   [`apps/web/astro.config.ts`](apps/web/astro.config.ts). Self-host a licensed file from
   `apps/web/src/assets/fonts/`, or switch `provider` to `fontProviders.google()` and
   drop `options`. Whatever `cssVariable` you use must match
   `typography.display` / `typography.text` in the brand config. Keep the
   matching build-time files and family names in `config.seo.og.fonts` so
   generated social cards use the same typefaces, including non-Latin scripts.
5. **Rewrite the sections.** Content in
   [`apps/web/src/content/brand-guidelines/`](apps/web/src/content/brand-guidelines/) is organized by locale. A
   numbered file is a top-level page; a numbered folder is a navigation group
   whose `index.mdx` is its overview and whose child files become nested pages.
   Delete a page or group and it disappears from the nav, contents list and
   prev/next pager — sibling ordering follows numeric prefixes automatically.
6. **Swap the imagery.** Replace `apps/web/src/assets/photography/` (see its
   `CREDITS.md` — the samples are Unsplash placeholders) and
   `apps/web/src/assets/icons/`. Every SVG in the icons folder is picked up
   automatically.
7. **Check it.** `pnpm check` for types, `pnpm build` for the real thing.
8. **Ship it.** `pnpm deploy`.

---

## The two files you edit

### `apps/web/src/brand/config.ts`

Parsed with the strict Zod schemas in [`packages/brandtree/src/brand/schema.ts`](packages/brandtree/src/brand/schema.ts).
The inferred types in [`packages/brandtree/src/brand/schema.ts`](packages/brandtree/src/brand/schema.ts) keep editor
autocomplete aligned with the runtime model, and the build fails on unknown
keys, duplicate identities, or unresolved references rather than rendering a
blank swatch.

```ts
export const config = defineConfig({
  brand: {
    colors: {
      palette: [
        {
          id: "orange",
          name: "Orange",
          shades: {
            50: { space: "hex", value: "#fff3ed" },
            500: { space: "hex", value: "#ef3800" },
            950: { space: "hex", value: "#3b1000" },
          },
        },
      ],
      swatches: [
        {
          id: "orange-red",
          name: "Orange/Red",
          color: "orange-500",
          category: "secondary",
        },
      ],
    },
    theme: {
      default: "system",
      light: {
        background: "white",
        foreground: "black",
        primary: "orange-500" /* … */,
      },
      dark: {
        background: "black",
        foreground: "white",
        primary: "orange-500" /* … */,
      },
    },
    localeOverrides: {
      ar: { meta: { documentTitle: "دليل الهوية" } },
    },
  },
  i18n: {
    defaultLocale: "en",
    locales: [
      { code: "en", label: "English" },
      { code: "ar", label: "العربية", dir: "rtl" },
    ],
  },
  navigation: {
    numbering: true,
  },
});

export const brand = config.brand;
```

`config.i18n.locales` order controls only the language switcher's display
order; locale lookup is by `code`. `defaultLocale` must match one configured code.
The `dir` value defaults to `ltr`; set `rtl` explicitly for right-to-left
locales. Omitting `i18n` is reserved for the future single-locale mode with no
locale segment in routes. Template UI dictionaries are supplied by the
template, not by client config. The English baseline is derived from the UI
schema; the bundled Arabic UI pack is a sparse override. UI resolution layers
English, the configured default locale's built-in pack, and the requested
locale's built-in pack. Pack lookup tries exact code, case-insensitive exact
code, then base language. The client-authored
`config.brand.localeOverrides` block remains the separate, exact-code
brand-content override layer described in ADR 0003 and ADR 0005.

`config.navigation.numbering` is presentational only: it adds ordinal labels
without changing section order, route identity, filenames, or the future
project tree. Navigation structure and ordering continue to come from the
content tree and section metadata.

Roles map onto stable shade references, and components only ever reference the
role — so the underlying source values can be Hex or OKLCH without changing
the UI contract. `black` and `white` are built-in colour tokens, available to
swatches and theme roles without palette entries.

Open Graph cards are generated at build time for every cover and content route
using each page's title and resolved description (`seo.description` wins over
`description`). Their eyebrow defaults to the localized site title, their
subtitle falls back to the brand description, their footer uses the site host,
and their palette comes from the configured light brand theme. Configure the
outlined SVG and fonts under `config.seo.og`; `eyebrow`, `description`, `logo`,
and `site` accept an override string or `false` to hide that layer. Set
`enabled: false` to disable generated cards. A frontmatter `seo.image` still
supplies that page's card—using either a file in `apps/web/public/` or an external
URL—even when generation is disabled. Generated cards are 1200×630 PNGs at
`/og/<route>.png`, and their complete Open Graph and X metadata is emitted
automatically.

### `apps/web/src/content/brand-guidelines/{locale}/NN-slug.mdx`

The `NN-` prefix sets the order and the printed section number; the URL is the
slug without the prefix (`03-logo.mdx` → `/logo`). Frontmatter is validated by
[`apps/web/src/content.config.ts`](apps/web/src/content.config.ts):

```mdx
---
title: Colour
description: Two colour families, one signal colour, and the ratios that hold them together.
---

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

The frontmatter `description` becomes the standfirst on the section divider.
Set `draft: true` to keep a page visible in `dev` but out of the build.

### Nested groups

Use a folder when one topic needs an overview and several related pages. The
folder name and numeric prefix determine its URL and sibling order; `index.mdx`
is the group landing page and `meta.ts` is optional localized navigation
metadata:

```
apps/web/src/content/brand-guidelines/en/03-logo/
├── meta.ts
├── index.mdx
├── 01-logotype.mdx
├── 02-brandmark.mdx
└── 03-usage-rules.mdx
```

`meta.ts` must use a static `defineMeta` call. Its `pages` array orders direct
children by their normalized slugs, while the curated `icon` names are listed
by the content metadata API:

```ts
import { defineMeta } from "../../../../lib/content-meta";

export default defineMeta({
  title: "Logo",
  icon: "shapes",
  order: 3,
  pages: ["logotype", "brandmark", "usage-rules"],
});
```

Metadata is locale-specific, so an Arabic group can translate its title and
choose its own child ordering. Nested MDX files use the same centrally provided
components as top-level pages; their directory depth does not affect component
availability.

---

## Components

Brand guideline MDX files can use the components below directly—do not import
them in each file. [`apps/web/src/pages/[...slug].astro`](apps/web/src/pages/[...slug].astro)
imports the shared [`apps/web/src/components/mdx.ts`](apps/web/src/components/mdx.ts) barrel once
and passes it to every rendered content entry through the MDX `components`
prop. To expose another component to all guideline pages, export it from that
barrel.

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

| Path                                       | Ownership                                               |
| ------------------------------------------ | ------------------------------------------------------- |
| `apps/web/src/brand/config.ts`             | The client's authored configuration                     |
| `apps/web/src/content/brand-guidelines/`   | Client prose and content hierarchy                      |
| `apps/web/src/core/loader.ts`              | Temporary app-specific Astro acquisition boundary       |
| `apps/web/src/components/mdx.ts`           | App composition barrel and asset-bound adapters         |
| `packages/brandtree/src/brand/schema.ts`   | Strict Zod schemas and configuration invariants         |
| `packages/brandtree/src/brand/tokens.ts`   | Config → CSS custom properties and contrast maths       |
| `packages/brandtree/src/core/`             | Source-neutral content, routing, and navigation model   |
| `packages/brandtree/src/components/`       | Reusable MDX, navigation, brand, and UI components      |
| `packages/brandtree/src/styles/global.css` | Template visual language with no hardcoded brand values |

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
| `pnpm test`    | Run the Brandtree package test suite               |
| `pnpm check`   | Type-check `.astro`, `.ts` and content collections |
| `pnpm build`   | Build the web app to `apps/web/dist/`              |
| `pnpm preview` | Preview the build locally                          |
| `pnpm deploy`  | Build and deploy to Cloudflare Workers             |

Images are optimised at build time, so `apps/web/dist/` is plain static output — deploy
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
