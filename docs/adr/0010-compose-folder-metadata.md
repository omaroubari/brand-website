# ADR 0010: Compose folder metadata

- Status: accepted
- Date: 2026-09-10

## Context

ADR 0007 introduced static, locale-specific `meta.ts` files for naming and
ordering filesystem groups. Brandtree also needs reusable metadata, computed
ordering, and organizational groups that do not create URL segments. These are
framework features rather than accidental loader behavior.

## Decision

A folder may provide metadata as a static object or a synchronous or
asynchronous factory passed through `defineMeta()`. Factories run at build time
and must resolve to the same validated, serializable metadata shape as static
objects.

Folder metadata may define:

- `title`, `icon`, and `order`;
- `pages`, which ranks direct children by normalized key;
- `collapsed`, an accepted display preference whose UI may be implemented
  incrementally.

Locale-specific `meta.ts` applies to one locale. A `meta.$.ts` file outside a
locale directory supplies shared defaults. Locale-specific fields override
shared fields individually; omitted values retain the shared value. Shared
metadata may remain version-specific when it lives inside a version snapshot.

A directory wrapped in parentheses, such as `(legal)`, creates a pathless
navigation group. It organizes descendants and may own metadata, but does not
add a public URL segment. Ordinary directories continue to create both a
navigation group and a route segment.

Metadata modules are discovered statically by the Astro/Vite integration so
they remain bundled and watched. Arbitrary runtime module paths and runtime
filesystem discovery are not supported.

Metadata errors follow ADR 0012's resilient validation policy. Recoverable
unknown references, duplicate ranks, and unknown icons warn and degrade
deterministically rather than stopping publication.

## Consequences

- Repeated locale structure can share metadata without copy-paste.
- Build-time factories can derive metadata from files or configuration.
- Pathless groups separate navigation organization from URL design.
- Consumers must tolerate accepted preferences, such as `collapsed`, before a
  particular renderer implements them.
- Factory execution must remain deterministic and free of request-time state.

## Superseded decisions

This ADR supersedes ADR 0007's static-object-only metadata contract and its
exclusion of computed metadata, shared metadata, and pathless groups.
