# ADR 0004: Centralize and validate site configuration with Zod

- Status: accepted
- Date: 2026-09-08

## Context

`src/brand/config.ts` is the one client-authored source for structured brand
facts, but its handwritten interfaces and several separate locale/navigation
constants can drift apart. The application needs one validated configuration
boundary before a future project tree is generated from the configuration.

The root shape remains flat for this change. It is still a brand configuration,
not yet a broader site aggregate, and the content filesystem remains the source
of truth for section structure and ordering.

## Decision

Make Zod the authoritative runtime and type model. Add the schemas in
`src/brand/schema.ts` and have `defineBrand()` parse the authored object at the
configuration boundary. `schema.ts` exports inferred types:

- `BrandConfigInput = z.input<typeof brandConfigSchema>` describes authored
  data;
- `BrandConfig = z.output<typeof brandConfigSchema>` describes parsed data;
- sub-schemas and their input/output types are exported for consumers that need
  the i18n or navigation shapes.

Schemas use strict objects: unknown keys are configuration errors. Scalar
validation remains structural (`z.string()`, `z.number()`, and `z.boolean()`),
with closed domain vocabularies represented by enums. Validation also enforces
cross-field integrity at the boundary: identity-bearing collections are
unambiguous, colour references resolve, and locale override identities and
locale relationships are valid. Contrast remains advisory rather than a build
gate.

The flat root gains two configuration namespaces:

```ts
export const brand = defineBrand({
  // existing canonical brand data
  meta: {},
  colors: {},
  theme: {},
  typography: {},
  logo: {},
  contact: {},
  downloads: [],
  locales: {},

  i18n: {
    defaultLocale: "en",
    locales: [
      { code: "en", label: "English", dir: "ltr" },
      { code: "ar", label: "العربية", dir: "rtl" },
    ],
  },

  navigation: {
    numbering: true,
  },
});
```

`i18n` is optional. Its eventual contract is single-locale mode when omitted
(one locale and no locale segment in routes), but the runtime implementation of
that mode belongs to the later project-tree/routing work. When present,
`defaultLocale` is required and must match one configured locale code. Locale
codes are canonical BCP 47 tags; codes are unique. `label` is the locale's
self-name shown in the language switcher, and `dir` defaults to `ltr` while
`rtl` is explicit. Array order affects only language-switcher presentation;
lookup, routing semantics, fallback configuration, and translation matching use
the locale `code`.

`locales` keeps its existing name and remains the client-authored sparse brand
override layer from ADR 0003. Overrides match locale codes exactly and fall
directly back to the canonical brand data. Template UI dictionaries are
template-owned: English and Arabic ship initially, with UI lookup falling back
from an exact code to its base language and then English. Users do not provide
UI dictionaries in this configuration.

`navigation` currently contains only `numbering`, defaulting to `false` when
the block is omitted. Numbering is presentational only: it controls ordinal
labels, never filesystem order, route identity, filenames, or future project
tree structure. Section navigation remains derived from the content tree and
section metadata. The old top-level `numbering` key and hardcoded locale
constants/helpers are removed rather than retained as compatibility aliases;
consumers read the parsed configuration instead.

## Explicitly deferred

The following remain separate changes:

- nesting the root under `config.brand`;
- renaming `locales` to `localeOverrides`;
- implementing the omitted-`i18n` single-locale runtime behavior;
- generating the future project tree;
- route-parser options, fallback routing, and related routing policy;
- moving or expanding template UI dictionaries beyond the initial English and
  Arabic support.

## Consequences

- Configuration errors fail at the source boundary with paths that identify the
  invalid field.
- Runtime consumers can rely on parsed defaults such as
  `navigation.numbering` and locale direction.
- TypeScript autocomplete and exhaustiveness derive from the actual configured
  locale literals rather than a hardcoded locale tuple.
- Locale ordering remains a presentation concern, so reordering the array does
  not alter locale identity or translation resolution.
- The current flat import surface remains stable enough for this migration,
  while the later site-configuration migration can introduce `config.brand`.
- Existing callers must migrate from top-level `numbering` and duplicated
  locale exports to the parsed configuration.

## Verification

The implementation must cover the shipped configuration, resolved defaults,
strict unknown-key failures, duplicate identities, unresolved references,
locale/default/override invariants, config-derived i18n helpers, and
`navigation.numbering`. `pnpm check` and the existing test suite are required
before the change is considered complete.

## Terminology

See [`docs/GLOSSARY.md`](../GLOSSARY.md) for `Brand configuration`, `Parsed
configuration`, `I18n configuration`, `Navigation configuration`, `Locale
definition`, and `Template UI dictionary`.
