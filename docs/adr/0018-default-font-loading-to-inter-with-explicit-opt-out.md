# ADR 0018: Default font loading to Inter with explicit opt-out

- Status: accepted
- Date: 2026-10-06
- Tracking: issues [#8](https://github.com/omaroubari/brand-website/issues/8),
  [#13](https://github.com/omaroubari/brand-website/issues/13),
  [#14](https://github.com/omaroubari/brand-website/issues/14), and
  [#15](https://github.com/omaroubari/brand-website/issues/15)

## Context

The consumer contract in [ADR 0017](0017-define-the-brandtree-consumer-project-contract.md)
separates top-level font loading declarations from documented brand typography.
Typography can reference a family or CSS variable without a corresponding loading
declaration. Previously, omitted declarations loaded no fonts, and an undefined
variable could invalidate the resulting `font-family` declaration without a warning.

Use open-source Inter to give generated sites a consistent default while keeping
system-only operation explicit. This supersedes ADR 0017's policy that omitted
font declarations load no default typeface. The separation between documented
typography and runtime styling established by
[ADR 0001](0001-separate-brand-typography-from-template-design-system.md) remains.

## Decision

Keep loading declarations in the typed top-level `fonts` field of
`brandtree.config.ts`. Brandtree translates them into generated Astro provider
configuration; authors do not import provider factories. Resolve font defaults
and typography fallback stacks at the configuration boundary, then pass resolved
values through composition roots to components.

- Omitting `fonts` registers Inter through Google's provider with variable weights
  `100 900`, normal and italic styles, and `--font-brandtree-default` as its CSS
  variable. Display and text typography retain authored family priority, then
  fall back to Inter and `system-ui, sans-serif`.
- `fonts: []` opts out of managed font loading and uses system fallback stacks.
  An explicit nonempty array replaces the default registration; its typography
  falls back to system fonts without implicitly adding Inter.
- A bare `var(--font-name)` receives its fallback inside `var()`, because appending
  another family outside an undefined variable does not make the declaration
  valid. Existing explicit variable fallbacks and generic system stacks retain
  their priority.
- Canonical and locale-specific display/text typography follow the same rules.
  Preserve authored locale choices, monospace, documented family metadata,
  weights, and the published type scale. Inter does not cover every script,
  including Arabic; locale typography must retain suitable families or system
  stacks.
- Resolve local font files relative to the author project root. `assets/` is a
  convention, not a restriction: files under `src/`, `public/`, or the project
  root are supported as well. Examples include `./assets/fonts/font.woff2`,
  `./src/fonts/font.woff2`, and `./public/fonts/font.woff2`. Absolute filesystem
  paths and explicit URLs are also accepted. `/fonts/font.woff2` is an absolute
  filesystem path in a local declaration, not a shorthand for `public/fonts/`.
- Google fonts are downloaded during the build and served as site assets.

## Consequences and deferred work

Generated sites have a consistent default without requiring authors to declare
a font provider. Authors can opt out or replace it, and authored inputs remain
separate from resolved runtime fallback strings. Omitting `fonts` introduces a
Google download dependency during builds; system-only authors should explicitly
use `fonts: []`.

CSS fallback stacks keep browser typography usable when a referenced variable or
family is unavailable. They do not make a failed provider download nonfatal.
Actionable warnings for undeclared variables, unavailable local files, and failed
Google downloads, along with build-time recovery, remain follow-up work under
issues #13 and #14.

Social cards still use separate `seo.og.fonts` declarations. Reusing top-level
font declarations and packaging Inter as a deterministic rendering fallback
remain follow-up work under issue #15. The Google-loaded website default does not
provide that bundled social-card fallback or universal locale coverage.
