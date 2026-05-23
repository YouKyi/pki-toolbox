# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Dependency bumps are managed by [Renovate](https://docs.renovatebot.com/) and
are not listed individually here.

## [Unreleased]

### Added

- Release images are now published to public registries on every `vX.Y.Z` tag,
  under the same immutable tag: GitHub Container Registry
  (`ghcr.io/youkyi/pki-toolbox`) and Docker Hub (`youkyi/pki-toolbox`).
- A public demo of the static build is deployed on Vercel at
  <https://pki-toolbox.youkyi.net>, driven by a `vercel.json` config.
- OCI image labels (`org.opencontainers.image.*`) so the published image is
  self-describing (source repository, licence, revision, build date).

## [1.0.4] - 2026-05-23

### Changed

- Upgraded `@peculiar/x509` to v2. Its v2 line routes object construction
  through tsyringe, which requires a Reflect metadata polyfill on the
  consumer side, so `@abraham/reflection` (a lightweight `reflect-metadata`
  equivalent) is now imported ahead of the library in every module that uses
  it. Behaviour is unchanged for users.

## [1.0.3] - 2026-05-19

### Fixed

- The desktop top bar and the sidebar brand block now share the same height,
  so their bottom borders line up into one continuous line instead of a
  visible step across the top of the page.
- Empty-value placeholders in the certificate, CSR, CRL and PKCS#7 views were
  showing a stray `, ` instead of a `-`.

### Changed

- Accessibility: the interface now meets WCAG 2.2 AA. Light-theme low-contrast
  text was darkened, a skip link and a focusable main landmark were added, the
  mobile navigation drawer is a proper modal dialog (focus trap, Escape to
  close, focus return, surrounding content inert), the theme toggle announces
  its action, results and errors are announced through live regions, the
  ASN.1 tree exposes expansion state, navigation landmarks are labelled, the
  required form fields are marked as such, and a visible focus style plus a
  `prefers-reduced-motion` rule were added.
- Hardening: the Content-Security-Policy `connect-src` directive is now
  `none`, the app makes no network requests at all.
- Robustness: ASN.1 parsing reports trailing bytes and an honest maximum
  nesting depth marker, and every decoder rejects an input larger than 4 MB.

### Security

- Both Docker base images (`node:20-alpine`, `nginx:1.31-alpine-slim`) are now
  pinned to immutable digests, kept current by Renovate.

## [1.0.2] - 2026-05-19

### Changed

- The interface now displays the product name as "PKI-Toolbox".
- CI: the `build`, `docker` and `scan` jobs run only when a build-affecting
  file changes, so a docs- or config-only push no longer rebuilds the image.
- CI: GitLab Release notes are now generated from this changelog.
- Renovate extends the shared `Renovate-Bot/renovate-config` preset instead of
  duplicating its settings.

### Added

- `CONTRIBUTING.md` and a step-by-step release guide in the README.

## [1.0.1] - 2026-05-19

### Security

- Rebuilt the runtime image on `nginx:1.31-alpine-slim` (nginx 1.31, Alpine
  3.23), which clears 19 HIGH/CRITICAL OS-package CVEs carried by the stale
  Alpine 3.21 base of the 1.0.0 image.
- Added a Trivy container-scan stage to the CI pipeline: a HIGH or CRITICAL
  vulnerability with an available fix now fails the build, so a vulnerable
  image can no longer be released.

## [1.0.0] - 2026-05-19

### Added

- X.509 certificate decoder, subject, issuer, validity, SAN, key usage,
  extended key usage, extensions and DER fingerprints.
- PKCS#10 CSR decoder, subject, public key, signature and requested extensions.
- Certificate chain decoder, ordered chain with issuer ↔ subject verification.
- Fingerprint tool, SHA-1 / SHA-256 / SHA-512 of a certificate's DER.
- CRL decoder, revoked entries, dates and revocation reasons.
- PKCS#7 / CMS bundle decoder, extracts every embedded certificate.
- PKCS#12 decoder, opens password-protected `.p12` / `.pfx` files.
- ASN.1 viewer, expandable tag/length/value tree of any DER artefact.
- Format converter, PEM ↔ DER ↔ PKCS#7.
- Self-signed certificate generator, RSA, EC and Ed25519 keys, via WebCrypto.
- Static SvelteKit build served by nginx (non-root, port 8080); Docker image
  under 25 MB.
- Vitest unit tests and a GitLab CI pipeline (lint, test, build, docker).

[Unreleased]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v1.0.4...main
[1.0.4]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v1.0.3...v1.0.4
[1.0.3]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v1.0.2...v1.0.3
[1.0.2]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v1.0.1...v1.0.2
[1.0.1]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v1.0.0...v1.0.1
[1.0.0]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/tags/v1.0.0
