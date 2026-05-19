# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Dependency bumps are managed by [Renovate](https://docs.renovatebot.com/) and
are not listed individually here.

## [Unreleased]

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

[Unreleased]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v1.0.1...main
[1.0.1]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v1.0.0...v1.0.1
[1.0.0]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/tags/v1.0.0
