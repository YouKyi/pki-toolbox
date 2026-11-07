---
name: release
description: Cut a release of pki-toolbox. Use when the user asks to "release", "cut a release", "tag a version", "publish a new version", or runs /release. CI (ci-catalog auto-release v5) keeps a release merge request ready on release/next; releasing means reviewing it, merging it on the user's go, then following the signed tag and its pipeline. Takes an optional version argument (e.g. /release 1.1.0), written by hand as a CHANGELOG section through a regular MR.
tools: Bash, Read
---

# Release pki-toolbox

Releases go through the ci-catalog `auto-release` component (v5). Nothing is
committed, tagged or pushed by hand: on every `main` pipeline, CI keeps the
`release/next` branch and its `chore(release): X.Y.Z` merge request in step
with `main`. A human merges it; the next `main` pipeline tags the head of that
merge request `vX.Y.Z`, signed with the CI release key.

## Hard rules (project + user constraints)

- This is an outward-facing, hard-to-reverse action (a tag publishes a public
  image and a GitLab Release, and never moves). **Show the release merge
  request (version and section) and get the user's go before merging it.**
- Never push to `release/next` and never set auto-merge on the release merge
  request: CI rewrites the branch, and a human merges.
- Never tag `:latest` or push a tag by hand unless the user asks for the manual
  signed path (see below).
- **Never** use an em-dash (U+2014) anywhere.

## Steps

1. **Preflight.** `export GITLAB_HOST=gitlab.int.youkyi.net`. Find the open
   release merge request: `glab mr list --source-branch release/next`. If there
   is none, read the `catalog:release-prepare` log of the latest `main`
   pipeline (`glab ci list -b main -P 1`): nothing to release, a version still
   waiting for its tag, or an error.

2. **Read it.** The title gives the version; the description gives the
   CHANGELOG section and what the release contains since the last tag
   (`Changes since vX.Y.Z`). If the description warns about a foreign commit,
   someone pushed to `release/next`: stop and ask the user. If the wording
   needs work, the fix is an MR on `main` that writes the entries under
   `## [Unreleased]` (written entries are published as is); the release merge
   request follows on the next `main` pipeline.

3. **Version argument.** If `$1` (`x.y.z`) differs from the proposed version,
   write the `## [x.y.z] - YYYY-MM-DD` section and the `package.json` version
   by hand in a regular MR. Its preview checks them; once it is merged, the
   tag job sets that version and CI closes the release merge request.

4. **Confirm with the user**: version, section, and a green pipeline on the
   release merge request (lint, tests, e2e, scans, candidate image).

5. **Merge**, on the user's go only: from the GitLab UI or
   `glab mr merge <iid>` (merge commit; GitLab requires the green pipeline).

6. **Follow it.** The next `main` pipeline runs `catalog:release-tag` after
   lint, tests, e2e and scans: tag `vX.Y.Z` on the head of the release merge
   request, then the preparation of the following release. The tag pipeline
   runs `catalog:release-provenance` first, then the image promotion and
   `catalog:gitlab-release`, which both wait for it. Report the outcome
   honestly, with the failing log if any.

7. **Verify** the tag:

   ```sh
   git fetch --tags
   git -c gpg.ssh.allowedSignersFile=allowed_signers verify-tag vX.Y.Z
   ```

## When something fails

- `catalog:release-prepare` is red: the log says why (project settings, a v4
  `release/vX.Y.Z` merge request still open, CHANGELOG format, a version file
  going backwards). Fix the cause with a regular MR or in the settings; the
  next `main` pipeline retries.
- The release merge request pipeline is red: fix it on `main` with a regular
  MR; the release merge request follows. Do not push to `release/next`.
- `catalog:release-tag` fails: retry the job once the cause is fixed (token,
  signing key, `allowed_signers`, or a `[X.Y.Z]` section that differs between
  `main` and the release head, restored by an MR). Any later `main` pipeline
  sets the same tag; the job does nothing if the tag already exists.
- `catalog:release-provenance` refuses the tag: nothing is published. A
  missing key is merged on `main`, then the job is retried; no new tag.

## Manual signed path

To sign a release with the YubiKey instead, tag the head of the release merge
request (the second parent of its merge commit, not the merge commit) after
the merge and before `catalog:release-tag` runs, which waits for lint, tests
and scans of the `main` pipeline:
`git tag -s vX.Y.Z -m "pki-toolbox vX.Y.Z" <merge commit>^2` and
`git push origin vX.Y.Z`. CI sees the tag and does nothing; the tag pipeline
verifies it against `release-signers.asc` (OpenPGP) or `allowed_signers` (SSH),
and refuses a key listed in neither.
