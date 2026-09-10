# ADR 0011: Prepare for versioned guidelines

- Status: accepted
- Date: 2026-09-10

## Context

Brand systems evolve. Published guidelines may need stable historical
snapshots while the main site continues to represent the current brand. Adding
versions after route identity and navigation are fixed would require another
content-model migration.

Versioned publishing is a committed future feature, although the current site
does not yet expose a version switcher or authoring workflow.

## Decision

Reserve a version dimension in the content core now. Configured version
directories are recognized explicitly; ordinary folders are never guessed to
be versions.

The current guidelines use the empty version identity and retain their existing
routes. A snapshot prepends its version identifier to the logical route:

```text
current:  /logo/usage-rules
snapshot: /v1.0/logo/usage-rules
```

Locale placement composes with versions. The source parser reads the version
scope before the locale scope, while the public route applies the configured
locale-prefix policy consistently.

Each page carries:

- `version`, identifying its snapshot or the current version;
- `translationKey`, grouping translations within one version;
- `versionKey`, grouping the same logical page across versions.

Archived pages remain routable and discoverable through the route manifest but
do not enter current-guidelines navigation. A future version switcher may use
`versionKey` to select the same page in another version and fall back to that
version's root when no corresponding page exists.

Folder metadata is version-scoped. A snapshot resolves metadata from its own
directory and must not silently inherit mutable current-version structure.

## Consequences

- Current URLs remain clean and unversioned.
- Historical snapshots have stable, explicit namespaces.
- Locale and version switching can use durable identities instead of matching
  incidental URLs.
- The page model carries a small amount of dormant data before the authoring
  and UI workflows are delivered.
- Enabling version directories must be explicit to avoid reinterpreting client
  content accidentally.

## Explicitly deferred

- Snapshot creation and release commands.
- Version navigation and canonical-to-latest behavior.
- Retention, deletion, and redirect policy for old versions.
