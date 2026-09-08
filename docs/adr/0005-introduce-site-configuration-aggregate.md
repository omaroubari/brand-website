# ADR 0005: Introduce a site configuration aggregate

- Status: accepted
- Date: 2026-09-08

## Context

ADR 0004 established Zod as the authoritative configuration model but kept a
flat root that mixed canonical brand facts with site behavior. That interface
made `brand` responsible for routing locales and navigation presentation even
though those settings are not brand data. The planned filesystem-derived
project tree needs a site-level aggregate before it can be introduced without
further widening the brand interface.

ADR 0003 also named the sparse structured-data overlay `brand.locales`. That
name is ambiguous beside `i18n.locales`, whose entries define site locale
identity and switcher order.

## Decision

Use `brandtreeConfigSchema` as the root schema and `defineConfig()` as the only
parsing interface. The authored and parsed aggregate has three namespaces:

```ts
export const config = defineConfig({
  brand: {
    meta: {},
    colors: {},
    theme: {},
    typography: {},
    logo: {},
    contact: {},
    downloads: [],
    localeOverrides: {},
  },
  i18n: {
    defaultLocale: "en",
    locales: [
      { code: "en", label: "English", dir: "ltr" },
      { code: "ar", label: "العربية", dir: "rtl" },
    ],
  },
  navigation: { numbering: true },
});

export const brand = config.brand;
export default config;
```

`brandSchema` describes brand data only. Site behavior reads from `config.i18n`
and `config.navigation`; pure brand exhibit modules may continue importing the
named `brand` alias. The structured brand overlay is renamed, without a
deprecated alias, from `locales` to `localeOverrides`.

Brand-local invariants remain in `brandSchema`: canonical identity uniqueness,
colour references, and exact override collection identities. Cross-aggregate
invariants live in `brandtreeConfigSchema`: locale overrides require `i18n`, and
each override key must exactly match a configured locale code.

The schemas infer `BrandtreeConfigInput`, `ResolvedConfig`, `BrandConfigInput`, and
`BrandConfig`. `defineConfig()` preserves configured locale literals while
returning parsed defaults. `navigation` remains optional input and resolves to
`{ numbering: false }`; `i18n` remains optional in the schema.

## Superseded decisions

This ADR supersedes only:

- ADR 0004's flat-root configuration shape and `defineBrand()` root parsing
  interface; and
- ADR 0003 and ADR 0004's `brand.locales` name for structured brand overlays.

All other decisions in those ADRs remain in force, including sparse exact-code
overlays, canonical identity matching, locale ordering semantics, UI dictionary
fallback, and the deferral of omitted-`i18n` runtime routing.

## Consequences

- Brand data and site behavior have distinct namespaces behind one deep module
  interface, improving locality for validation and runtime consumers.
- There is one valid configuration entry point and no precedence or migration
  shim for the old flat shape.
- Existing brand exhibits retain the named `brand` import without learning the
  site aggregate.
- Runtime and tests must migrate from `brand.i18n`, `brand.navigation`, and
  `brand.locales` to their new owners.
- The future project-tree decision will be ADR 0006.

## Explicitly deferred

The project/content tree, nested navigation, route parser options, fallback
routing, and omitted-`i18n` single-locale runtime behavior remain separate
changes.
