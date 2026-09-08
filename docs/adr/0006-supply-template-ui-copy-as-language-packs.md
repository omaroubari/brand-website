# ADR 0006: Supply template UI copy as language packs

- Status: accepted
- Date: 2026-09-08

## Context

Template-owned interface copy was stored as two complete, flat dictionaries in
the same module as locale routing and client brand localization. That made the
UI vocabulary difficult to navigate, required every translation to repeat the
English catalog, and coupled unrelated localization policies.

Client-authored brand data and template UI copy have different ownership and
fallback requirements. Brand locale overrides must continue to match exact
configured locale codes and fall directly back to canonical brand data. The
template can safely provide broader language fallback for its own interface.

Blume's grouped schema and sparse built-in pack design informed this decision,
but this repository has a smaller vocabulary, no user-authored UI overrides,
and ships only English and Arabic.

## Decision

Move template UI copy into a dedicated language-pack boundary:

```text
src/i18n/
├── index.ts
├── ui.ts
└── ui-packs/
    ├── index.ts
    └── ar.ts
```

`ui.ts` owns a strict, two-level Zod schema grouped by interface surface. Every
English leaf is a `z.string().default(...)`. Every group and the root use
`.prefault({})`, so parsing `{}` traverses nested schemas under Zod 4 and
produces the complete English baseline. `UIStrings` and `EN_UI` are both
derived from that schema.

English is the schema baseline and has no pack module. Non-English built-in
packs are typed, strict, two-level sparse overrides. The open-keyed `UI_PACKS`
registry currently contains only `ar`; adding another built-in language
requires one module and one registry entry. Users cannot provide UI overrides.

UI resolution applies these layers:

```text
English schema baseline
  <- configured default-locale built-in pack
  <- requested-locale built-in pack, when different
```

Each pack lookup tries the exact BCP 47 code, a case-insensitive exact code,
then the base language. Thus `ar`, `ar-SA`, and `AR-sa` resolve Arabic UI copy.
An unknown requested locale retains the configured default-locale pack and
then English for any leaves that pack omits.

`src/i18n/index.ts` keeps locale routing and exact-code brand resolution, and
re-exports the UI API. `getUi()` is the application wrapper around the pure
`resolveUIStrings()` function. UI pack matching never changes brand locale
override matching.

## Consequences

- The schema is the single source of truth for English defaults and the
  complete resolved type.
- Surface groups make component access and accessibility-copy coverage visible.
- Sparse packs reduce translation maintenance while retaining complete runtime
  dictionaries.
- Strict pack validation catches unknown groups, unknown keys, blank values,
  and missing required placeholders in tests.
- Additional built-in packs are cheap to add without widening site or brand
  configuration.
- Brand locale overlays retain their exact-code-only resolution semantics.

## Explicitly deferred

Additional packs, user-authored UI overrides, project/content trees, content
translation tooling, translation ledgers, route parsing and fallback pages,
and localized search remain separate work.

## Terminology

See [`docs/GLOSSARY.md`](../GLOSSARY.md) for `Template UI dictionary`, `English
baseline`, `UI pack`, and `UI resolution`.
