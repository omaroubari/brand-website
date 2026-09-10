# ADR 0013: Separate logical and deployment base paths

- Status: accepted
- Date: 2026-09-10

## Context

A brand website may mount its guidelines below another site section and may
also be hosted beneath an infrastructure-controlled subpath. Both appear as URL
prefixes, but they have different ownership and must not be collapsed into
Astro's `base` option throughout the content model.

Direct subpath deployment configured by users through Astro `base` is currently
unsupported.

## Decision

Model two explicit Brandtree settings:

- `basePath` is the logical mount point of the Brandtree content within the
  website, such as `/brand-guidelines`;
- `deployment.base` is the hosting prefix imposed by the deployment target,
  such as `/client-site`.

They compose in this order:

```text
deployment.base + basePath + locale prefix + content route

/client-site   + /brand-guidelines + /ar + /logo
= /client-site/brand-guidelines/ar/logo
```

`basePath` participates in logical site routing and links. It remains invisible
to the content hierarchy: it must not create a navigation group or alter page
identity. `deployment.base` is an outer transport concern applied consistently
to pages, assets, canonical URLs, redirects, and client-side navigation.

Users do not configure Astro `base` directly. Until Brandtree implements
`deployment.base` end to end, deployment beneath a hosting subpath is
unsupported. A future integration may project `deployment.base` into Astro
internals, but Astro configuration is an implementation detail rather than the
public Brandtree contract.

Route representations must name their path space explicitly. Logical content
routes, localized routes, Brandtree-mounted routes, and final deployed URLs
must not be passed interchangeably under a generic `route` or `base` contract.

## Consequences

- Mounting guidelines within a site is independent from where the site is
  hosted.
- Navigation does not acquire artificial groups from infrastructure paths.
- Deployment prefixes are applied once at the outer boundary.
- Current projects must deploy at the host root unless and until
  `deployment.base` is implemented.
- Existing code that imports Astro `base` as the Brandtree content mount must be
  replaced by explicit Brandtree configuration.
