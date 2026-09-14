# ADR 0015: Establish the Brandtree monorepo boundary

- Status: accepted
- Date: 2026-09-14

## Context

Brandtree began as one Astro application containing both reusable framework
code and one site's configuration, prose, assets, routes, and deployment
setup. ADR 0008 established a source-neutral content core, but the filesystem
layout still allowed framework code to depend on app aliases and app-relative
asset and content globs.

The intended product flow eventually places author-owned content,
configuration, and custom pages in a web project, runs them through a
Brandtree CLI/package, and drives development and production builds through a
hidden generated `.brandtree` Astro application. The generator needs more
design work and must not be smuggled into a directory move.

## Decision

Use a pnpm monorepo with two workspaces:

- `packages/brandtree` is the single reusable framework package. It owns the
  brand schemas and derivations, source-neutral content model, components,
  layouts, styles, and rendering helpers.
- `apps/web` is the runnable dogfood site. It owns client configuration, MDX
  content, assets, public files, deployment configuration, and the current
  Astro composition layer.

The `brandtree` package is private and consumed as source through an explicit
export map in this phase. Astro, React, and React DOM are peers of the package
and direct dependencies of the web app. A package compilation and publishing
pipeline is deferred until the CLI contract is designed.

Framework modules must not import `apps/web` or resolve client configuration.
Astro collection loading, app-relative `import.meta.glob` calls, and route
composition remain in the web app. Asset-bound components use an app adapter:
the app discovers assets and passes normalized data to a pure package
component. MDX imports the app-owned composition barrel so those adapters can
replace package defaults without changing content files.

Root scripts preserve the existing developer interface. Development, build,
preview, and deployment target `apps/web`; the check command validates both
workspaces, while tests belong to the Brandtree package. The web app does not
own a test suite. The migration is structural and must preserve rendered
behavior.

## Consequences

- The dogfood site exercises an explicit Brandtree package API.
- Framework and client ownership are visible in the filesystem and dependency
  graph.
- The future generator has a clear replacement target: the temporary loader,
  content configuration, and route composition in `apps/web`.
- Client authoring remains Astro-native under `apps/web/src` for now, including
  `src/brand/config.ts`; no `brandtree.config.ts` migration is implied.
- A future hidden generated app should be thin and disposable, with reusable
  implementation remaining in the package and author-owned source remaining
  in the web project.

## Explicitly deferred

- The Brandtree CLI and command surface.
- Generating or running `.brandtree`.
- Moving author content, config, assets, or custom pages out of `apps/web/src`.
- Publishing `brandtree`, compiling a package `dist`, and release automation.
- A public site factory such as `createBrandtreeSite()`.
- Declarative replacement of Astro font-provider and deployment configuration.
