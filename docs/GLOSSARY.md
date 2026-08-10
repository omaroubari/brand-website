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
