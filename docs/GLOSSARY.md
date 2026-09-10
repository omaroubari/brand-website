# Glossary

## BrandTypography

The client-authored typography specification stored in `brand.typography`. It
includes font families, available weights, the published type scale, print
values, samples, and usage notes. It is documentation data and does not define
the website's runtime hierarchy.

## BrandFonts

The font-family and font-weight information inside `BrandTypography` that the
website is allowed to use at runtime. The website maps the `text` family to
body/UI content and the `display` family to large editorial headings. The
documented weights remain available for font specimens.

## TemplateDesignSystem

The template-owned runtime system for a consistent website experience. It
defines semantic text roles, spacing, page gutters, and readable measures. It
does not contain client-specific scale values.

## Typography exhibit

A component that documents the client's typography exactly, such as
`TypeScale`, `TypeSpecimen`, `FontWeights`, or `Glyphs`. Exhibits may consume
`BrandTypography` values directly, but their surrounding interface uses the
`TemplateDesignSystem`.

## Runtime text role

A semantic role in the template system—such as `display`, `title`, `heading`,
`body-large`, `body`, `label`, `caption`, or `mono`. A role expresses website
intent and owns its own size, leading, tracking, and weight.

## BrandPalette

The client-authored collection of brand swatches stored in `brand.palette`.
It is the source from which light and dark schemes select colour values; it is
not itself a runtime theme.

## BrandSwatch

One named, hex-valued brand colour in a `BrandPalette`. Its unique lowercase
kebab-case ID is stable and is emitted as `--color-{id}`. A swatch may be
selected by any number of `BrandScheme` roles.

## BrandScheme

The complete set of 31 semantic shadcn colour roles for one appearance mode.
Each role references a `BrandSwatch` ID and is emitted as the corresponding
canonical CSS token, such as `--primary` or `--sidebar-accent-foreground`.

## BrandTheme

The client colour-theme wrapper that contains required light and dark
`BrandScheme`s plus the default initial-mode policy. It does not contain raw
colour values.

## Raw swatch variable

The generated CSS custom property `--color-{swatch-id}` containing a
`BrandSwatch` hex value. Theme tokens reference this variable rather than
duplicating the value.

## Theme token

One canonical shadcn semantic CSS custom property emitted from a
`BrandScheme`, such as `--background`, `--primary`, or `--chart-1`. It
describes UI intent and resolves to a raw swatch variable.

## Canonical brand config

The complete `config.brand` object authored in `src/brand/config.ts`. It is
the source of truth for brand facts and may be authored in any language. Zod
parses it within the site configuration seam; a resolved locale falls back
directly to this config when its override omits a field.

## Brand configuration

The brand-data-only object parsed by `brandSchema` and exposed as
`config.brand`. The named `brand` export is a compatibility-facing alias for
brand exhibit modules; site behavior does not live in this object.

## Site configuration

The validated aggregate returned by `defineConfig()`. It contains
`config.brand`, optional `config.i18n`, and resolved `config.navigation`, and is
the one parsing interface for client-authored structured configuration.

## Parsed configuration

The Zod output types consumed by runtime code. `ResolvedConfig` includes aggregate
defaults such as `navigation.numbering`; `BrandConfig` contains brand data
only. They are distinct from the authored `BrandtreeConfigInput` and
`BrandConfigInput` types.

## I18n configuration

The optional `config.i18n` block that declares ordered locale definitions and the
required default locale when multilingual configuration is present. Locale
codes identify behavior; array order controls only language-switcher display
order. Omitting the block will eventually mean one unprefixed locale, but that
runtime behavior is deferred to the project-tree/routing change.

## Locale definition

An entry in `config.i18n.locales`, consisting of a canonical locale `code`, a
self-name `label` for the language switcher, and an optional `dir` (`ltr` by
default or explicit `rtl`). Locale codes are unique and the `defaultLocale`
must name one of them.

## Navigation configuration

The optional `config.navigation` block. It currently contains only `numbering`, a
presentational switch for ordinal labels that does not control content order,
routes, filenames, or the future project tree. The content filesystem and
section metadata remain authoritative for navigation structure.

## Template UI dictionary

The complete, resolved set of template-owned interface copy described by the
grouped schema in `src/i18n/ui.ts`. It is separate from client-authored brand
data and `config.brand.localeOverrides`. Users do not author template UI
dictionaries.

## English baseline

The complete default Template UI dictionary produced by parsing `{}` through
the Zod UI schema. Every leaf-level schema supplies its English string, so the
runtime baseline and the `UIStrings` type share one source of truth. English
does not have a separate UI pack.

## UI pack

A template-maintained, two-level sparse override containing interface copy for
one built-in locale. Packs contain only known schema groups and keys and may
omit leaves that should fall back. This template currently ships the Arabic
pack; adding a built-in language requires one pack module and one registry
entry.

## UI resolution

The operation performed by `resolveUIStrings`: layer the configured default
locale's built-in pack and then the requested locale's built-in pack over the
English baseline. Each lookup tries exact code, case-insensitive exact code,
then base language. This policy applies only to template UI copy and never to
client-authored brand locale overrides.

## Canonical identity

The stable value that matches an item in a locale collection overlay to its
canonical collection item. Most collections use a required `id`; typography
weights use their numeric `weight`. Identity does not change when display copy
is translated.

## Locale override

The optional structured brand data under
`config.brand.localeOverrides[locale]`. It contains only language-sensitive
differences for that requested locale and is layered directly onto the
`Canonical brand config`. No locale, including English, is a privileged
fallback layer.

## Localizable field

A client-authored value whose wording or script may legitimately differ by
locale, such as a swatch name, usage note, type specimen, or download label.
Only fields exposed by `BrandLocaleOverride` may be changed by a locale.

## Invariant field

A brand fact shared by every locale, such as a colour value, theme mapping,
artwork path, URL, dimension, font foundry, or download format and size.
Invariant fields exist only in the canonical config and cannot be changed by a
locale override.

## Sparse overlay

A partial locale representation that supplies only translated fields and
collection items. Identity-bearing collections remain arrays and match items
by `Canonical identity`, not position. Canonical membership and order are
preserved; omitted items and fields retain their canonical values.

## Locale resolution

The operation performed by `resolveBrand`: clone the canonical config and
merge the requested locale override onto it field by field. Its only layers are
`canonical brand config -> requested locale override`;
`localeOverrides.en` participates only when English is requested.

## Locale content root

The directory `src/content/sections/{locale}` whose descendants define one
locale's prose pages, route hierarchy, and generated navigation. Locale content
roots resolve independently and may contain localized `Folder metadata`.

## ContentTree

The locale-specific recursive hierarchy derived from a `Locale content root`.
Its nodes are `ContentGroup`s and `ContentPage`s. The sidebar, cover contents,
opener context, and pager are projections of this single model.

## ContentGroup

A directory beneath a `Locale content root`. Its normalized directory name
creates a URL segment and its humanized name supplies the fallback label. A
group may own `Folder metadata`, a `Group index`, child pages, and nested
groups.

## ContentPage

A Markdown or MDX file that resolves to one routable guidelines page. Its label
comes from `sidebar.label`, then frontmatter `title`, then the humanized
filename. A numeric filename prefix controls sibling order but is not part of
the URL.

## Group index

The `index.md` or `index.mdx` page inside a `ContentGroup`. It resolves to the
group's own URL and is represented by the linked group label rather than as a
duplicate child navigation item.

## Folder metadata

The optional static `meta.ts` module beside a group's pages. It can override
the group title, select a curated Phosphor icon, set the group's sibling order,
and explicitly order its non-index children. Metadata is locale-specific.

## Reading order

The depth-first page sequence derived from a `ContentTree`. A group index comes
before that group's descendants; groups without an index are not destinations.
Hidden pages do not participate. Previous/next pagination follows this order.

## UI dictionary

The complete template-owned set of interface labels for one supported locale
in `src/i18n/index.ts`. UI dictionaries translate navigation and controls;
they do not contain client-authored brand content.
