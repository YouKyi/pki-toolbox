---
name: release
description: Cut a manual release of pki-toolbox. Use when the user asks to "release", "cut a release", "tag a version", "publish a new version", or runs /release. Bumps the version in package.json, promotes the CHANGELOG [Unreleased] section, commits, tags vX.Y.Z and pushes so the GitLab tag pipeline builds and publishes the image. Takes an optional version argument (e.g. /release 1.1.0).
tools: Bash, Read, Edit
---

# Release pki-toolbox

Perform a full manual release. Only a `vX.Y.Z` tag publishes an image and a
GitLab Release, so the goal is a clean, correct tag on `main`.

## Hard rules (project + user constraints)

- Commit messages in **English**, Conventional Commits style.
- **No** `Co-Authored-By` trailer. **Never** use an em-dash (U+2014) anywhere.
- This Windows host has **no Node/pnpm**. Run any JS tooling inside Docker:
  `MSYS_NO_PATHCONV=1 docker run --rm -v "${PWD}:/app" -w /app node:24-alpine sh -c "corepack enable && pnpm <cmd>"`.
- Never deploy or tag `:latest`. Releases are immutable `vX.Y.Z` tags only.
- This is an outward-facing, hard-to-reverse action (a pushed tag triggers a
  public image build). **Confirm the version with the user before tagging.**

## Steps

1. **Preflight.** Run `git status -sb` and `git rev-parse --abbrev-ref HEAD`.
   - Must be on `main` with a clean tree. If not, stop and tell the user.
   - `git checkout main && git pull --ff-only`.
   - Check the latest `main` pipeline is green: `glab ci status`. If red, stop.

2. **Read state.** Read `CHANGELOG.md` (the `[Unreleased]` section) and the
   current `version` in `package.json`. Get the last tag:
   `git describe --tags --abbrev=0 --match 'v*'`.
   - If `[Unreleased]` is empty, there is nothing to release: stop and tell the
     user (do not invent entries).

3. **Decide the version.**
   - If the user passed a version argument (`$1`, like `1.1.0`), use it (must
     match `x.y.z`).
   - Otherwise infer the SemVer bump from the `[Unreleased]` content and the
     Conventional Commits since the last tag
     (`git log <lastTag>..HEAD --oneline`): `feat` -> minor, `fix`/`Security`
     only -> patch, breaking change -> major. Propose the number and **ask the
     user to confirm** before continuing.

4. **Edit `CHANGELOG.md`.**
   - Insert a new `## [X.Y.Z] - YYYY-MM-DD` heading (today's date) directly
     under the `## [Unreleased]` heading, so the current `[Unreleased]` entries
     become this release. Leave `## [Unreleased]` in place (now empty).
   - Update the link references at the bottom: rewrite `[Unreleased]` to
     `.../-/compare/vX.Y.Z...main` and add a `[X.Y.Z]` line pointing to
     `.../-/compare/<lastTag>...vX.Y.Z`. Keep the existing GitLab base URL.

5. **Bump `package.json`** `version` to `X.Y.Z`.

6. **Verify formatting** so the lint job stays green (CHANGELOG and
   package.json are checked by Prettier):
   `MSYS_NO_PATHCONV=1 docker run --rm -v "${PWD}:/app" -w /app node:24-alpine sh -c "corepack enable >/dev/null 2>&1 && pnpm exec prettier --check CHANGELOG.md package.json"`.
   If it fails, run `prettier --write` on those files, then re-check.

7. **Commit, tag, push.**
   ```sh
   git add CHANGELOG.md package.json
   git commit -m "chore(release): X.Y.Z"
   git push
   git tag -a vX.Y.Z -m "pki-toolbox vX.Y.Z"
   git push origin vX.Y.Z
   ```

8. **Verify the release pipeline.** Watch the tag pipeline with `glab ci status`
   (or `glab ci list`). It runs `lint`, `test`, `supply-chain`, `docker` (build,
   Trivy scan, push to the internal registry, ghcr.io and Docker Hub), then
   `release` (GitLab Release with notes from the `## [X.Y.Z]` CHANGELOG section).
   Report the outcome honestly. If a job fails, surface the log, do not pretend
   it passed.

9. **First public push only.** Remind the user to set the ghcr.io package and
   the Docker Hub repository to **public** (they default to private). Skip this
   on later releases.

## Notes

- Public images require the `GHCR_TOKEN`/`GHCR_USER` and
  `DOCKERHUB_TOKEN`/`DOCKERHUB_USER` CI variables to be set; without them the
  push to public registries is a silent no-op and only the internal registry
  gets the image.
- If the working tree is dirty, the pipeline is red, or `[Unreleased]` is empty,
  stop and ask the user instead of forcing the release.
