# ADR 0001: Separate brand typography from the template design system

- Status: accepted
- Date: 2026-08-10

## Context

`brand.typography` describes how a client uses type across many applications:
print, digital products, campaigns, environments, and this documentation site.
Its published scale is therefore brand documentation, not a reliable runtime
reading system for a website.

The template previously generated `--type-*` variables from every documented
scale step and used those variables throughout the site. That coupled the
website's readability, spacing, and hierarchy to values that may have been
chosen for another medium.

## Decision

Keep `brand.typography` as the source of truth for client font families,
weights, and documented typography specifications. The site may use the brand's
`text` family for body/UI text and `display` family for large editorial
headings, but it must not use the documented scale to style runtime content.

Introduce a template-owned `TemplateDesignSystem` in
`src/styles/site-tokens.css`:

- semantic `--text-*` roles own site sizes, unitless line heights, `em` tracking,
  and runtime weights;
- `--space-*` tokens follow Tailwind's 4px-based rhythm while retaining the
  template's semantic names;
- page gutter, readable measure, and statement measure are template-owned;
- only brand font identity crosses from config into runtime styling.

Typography exhibits such as `TypeScale`, `TypeSpecimen`, `FontWeights`, and
`Glyphs` may read the documented values directly so the guidelines remain an
accurate record of the client's specifications. Their labels and explanatory
copy use the template system.

## Consequences

- Changing a client's print or campaign scale cannot make the website unreadable.
- The template has one predictable reading system across clients.
- The typography page remains faithful to the brand source material.
- Components must be migrated away from generated `--type-*` variables and
  component-local runtime type values.
- `brandStyleSheet()` emits palette roles and font identity only; it no longer
  emits documented type-scale variables.

## Terminology

See [`docs/GLOSSARY.md`](../GLOSSARY.md) for the distinction between
`BrandTypography`, `BrandFonts`, and `TemplateDesignSystem`.
