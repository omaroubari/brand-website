# Releasing Brandtree

Changesets records release intent in small Markdown files. The release workflow
turns those files into a version bump, a changelog, and a release pull request.
Only `packages/brandtree` is publishable; all apps and the monorepo root are private.

## Everyday workflow

1. Make your change and run `pnpm check` and `pnpm test`.
2. Run `pnpm changeset` from the repository root.
3. Select `brandtree`, choose a bump, and describe the change for package users.
4. Commit the generated `.changeset/*.md` file alongside your code.
5. Merge your feature PR into `main`. GitHub Actions opens or updates
   **chore: release Brandtree**, combining all pending changesets.
6. Review and merge that release PR when you're ready to publish. It updates the
   version, package changelog, and lockfile, and consumes the changeset files.
7. The release workflow checks and tests the merged code, packs the package,
   publishes it to npm, and creates a GitHub release and tag.

Use a patch for fixes, a minor for new features, and a major for breaking changes.
Before 1.0, explicitly choose minor for breaking changes and explain the migration
in the changeset. Docs or tooling changes that don't affect the distributed
package don't need a changeset. Changes to its README do affect the package.

`pnpm changeset status` previews pending releases without changing files.
The bot handles `pnpm version-packages`; normally you don't run it yourself.
`pnpm release` is the manual build-and-publish command and uploads to npm, so don't
use it as a dry run. The automated workflow uses Changesets' separate pack and
publish actions so only the publish job receives npm authentication permissions.

## One-time setup

The repository files are ready for npm trusted publishing (OIDC). No `NPM_TOKEN`
secret is needed. Publishing stays disabled until the repository variable
`NPM_PUBLISH_ENABLED` is set to `true`; release PRs still work before that.

### 1. Enable release pull requests

In GitHub repository **Settings → Actions → General → Workflow permissions**,
enable **Allow GitHub Actions to create and approve pull requests**. The workflow
requests its own contents and pull-request write permissions.

The default GitHub token doesn't trigger CI on bot-created release PRs. To run CI
before merging one, open **Actions → CI → Run workflow** and select the
`changeset-release/main` branch. If branch protection requires automatic PR checks,
use a GitHub App token with `changesets/action/version`'s `github-token` input.
See the [Changesets automation guide](https://changesets.dev/guide/automating#run-github-actions-for-version-prs).

### 2. Publish the first version manually

A new npm package needs its initial publish before you can configure its trusted
publisher in the package settings. Keep `NPM_PUBLISH_ENABLED` unset for now.
From a clean checkout of the release commit on `main`, using Node.js 24:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
npm login
cd packages/brandtree
npm pack --dry-run
npm publish --access public
```

Complete npm's interactive authentication. This publishes the version currently
in `packages/brandtree/package.json` to the `latest` tag; currently that is
`0.0.1`. Do not run `pnpm version-packages` just to publish the existing version.
An alpha-stage project can use ordinary `0.x` releases; the prerelease process
below is optional.

### 3. Connect npm to GitHub Actions

On npm, open **brandtree → Settings → Trusted Publisher**, select GitHub Actions,
and enter these exact values:

| Field                | Value                                          |
| -------------------- | ---------------------------------------------- |
| Organization or user | `omaroubari`                                   |
| Repository           | `brandtree`                                    |
| Workflow filename    | `release.yml`                                  |
| Environment          | Leave empty; the workflow doesn't declare one. |
| Allowed actions      | Allow direct publishing with `npm publish`.    |

Use only `release.yml`, not `.github/workflows/release.yml`. The workflow uses
GitHub-hosted Ubuntu runners and Node.js 24, which includes a suitable npm CLI.
Trusted publishing needs npm 11.5.1+ and Node.js 22.14+; provenance is generated
automatically for supported public repositories. See
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

### 4. Enable automated publishing

In GitHub **Settings → Secrets and variables → Actions → Variables**, add the
repository variable `NPM_PUBLISH_ENABLED` with value `true`. This is a variable,
not a secret. Future merged release PRs will publish automatically. You can also
run **Actions → Release → Run workflow** on `main` to retry a failed release.
Changesets skips package versions that already exist on npm.

## Optional alpha releases

For explicitly tagged prereleases, enter prerelease mode on your development
branch before adding changesets:

```sh
pnpm changeset pre enter alpha
pnpm changeset
```

Commit `.changeset/pre.json` and the new changeset with your changes. The release
PR will version the package as an alpha and publish under `alpha`, leaving
`latest` unchanged. Exit when you're ready for a normal release:

```sh
pnpm changeset pre exit
```

Commit that change and let the release PR finalize the normal version. For the
very first manual publish of a prerelease version, explicitly use
`npm publish --access public --tag alpha` rather than the bootstrap command above.

## What runs where

- `.github/workflows/ci.yml` checks types, runs tests, and previews package contents
  on PRs to `main`. It can also be started manually on a release PR branch.
- `.github/workflows/release.yml` runs on pushes to `main` or manual dispatch on
  `main`. It chooses versioning or publishing, then runs the appropriate jobs.
- The version job updates the lockfile after Changesets edits package versions.
- The pack job must pass `pnpm check` and `pnpm test` before producing an artifact.
- Only the publish job has `id-token: write`, allowing npm to verify the workflow.
  It publishes the packed artifact rather than rebuilding the package.

The pipeline uses frozen lockfile installs and the pnpm version from the root
`packageManager` field. It does not deploy the example website.
