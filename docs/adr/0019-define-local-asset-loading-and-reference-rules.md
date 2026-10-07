# ADR 0019: Define local asset loading and reference rules

- Status: accepted
- Date: 2026-10-07
- Tracking: issues [#8](https://github.com/omaroubari/brand-website/issues/8) and
  [#13](https://github.com/omaroubari/brand-website/issues/13)

## Context

Brand assets need predictable path resolution and
availability diagnostics when Brandtree loads the author configuration. Giving
leading-slash references different meanings in different fields makes the same
reference point to different files. Separate file checks for each asset type
would also duplicate diagnostics and recovery plumbing.

Use one explicit prefix convention and a shared local asset checker. This
refines the consumer path conventions in
[ADR 0017](0017-define-the-brandtree-consumer-project-contract.md) and establishes a foundation that the separate
[font configuration PR #29](https://github.com/omaroubari/brand-website/pull/29)
can consume.

## Decision

Apply the same reference rules to every asset field in scope:

| Prefix     | Meaning                                                   | Example                                                  |
| ---------- | --------------------------------------------------------- | -------------------------------------------------------- |
| `./`       | Relative to the author project root                       | `./src/fonts/font.woff2` → `<root>/src/fonts/font.woff2` |
| `file:///` | Explicit filesystem location                              | `file:///path/to/font.woff2` → `/path/to/font.woff2`     |
| `/`        | Public URL under the author project's `public/` directory | `/fonts/font.woff2` → `<root>/public/fonts/font.woff2`   |

The rule depends on the prefix, not the asset type. `assets/` is a convention,
not a restriction; project-relative files can be under `src/`, `public/`, or any
other author-selected directory. Bare paths receive a diagnostic requesting an
explicit prefix. Public URL query strings and fragments are removed for
filesystem checks; filesystem references preserve their filename characters.

Enumerate references from typed file-bearing configuration fields rather than
guessing whether arbitrary strings are paths. Current scope is logo artwork, favicon, and downloads. Ordinary copy and site/contact
URLs are not treated as files. Remote URLs are skipped by the local checker;
their resolution and downloading remain owned by their consuming providers.
Font declarations and OG handling remain separate work.

Check availability during config loading, then forward findings through the
existing project-scanning and CLI diagnostics pipeline. A file must be readable
and regular. Missing, unreadable, and non-file references produce the same
structured warning with the affected config field, original reference, resolved
file path when available, and an actionable suggestion.

Artwork and download references retain their authored values with warnings for
the author to fix. There is no universal replacement image or downloadable file.
Authored inputs are never mutated.

## Consequences

All local asset types share path interpretation and diagnostic formatting,
while each consumer retains its appropriate recovery behavior. The same checker
can support additional typed asset fields without introducing another path rule.

Each scan checks current availability. Restoring a file clears its warning on
the next preparation pass. Resolution stays anchored to the
author project root, independently of the disposable generated app's location.
Malformed configuration remains a schema error; availability warnings are
nonfatal. A readable file is not a guarantee that its contents are valid for its
consumer. Font-specific integration, defaults, and recovery build on this
foundation separately in PR #29.
