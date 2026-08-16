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
