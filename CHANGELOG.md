# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Dependency bumps are managed by [Renovate](https://docs.renovatebot.com/) and
are not listed individually here.

## [Unreleased]

## [2.2.0] - 2026-08-16

### Added

- **The privacy claim is now checkable, not merely stated.** Every input box
  carries the claim at the top, where the artefact is handed over, with a
  **Verify** panel that shows the page's own `connect-src` directive read back
  from the policy it was served with, counts the requests able to carry data
  out since the paste, and offers a live attempt the browser refuses in front
  of you, quoting the directive it names itself.
- **A pasted private key is named and covered.** Whatever the tool, key
  material is hidden behind a veil that says what is in the box and that it has
  not left the page, with **Clear it** and **Show it anyway**. The signing page
  keeps the veil for its CA key, without the warning tone, because there a key
  is expected. Nothing is decoded, nothing is transmitted, nothing is stored.
- **An artefact that lands in the wrong tool says so and offers the right
  one**, carrying its content over. The artefact travels in memory and never in
  a URL, so it stays out of history files, proxy logs and bookmark syncs. A
  keystore dropped on the certificate decoder is recognised by its bytes rather
  than armoured as a certificate and failed deep in the parser.
- **The home page leads with a paste box.** Paste any artefact and it opens in
  the tool that reads it; the grid of tools stays underneath as the browse
  path, with the certificate decoder taking the full row.
- **A "Same artefact in" line under every result** carries the same artefact to
  the other tools that read it, so one paste answers several questions.
- **Copy on the values that get quoted in a ticket**: subject, issuer, validity
  dates and public key, plus **Copy every field** for the whole card.
- **`/` puts the caret in the input** from anywhere on the page, and reopens
  the folded editor first when the artefact is already decoded.
- **A throwaway CA can be generated on the signing page** to try the tool: a
  P-256 pair valid ten years, generated in the page, stored nowhere.
- A verdict band at the top of every decoded artefact, answering the question
  that tool exists for before any detail row: a certificate answers its expiry
  with an **absolute date** (the relative day count trails as context), a CRL
  answers whether it is still current or overdue, a chain answers whether it
  holds, a keystore and a PKCS#7 bundle answer what they carry, and a signing
  request answers which key it asks for. On a successful decode the input folds
  into a one-line recap, so the answer takes back the viewport the pasted PEM
  was holding, and the result region takes focus.
- The threshold pattern (a localised, faded 1/Φ² hatch) marking the shift from
  the chrome to the page content, and a press-feedback affordance on
  interactive controls.

### Changed

- Realigned the interface on the **youkyi DA v2** (brand master 1.0.0). The
  radius is now the default shape: the v1 "radius: 0" rule is gone and the
  charter's scale (9/12/14/16/24px, tied to control height) drives every
  control, while the 1/Φ² slope goes back to being a signature: it is no
  longer applied to a single button, field or badge. Elevation is carried by
  value (a three-plane surface ramp plus a two-step text ramp) with real
  drop shadows, and dark-mode hairlines became translucent veils that
  recompute against the surface they border instead of fixed hexes.
- The navigation bar and its dropdown panels are the site's floating chrome,
  the only surfaces the charter renders in glass.
- The orange accent is restricted to its five sanctioned uses. Icon chips,
  badges and alerts lost their tinted fills: they are neutral tokens whose
  meaning is carried by a 6px status dot, an icon and their label. There is
  no red outside the terminal any more: an error is signalled by the orange
  and its wording, and the compliance green is the oklch tone tuned to the
  same lightness as the accent.
- PEM output is rendered as the charter's **terminal block** (locked palette,
  dark even on a light page), and the favicon was redrawn without the v1 cut
  corner.
- **A block that carries a state is ringed in the accent** instead of wearing a
  coloured rail down one side.
- **The format conversion page reads like every decoder**: a verdict band, then
  the encodings in the same terminal block the generation tools use, with the
  two DER forms folded onto their bar since the PEM is the form you reread and
  the DER the one you take away. Downloading DER hands over the bytes rather
  than a transcription of them.
- **A serial number is shown in hexadecimal only.** The decimal form, up to
  forty digits of it, used to trail it in the same cell.
- A decoding failure leads with what to do about it; the parser's own message
  stays underneath.

### Fixed

- **The certificate decoder reads a server bundle**, a private key followed by
  its certificate, which is what `openssl` writes and what gets pasted. It used
  to fail on the key.
- The footer's signature slope is held at 21 degrees at every width; it used to
  flatten to about 4 degrees on a wide window.
- Dark theme contrast: six measured failures between 2.45:1 and 3.48:1 are
  gone, and the navigation logo plate no longer disappears against the night
  ground.
- Screen-reader wiring: a decode announces one sentence instead of reciting
  forty rows, a rejected file is announced, an invalid field is marked as such
  and tied to its message, and every result card is named.
- Every reachable target is at least 44x44, including the four copy buttons
  that sat at 23x23.
- The theme follows the operating system until a choice is made, and the choice
  is a three-mode control (Auto, Light, Dark) rather than a toggle that cannot
  express "follows the system".
- A certificate with 200 alternative names no longer renders 200 orange dots.
- **The navigation bar behaves one way**: the theme menu opens on hover like the
  tool folders, and neither closes on the trigger that opened it. Reaching the
  theme menu used to cross an 8px dead zone that dismissed it.
- **Edit input** now puts the caret back in the field; it was focusing a field
  the framework had not rendered yet.

### Removed

- The first-load splash screen. The site is a prerendered static build with
  self-hosted fonts and no network calls, so it paints on the first frame; the
  loader was holding that budget for up to 1.6 s, hiding the page from screen
  readers, and reappearing in every new tab.

## [2.1.0] - 2026-07-11

### Added

- **Sign from a CA**, a new generation tool (`/sign-certificate`): paste a CA
  certificate and its unencrypted PKCS#8 private key, and issue a certificate
  signed by that CA, entirely in the browser: the CA key is imported
  non-extractable into WebCrypto and never leaves the page. Two modes: generate
  a new key pair, or sign a pasted PKCS#10 CSR (its subject and DNS SANs
  pre-fill the form, the form wins; the CSR signature is verified before
  issuance, proof of possession). The issued certificate can itself be an
  intermediate CA, enabling full root → intermediate → leaf hierarchies. Issued
  certificates carry Subject Key Identifier and Authority Key Identifier
  extensions, and a ready-to-serve fullchain (certificate + CA) is offered
  alongside the certificate and private key.
- Guardrails on CA import: encrypted keys are rejected with an `openssl pkey`
  hint, a key that does not match the certificate is refused (sign/verify
  probe), unsupported key types (including RSA-PSS) are refused, a certificate
  without `cA=true` triggers a warning, and a requested validity outliving the
  CA certificate is flagged.

### Changed

- The PEM result block (copy/download) of the generation tools is now a shared
  component; the paste area's Decode button only renders for tools that decode
  on the spot.

## [2.0.0] - 2026-07-11

Full visual and navigational rework on the youkyi design system. The decoding
engine is untouched: everything still runs 100% client-side, and no data ever
leaves the browser.

### Added

- The youkyi design system: matte neutrals with a single orange accent, fonts
  self-hosted (Poppins, Inter, IBM Plex Mono, Space Grotesk; no third-party
  request), sharp corners, and the signature oblique cuts.
- A first-load loader (shown once per session) and a branded footer linking to
  <https://youkyi.fr> and the source repository.
- A Playwright end-to-end suite run against the real static build that nginx
  serves: `smoke` (home, loader, navigation, theme persistence), `tools`
  (certificate, CSR, chain, fingerprints, conversion and generation via each
  page's "Load an example", plus the no-network contract), and `responsive`,
  a guard that decodes every tool at 390px and fails if any element renders
  content wider than its box. A new GitLab `e2e` stage runs them on every
  pipeline and reports to the Tests tab.

### Changed

- **Navigation**: the sidebar is replaced by a navbar whose four category
  dropdowns free the full content width for the tools: PEM blocks, ASN.1 trees
  and CRL tables are wide.
- **Light is now the default theme**; dark remains the signature one. The
  choice is persisted and applied before the first paint, so the theme no
  longer flashes on load.

### Fixed

- The primary actions (Decode, Generate) had **no visible keyboard focus at
  all** (WCAG 2.4.7): a `clip-path` clips an element's outline and outer ring,
  so the cut buttons showed nothing. They now take an inset ring, painted
  inside the shape.
- Contrast: white on the accent was 4.41:1, below AA; the call-to-action
  surfaces move to the accessible accent token and gain the dark-theme variant
  they lacked.
- Long values (hex fingerprints, distinguished names, serial numbers) were
  **silently clipped and unreadable on phones**: a `1fr` grid track and a
  grid/flex item both resolve `min-width` to `auto`, so an unbreakable value
  could not shrink, and since the certificate card is `overflow-hidden`, the
  overflow was clipped rather than scrollable.
- Navbar accessibility: the current page is marked with `aria-current` instead
  of colour alone, the misleading `menu`/`menuitem` roles are gone (they
  promised arrow-key navigation that was never implemented), Escape returns
  focus to the trigger, and the mobile menu is capped so its last categories
  stay reachable in landscape.
- The pointer cursor is restored on interactive controls (Tailwind v4 dropped
  it), and native form controls take the brand accent colour instead of the
  browser blue.

## [1.1.0] - 2026-05-23

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

[Unreleased]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v2.2.0...main
[2.2.0]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v2.1.0...v2.2.0
[2.1.0]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v2.0.0...v2.1.0
[2.0.0]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v1.1.0...v2.0.0
[1.1.0]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v1.0.4...v1.1.0
[1.0.4]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v1.0.3...v1.0.4
[1.0.3]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v1.0.2...v1.0.3
[1.0.2]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v1.0.1...v1.0.2
[1.0.1]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/compare/v1.0.0...v1.0.1
[1.0.0]: https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/tags/v1.0.0
