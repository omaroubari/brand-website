# ADR 0003: Localize brand guidelines with canonical sparse overlays

- Status: accepted
- Date: 2026-08-29

## Context

The guidelines contain three kinds of language-sensitive content with different
shapes and ownership:

- long-form section prose authored as MDX;
- template-owned interface labels, such as navigation and control text;
- client-authored structured brand data stored in `src/brand/config.ts`.

Structured brand data also mixes translatable copy with invariant facts. A
colour swatch's name and usage may be translated, while its colour value, print
references, layout metadata, and theme role must remain canonical. Repeating
whole objects per locale would permit those facts to drift. Keying collection
overrides as records, however, makes the localized shape differ from the
canonical array shape and obscures item order and identity.

The root config is the canonical source regardless of the language in which it
is authored. English may be canonical for one brand and a locale override for
another, so it cannot be a privileged intermediate fallback.

## Decision

Use three complementary localization mechanisms:

- Store prose in locale-prefixed MDX files under
  `src/content/brand-guidelines/{locale}/NN-slug.mdx`. The locale prefix selects the
  language, the numeric prefix controls order and section number, and the
  remaining slug is the localized route's stable section path.
- Store complete, template-owned UI dictionaries in `src/i18n/index.ts`, keyed
  by supported locale. These dictionaries translate interface copy rather than
  client brand content.
- Store optional structured brand overrides under `brand.locales[locale]` in
  `src/brand/config.ts`. A locale override contains only localizable fields and
  is resolved directly onto the canonical root config.

Resolution has exactly two layers:

```text
canonical root config -> requested locale override
```

There is no implicit `en` layer. `locales.en` is valid when English differs
from a root config authored in another language, and it is consulted only when
English is the requested locale. Missing override fields fall back directly to
the canonical field. Resolution returns a cloned, complete brand config and
does not mutate the canonical source.

### Scalar and object overrides

Nested objects mirror their canonical structure and expose only localizable
fields. Examples include brand names and descriptions, logo alt text and
pronunciation, and the clear-space explanation. Locale-specific typography
family CSS values (`display`, `text`, and `mono`) may change when another script
requires different fonts.

Invariant facts remain available only from the canonical config. These include
colour values, theme mappings, artwork paths and dimensions, URLs, contact
destinations, download paths, file formats and sizes, font-foundry metadata,
and layout controls.

`contact.address` is an ordered block of localized lines rather than a
collection of identifiable entities. A locale therefore replaces the complete
address array when present.

### Collection overrides

Every identity-bearing localized collection mirrors its canonical collection
as a sparse array. An override item contains its canonical identity plus only
the fields that may be localized. Arrays are matched by identity, never by
position. They cannot add, remove, or reorder canonical items; canonical
membership and order always win.

The identity and permitted localized fields are:

| Collection            | Identity | Localizable fields       |
| --------------------- | -------- | ------------------------ |
| `colors.palette`      | `id`     | `name`                   |
| `colors.swatches`     | `id`     | `name`, `usage`          |
| `typography.families` | `id`     | `name`, `note`           |
| `typography.weights`  | `weight` | `name`                   |
| `typography.scale`    | `id`     | `name`, `role`, `sample` |
| `logo.colorways`      | `id`     | `label`                  |
| `contact.socials`     | `id`     | `label`                  |
| `downloads`           | `id`     | `label`, `note`          |

Canonical IDs are required for palette families, swatches, typography
families, type-scale entries, logo colorways, socials, and downloads. Font
weights use their numeric `weight` as identity. Typography family `id` replaces
the former `label` selector and retains the existing `display | text | mono`
contract. Supporting arbitrary additional family identities is a separate
model change.

For example:

```ts
locales: {
  ar: {
    colors: {
      palette: [{ id: "neutral", name: "محايد" }],
      swatches: [{ id: "black", name: "أسود", usage: "..." }],
    },
    typography: {
      families: [
        { id: "display", name: "PP Neue Montreal Arabic", note: "..." },
      ],
      weights: [{ weight: 300, name: "خفيف" }],
      scale: [{ id: "display-plus", role: "...", sample: "تقدّم" }],
    },
    downloads: [{ id: "logo-pack", label: "حزمة الشعار", note: "..." }],
  },
}
```

The resolver merges each matching override item field-by-field onto its
canonical item. Omitted canonical items and omitted fields remain unchanged.
Record-shaped collection overrides are not supported.

### Validation

Validation fails the build when an identity-bearing canonical collection has a
duplicate identity, or when a locale array contains a duplicate or unknown
identity. Errors identify the collection path, the offending identity, and the
locale for locale-specific failures. This prevents ambiguous matching and
translation drift while keeping the source types simple.

## Consequences

- The root config remains the single source of truth for brand facts in any
  authored language.
- Localized structured data visually mirrors the canonical config and can be
  reviewed without translating invariant values.
- Partial translations are safe: absent fields and items retain canonical
  values, order, and membership.
- Locale overrides cannot accidentally alter asset metadata, URLs, colour
  values, or other invariant facts.
- Adding a collection item requires a stable canonical identity before it can
  be localized.
- Locale resolution no longer treats English as a universal fallback layer.
- Existing record-shaped overrides and identity fallbacks must be migrated to
  the array contract and required identities.

## Terminology

See [`docs/GLOSSARY.md`](../GLOSSARY.md) for `Canonical brand config`,
`Canonical identity`, `Locale override`, `Localizable field`, `Invariant
field`, `Sparse overlay`, and `Locale resolution`.
