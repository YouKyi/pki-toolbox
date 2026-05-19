# Contributing to pki-toolbox

Thanks for contributing. This document covers the local setup, the quality
bar and the workflow.

## Getting started

Requirements: **Node 20 LTS** and **pnpm** (via Corepack).

```sh
corepack enable
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
3. Add an entry under `## [Unreleased]` in [`CHANGELOG.md`](./CHANGELOG.md)
   describing the change (skip this for pure dependency bumps, which Renovate
   handles).
4. Open a merge request against `main`. The MR pipeline always runs lint and
   test (including the supply-chain scan); the `docker` job runs only when a
   build-affecting file changed.

## Releases

The release procedure (changelog, version bump, tag) is documented in the
[Versioning & releases](./README.md#versioning--releases) section of the
README. A `vX.Y.Z` tag is the only thing that publishes an image and a
GitLab Release.

## Continuous integration

The pipeline (`.gitlab-ci.yml`) has four stages: `lint`, `test`, `docker`,
and `release`.

| Stage | Jobs | When |
|-------|------|------|
| `lint` | `pnpm lint`, `pnpm check` | Every pipeline |
| `test` | `pnpm test`; `supply-chain` (Trivy filesystem scan: dependencies, secrets, CycloneDX SBOM) | Every pipeline |
| `docker` | Build via the multi-stage Dockerfile (which runs `pnpm build` internally), Trivy image scan, push to registry | Tags unconditionally; branches and MRs only when a build-affecting file changed |
| `release` | Publish a GitLab Release from the matching `CHANGELOG.md` section | `vX.Y.Z` tags only |

There is no separate `build` stage and no separate `scan` stage. The
`supply-chain` job (filesystem scan) runs in the `test` stage on every
pipeline. The Trivy image scan and the push run together in the `docker` job,
which is gated on `lint` and `test` passing.
