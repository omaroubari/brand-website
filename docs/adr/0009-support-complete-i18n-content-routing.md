# ADR 0009: Support complete i18n content routing

- Status: accepted
- Date: 2026-09-10

## Context

ADR 0003 localizes brand data with sparse overlays, and ADR 0006 supplies
template UI language packs. Content prose has additional concerns: source-file
placement, public route prefixes, missing translations, shared pages, and
locale-specific information architecture.

A brand may not use English as its default language, may publish the default
locale without a URL prefix, and may structure translated guidelines
differently where language or market needs differ.

## Decision

Make content internationalization optional but complete. When `config.i18n` is
absent, Brandtree operates as a single-locale site and content routes have no
locale segment. When it is present, every configured locale receives its own
content and navigation projection.

Support two authoring parsers:

- `dir`: locale directories such as `ar/logo/index.mdx`;
- `dot`: filename suffixes such as `logo/index.ar.mdx`.

The parser affects source placement only. Public URL localization is controlled
by the locale code and `hideDefaultLocalePrefix`. The default locale may publish
at `/logo`; other locales publish at `/{locale}/logo`. When the default prefix
is visible, it publishes at `/{defaultLocale}/logo` like every other locale.

A `.$.` filename identifies content shared by every configured locale. Shared
content is materialized into each locale's route and navigation projection but
retains one logical translation identity.

Every page has a locale-independent `translationKey`. Locale switching should
resolve the destination through that key, not merely replace a URL prefix, so
localized slug differences remain valid. A missing translation is non-fatal.
When `fallbackLocale` is configured, the missing locale may project the
fallback page at the requested locale's route and mark it as fallback content.
Setting `fallbackLocale` to `null` disables content fallback.

Navigation is resolved independently per locale. Each locale may have different
pages, groups, labels, folder metadata, and sibling order. Numeric prefixes and
locale-specific `meta.ts` files belong to that locale's information
architecture. Alphabetical fallback uses an `Intl.Collator` created for the
active locale.

Locale definition order controls only language-switcher presentation. It does
not make one locale's navigation canonical for another. Template UI fallback
continues to follow ADR 0006, while structured brand data continues to follow
ADR 0003; neither mechanism is replaced by content fallback.

## Consequences

- Single-locale sites do not need dummy locale directories or URL prefixes.
- Directory and dot authoring layouts produce the same content model.
- Shared pages avoid unnecessary translation copies.
- Locale-specific information architectures are supported intentionally.
- Navigation, pagination, breadcrumbs, and locale switching must use the
  resolved locale tree and translation identity rather than path assumptions.
- Fallback content must be visibly identifiable to downstream features even
  when the UI chooses not to display a fallback badge.

## Superseded decisions

This ADR supersedes ADR 0004 and ADR 0005's deferral of single-locale runtime
routing, route parsers, and fallback routing. It extends ADR 0007's
locale-directory model without changing its filesystem-derived hierarchy.
