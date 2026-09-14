# ADR 0016: Locate site configuration at the web app root

- Status: accepted
- Date: 2026-09-14

## Context

ADR 0005 introduced a site configuration aggregate containing brand data,
internationalization, navigation, and SEO settings. Its implementation remained
at `apps/web/src/brand/config.ts` during the monorepo migration described by ADR 0015. That location makes the aggregate look like an internal brand module even
though it is the client-authored entry point for the whole site.

## Decision

Place the authored aggregate at `apps/web/brandtree.config.ts`, beside the Astro
application configuration. Export only the parsed aggregate as the module's
default export:

```ts
export default defineConfig({
  brand: {},
  i18n: {},
  navigation: {},
  seo: {},
});
```

Application source imports it through the exact `@config` TypeScript path alias.
`apps/web/astro.config.ts` imports it directly as `./brandtree.config`. Callers
derive `config.brand` locally when they need the brand-only value; the authored
module does not export compatibility aliases or inferred site-specific types.

## Consequences

- The filename and location communicate that the file configures the whole
  Brandtree site rather than only its brand exhibits.
- Client-owned configuration remains inside the `apps/web` workspace, preserving
  the package boundary from ADR 0015 and keeping `brandtree` resolvable through
  the web app's existing workspace dependency.
- There remains one authored configuration file and one parsing boundary.
- Moving other client-owned content or introducing the future generated
  `.brandtree` app remains deferred.

## Verification

`pnpm check`, `pnpm test`, and `pnpm build` must succeed. Development startup
must also resolve and load the root-level web app configuration.
