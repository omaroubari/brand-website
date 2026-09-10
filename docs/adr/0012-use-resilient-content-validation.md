# ADR 0012: Use resilient content validation

- Status: accepted
- Date: 2026-09-10

## Context

Brandtree sites are publishing tools for designers and content authors. A typo
in optional navigation metadata should not make the entire brand website
unavailable. At the same time, silently accepting ambiguity makes builds
non-deterministic and difficult to diagnose.

Configuration invariants and recoverable content-topology mistakes require
different policies.

## Decision

Keep root Brandtree configuration strict as established by ADR 0004 and ADR 0005. Invalid configuration shapes, unsafe source paths, metadata module load
failures, and content that cannot be parsed or rendered remain build errors
because Brandtree cannot recover safely.

Treat recoverable content-topology and presentation mistakes as diagnostics.
They warn when a useful author action exists, apply a deterministic fallback,
and do not stop publication:

- For duplicate routes or multiple indexes resolving to one route, the first
  owner in stable source order wins. Losing entries are excluded from the route
  manifest and rendered static paths.
- For duplicate `meta.pages` entries, the first occurrence supplies the rank
  and later occurrences are ignored.
- Unknown `meta.pages` entries and attempts to rank an index are ignored.
- An unknown icon name is omitted.
- Missing translations remain absent or use the configured fallback policy.

Diagnostics identify the source file, normalized key or route, conflicting
owner when relevant, and the recovery Brandtree selected. Stable source order
must be defined by the source adapter rather than inherited accidentally from
object, filesystem, or network enumeration.

Ignoring a value must not leave contradictory projections. The route map,
static path list, navigation tree, pagination, and locale/version lookup must
all observe the same recovered content graph.

## Consequences

- Optional editorial mistakes do not take a published brand site offline.
- Authors still receive actionable feedback during development and CI.
- Recovery behavior is testable and reproducible.
- Strict security and configuration boundaries remain intact.
- Graph construction must resolve diagnostics before consumers receive the
  tree; consumers do not implement their own conflict policies.

## Superseded decisions

This ADR supersedes ADR 0007's requirement that unknown metadata references,
invalid icons, duplicate metadata entries, multiple indexes, and normalized
route collisions always fail the build.
