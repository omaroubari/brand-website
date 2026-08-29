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

The complete root `BrandConfig` stored in `src/brand/config.ts`. It is the
source of truth for brand facts and may be authored in any language. A resolved
locale falls back directly to this config when its override omits a field.

## Canonical identity

The stable value that matches an item in a locale collection overlay to its
canonical collection item. Most collections use a required `id`; typography
weights use their numeric `weight`. Identity does not change when display copy
is translated.

## Locale override

The optional structured brand data under `brand.locales[locale]`. It contains
only language-sensitive differences for that requested locale and is layered
directly onto the `Canonical brand config`. No locale, including English, is a
privileged fallback layer.

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
`canonical root -> requested locale`; `locales.en` participates only when
English is requested.

## Locale-prefixed section

A prose section stored at
`src/content/sections/{locale}/NN-slug.mdx`. The directory selects the locale,
the numeric prefix determines order and section number, and the remaining slug
defines the locale-prefixed route.

## UI dictionary

The complete template-owned set of interface labels for one supported locale
in `src/i18n/index.ts`. UI dictionaries translate navigation and controls;
they do not contain client-authored brand content.
