# ADR 0002: Model brand colour as a palette and shadcn scheme

- Status: accepted
- Date: 2026-08-10

## Context

The template currently stores an unbounded list of client colours in
`brand.colors`, but reduces those colours to seven legacy roles:
`surface`, `raised`, `ink`, `muted`, `line`, `accent`, and `onAccent`.
`global.css` then adapts those roles to an incomplete shadcn token set and
contains an additional hardcoded dark palette. This leaves the site with two
semantic vocabularies and permits client-independent colour values in template
CSS.

## Decision

Rename `brand.colors` to `brand.palette` and rename `BrandColor` to
`BrandSwatch`. A palette may contain any number of hex-only swatches. Every
swatch has a unique lowercase kebab-case ID, which is emitted as a raw
`--color-{id}` CSS custom property. Rename the lookup helper from `color()` to
`swatch()`.

`BrandScheme` is the complete shadcn colour contract. Each of its roles
explicitly references a swatch ID; roles may intentionally reuse a swatch. The
contract contains these 31 roles:

- `background`, `foreground`
- `card`, `cardForeground`
- `popover`, `popoverForeground`
- `primary`, `primaryForeground`
- `secondary`, `secondaryForeground`
- `muted`, `mutedForeground`
- `accent`, `accentForeground`
- `destructive`, `destructiveForeground`
- `border`, `input`, `ring`
- `chart1` through `chart5`
- `sidebar`, `sidebarForeground`, `sidebarPrimary`,
  `sidebarPrimaryForeground`, `sidebarAccent`, `sidebarAccentForeground`,
  `sidebarBorder`, and `sidebarRing`

`brandStyleSheet()` converts camelCase scheme roles to their canonical shadcn
CSS names (`cardForeground` → `--card-foreground`, `chart1` → `--chart-1`)
and points each one at its raw swatch variable. It emits the light scheme at
the root, the dark scheme for an explicit dark choice, and a system fallback
when appropriate. The static Tailwind `@theme inline` bridge remains, but all
client colour values and the hardcoded dark shadcn block are removed from
`global.css`.

`BrandTheme` continues to hold required `light` and `dark` schemes. Its
`default` setting has three distinct meanings for a visitor without a saved
choice: `light` forces light, `dark` forces dark, and `system` follows the
operating-system preference. A later toggle choice persists and overrides that
default.

Components consume canonical shadcn variables by UI intent, not by a
mechanical legacy-name substitution. In particular, the existing branded
highlight becomes `primary`; shadcn `accent` is reserved for quieter selected
or hover surfaces. Non-colour template tokens, including radius, typography,
and spacing, remain outside the brand theme.

The system validates structural integrity: a scheme reference must resolve to
an existing swatch, and swatch IDs must be valid and unique. It does not
enforce contrast thresholds; brand authors decide whether and how to use the
existing contrast information.

Add Vitest coverage for the token generator's full light, dark, and system
output and its unknown-swatch failure mode.

## Consequences

- A client can add as many palette swatches as its identity needs without
  changing the theme model.
- The configuration, generated CSS, components, and shadcn/Tailwind utilities
  share one semantic vocabulary.
- Every shadcn colour role is explicit and can evolve independently, while
  small palettes remain valid through swatch reuse.
- Existing content and components using legacy roles must be migrated.
- Colour accessibility remains visible to authors but is not a configuration
  gate.

## Terminology

See [`docs/GLOSSARY.md`](../GLOSSARY.md) for `BrandPalette`, `BrandSwatch`,
`BrandScheme`, and `BrandTheme`.
