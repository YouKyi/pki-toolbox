---
name: release
description: Cut a release of pki-toolbox. Use when the user asks to "release", "cut a release", "tag a version", "publish a new version", or runs /release. Releases take one click on the manual catalog:release job of the latest main pipeline (ci-catalog auto-release component); CI computes the version, writes the CHANGELOG, merges the release MR and signs the tag. Takes an optional version argument (e.g. /release 1.1.0), passed as RELEASE_VERSION.
tools: Bash, Read
---

# Release pki-toolbox

Releases go through the ci-catalog `auto-release` component. Nothing is
committed, tagged or pushed by hand: CI writes the release commit, opens the
`chore(release): X.Y.Z` merge request, merges it once green, then tags the
release commit `vX.Y.Z`, signed with the CI release key.

## Hard rules (project + user constraints)

- This is an outward-facing, hard-to-reverse action (a tag publishes a public
  image and a GitLab Release, and never moves). **Show the preview and confirm
  the version with the user before running the job.**
- Never tag `:latest` or push a tag by hand unless the user asks for the manual
  signed path (see below).
- **Never** use an em-dash (U+2014) anywhere.

## Steps

1. **Preflight.** `export GITLAB_HOST=gitlab.int.youkyi.net`. Find the latest
   `main` pipeline (`glab ci list -b main -P 1`). Its `catalog:release-preview`
   job must be green; the rest of the pipeline should be green too, or the
   release MR will fail the same way.

2. **Read the preview.** The log of `catalog:release-preview` (and its
   `auto-release-preview.md` artifact) gives the next version and the exact
   CHANGELOG section. If it says there is nothing to release, stop and tell
   the user. If the section needs better wording, the fix is an MR that writes
   the entries under `## [Unreleased]` (written entries are published as is),
   not an edit of the release MR.

3. **Confirm with the user**: version and section. A version argument (`$1`,
   `x.y.z`) is passed as the `RELEASE_VERSION` job variable.

4. **Click.** Run the manual `catalog:release` job of that same pipeline, from
   the GitLab UI or the API (`POST /projects/64/jobs/:job_id/play`, with
   `job_variables_attributes` for `RELEASE_VERSION`). Its log ends with the
   release MR link and `Auto-merge pose`.

5. **Follow it.** The release MR pipeline runs lint, tests, e2e, scans and a
   candidate image; green, the MR merges. The next `main` pipeline runs
   `catalog:release-tag` (tag `vX.Y.Z` on the head of the release MR), then the tag
   pipeline runs the image promotion, `catalog:release-provenance` and
   `catalog:gitlab-release`. Report the outcome honestly, with the failing log
   if any.

6. **Verify** the tag:

   ```sh
   git fetch --tags
   git -c gpg.ssh.allowedSignersFile=allowed_signers verify-tag vX.Y.Z
   ```

## When something fails

- `catalog:release` refuses: the log says why (main moved, a version already
  waits for its tag, another release MR is open, nothing to release). Fix the
  cause, then run the job of the latest `main` pipeline.
- The release MR pipeline is red: fix it on `main` with a normal MR, close the
  release MR, and click again.
- `catalog:release-tag` fails: retry the job once the cause is fixed (token,
  signing key, `allowed_signers`). It does nothing if the tag already exists.

## Manual signed path

To sign a release with the YubiKey instead, tag the head of the release MR
(the last commit of `release/vX.Y.Z`, not the merge commit) and push it before
`catalog:release-tag` runs, which waits for lint, tests and scans of the merge
pipeline:
`git tag -s vX.Y.Z -m "pki-toolbox vX.Y.Z" <release commit>` and
`git push origin vX.Y.Z`. CI sees the tag and does nothing; the release notes
say the tag carries a GPG signature.
