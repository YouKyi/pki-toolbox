# Contributing to pki-toolbox

Thanks for contributing. This document covers the local setup, the quality
bar and the workflow.

## Getting started

Requirements: **Node 24** and the **pnpm** version pinned by `packageManager`.

```sh
npm install -g "$(node -p "require('./package.json').packageManager")"
pnpm install
pnpm dev          # dev server on http://localhost:5173
```

## Project layout

- `src/lib/pki/` : pure, framework-free PKI parsing and generation functions
  (the testable core). All decoding is client-side.
- `src/lib/components/` : reusable Svelte UI components.
- `src/routes/` : one route per tool, plus the layout and home page.
- `src/lib/tools.ts` : the single tool registry that drives the sidebar and
  the home page.
- `tests/` : Vitest unit tests and PEM fixtures.

## Quality checks

All of these must pass before a change is pushed; CI runs the same commands
in the `lint` and `test` stages. Note that `pnpm build` is not a standalone
CI step: it runs inside the multi-stage Dockerfile as part of the `docker` job.

```sh
pnpm lint         # Prettier + ESLint
pnpm check        # svelte-check / TypeScript
pnpm test         # Vitest unit tests
pnpm build        # static production build (exercised by the docker job in CI)
```

Run `pnpm format` to apply Prettier automatically.

New behaviour in `src/lib/pki/` should come with unit tests. Keep the parsing
functions pure (no DOM, no network): the app is, and must remain, 100 percent
client-side.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`,
`fix:`, `chore:`, `ci:`, `docs:`, `refactor:`, `test:`, optionally with a
scope, e.g. `fix(chain): verify signatures, not just DN strings`.

## Merge requests

1. Branch off `main`.
2. Make the change, keep the quality checks green.
3. Use a Conventional Commit message: `feat`, `fix` and `perf` commits feed the
   next release and its changelog. Add an entry under `## [Unreleased]` in
   [`CHANGELOG.md`](./CHANGELOG.md) when the change deserves more than its
   commit subject: written entries are published as is. Skip this for
   dependency bumps, which CI lists on its own.
4. Open a merge request against `main`. The MR pipeline always runs lint and
   test (including the supply-chain scan); the `docker` job runs only when a
   build-affecting file changed.

## Releases

Releases take one click on the manual `catalog:release` job of a `main`
pipeline, documented in the
[Versioning & releases](./README.md#versioning--releases) section of the
README. A `vX.Y.Z` tag is still the only thing that publishes an image and a
GitLab Release; CI sets it, signed, once the release merge request is merged.

## Continuous integration

The pipeline (`.gitlab-ci.yml`) has five stages: `lint`, `test`, `scan`,
`docker`, and `release`.

| Stage     | Jobs                                                                                                   | When                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `lint`    | `pnpm lint`, `pnpm check`                                                                              | Every pipeline                                                                  |
| `test`    | `pnpm test`                                                                                            | Every pipeline                                                                  |
| `scan`    | `supply-chain` (Trivy filesystem scan: dependencies, secrets, licenses, CycloneDX SBOM)                | Every pipeline                                                                  |
| `docker`  | `container-image` chain: build and push of a candidate, Trivy scan by digest, promotion of that digest | Tags unconditionally; branches and MRs only when a build-affecting file changed |
| `release` | Publish a GitLab Release from the matching `CHANGELOG.md` section                                      | `vX.Y.Z` tags only                                                              |

There is no separate `build` stage: the build runs inside the `docker` job's
multi-stage Dockerfile. The image build starts right away and pushes an
untagged candidate; the promotion, which sets `:<sha>`, `latest` or the
version tag, waits for `lint`, `test`, `e2e`, the repository scans and the
image scan. An MR pipeline verifies the chain without tagging anything.
