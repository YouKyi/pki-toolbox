# pki-toolbox

[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

A **self-hosted, 100 % client-side toolbox for PKI artefacts**: X.509
certificates, PKCS#10 CSRs, chains, CRLs, PKCS#7 and PKCS#12 bundles, raw
ASN.1, format conversion, fingerprints and certificate issuance. A
privacy-respecting, self-hostable replacement for online certificate decoders.

**Live demo:** <https://pki-toolbox.youkyi.net> (the demo is the same static
build you can self-host below; nothing you paste leaves your browser).

Every byte is parsed **inside your browser** with [`@peculiar/x509`](https://github.com/PeculiarVentures/x509)
and [`pkijs`](https://github.com/PeculiarVentures/PKI.js). Nothing is ever
uploaded, the backend only ships static files. You do not have to take that on
trust: see [Checkable privacy](#checkable-privacy) below.

## Tools

| Tool                    | Category   | Description                                                                                                        |
| ----------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Certificate decoder     | Decoding   | Every field of an X.509 certificate: subject, issuer, validity, SANs, key usage, fingerprints                      |
| CSR decoder             | Decoding   | Subject, public key, signature algorithm and requested extensions of a PKCS#10 request                             |
| Chain decoder           | Decoding   | Splits a concatenated PEM bundle into an ordered chain and verifies every issuer-to-subject link                   |
| CRL decoder             | Decoding   | Revoked entries, dates and revocation reasons                                                                      |
| PKCS#7 decoder          | Decoding   | Every certificate carried by a PKCS#7 / CMS bundle                                                                 |
| PKCS#12 decoder         | Decoding   | Opens password-protected `.p12` / `.pfx` files                                                                     |
| Fingerprints            | Inspection | SHA-1 / SHA-256 / SHA-512 of the DER                                                                               |
| ASN.1 viewer            | Inspection | Expandable tag/length/value tree of any DER artefact                                                               |
| Format conversion       | Conversion | PEM ↔ DER ↔ PKCS#7                                                                                                 |
| Self-signed certificate | Generation | Self-signed certificate and key pair (RSA / EC / Ed25519) via WebCrypto                                            |
| Sign from a CA          | Generation | Issues a certificate from an existing CA: new key pair or CSR, leaf or intermediate, with a ready-to-use fullchain |

The catalogue lives in a single registry (`src/lib/tools.ts`) that drives the
navbar and the home grid.

Around the tools themselves:

- **Paste anything on the home page.** The artefact is recognised by its bytes
  (PEM label or DER header, see `src/lib/pki/detect.ts`) and opens in the tool
  that reads it.
- **An artefact in the wrong tool says so** and offers the right one, carrying
  its content over. The handover happens in memory, never through the URL, so
  it stays out of history files, proxy logs and bookmark syncs.
- **"Same artefact in"** under a result carries it to the other tools that read
  it, so one paste answers several questions.
- A **verdict band** answers the question the tool exists for before any detail
  row, and the values that end up quoted in a ticket are one click to copy.
- Every tool takes a pasted artefact or an uploaded file, and ships a sample
  input so you can try it without one. `/` puts the caret in the input.

## Checkable privacy

The claim "it never leaves your browser" is verifiable from inside the page:

- Each input box carries a **Verify** panel that reads back the page's own
  `connect-src` directive from the policy it was served with, counts the
  requests able to carry data out since you pasted, and runs a live attempt the
  browser refuses in front of you, quoting the directive that blocked it.
- A pasted **private key is named and veiled**: the box says what it holds and
  that it has not left the page, with **Clear it** and **Show it anyway**.
  Nothing is decoded, transmitted or stored.
- Open your browser's network tab while decoding a certificate: you will not
  see a single request.

## Run it

Always run a pinned, immutable release tag (`vX.Y.Z`), never `latest`: a moving
tag cannot be audited or rolled back. For the strongest guarantee, pin the
image digest (`...@sha256:...`).

```sh
docker run -p 8080:8080 ghcr.io/youkyi/pki-toolbox:v2.2.0
```

Then open <http://localhost:8080>.

### Public images

Each release is published, under the same immutable `vX.Y.Z` tag, to:

| Registry                  | Image                        |
| ------------------------- | ---------------------------- |
| GitHub Container Registry | `ghcr.io/youkyi/pki-toolbox` |
| Docker Hub                | `youkyi/pki-toolbox`         |

```sh
docker pull ghcr.io/youkyi/pki-toolbox:v2.2.0   # or
docker pull youkyi/pki-toolbox:v2.2.0
```

### Self-host with Docker Compose

```yaml
services:
  pki-toolbox:
    image: ghcr.io/youkyi/pki-toolbox:v2.2.0
    ports:
      - '8080:8080'
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true
```

```sh
docker compose up -d
```

The repository ships a fully hardened `docker-compose.yml` (read-only root
filesystem, dropped capabilities, memory and CPU limits); use that file
directly rather than this minimal example.

The image is built from `nginx:alpine-slim`, weighs about 25 MB, listens on the
non-privileged port **8080** and runs as a **non-root** user.

## Local development

Requires **Node 24** (the version the image and CI build with) and **pnpm 11**.
The exact pnpm version is pinned by the `packageManager` field of
`package.json`, so `corepack enable` is enough to get it.

```sh
pnpm install
pnpm dev          # dev server on http://localhost:5173
pnpm test         # unit tests, single run (Vitest)
pnpm test:unit    # the same tests, in watch mode
pnpm test:e2e     # end-to-end tests (Playwright)
pnpm test:e2e:ui  # the same, in the Playwright UI
pnpm check        # svelte-check / TypeScript
pnpm lint         # Prettier + ESLint
pnpm format       # rewrite files with Prettier
pnpm build        # static build into ./build
pnpm preview      # serve ./build locally
```

### Building the Docker image

```sh
docker build -t pki-toolbox .
docker run -p 8080:8080 pki-toolbox
```

## How it works

- **SvelteKit 2** + **TypeScript**, built with `adapter-static` to plain
  HTML/JS: every route is prerendered and there is no Node runtime in
  production.
- **TailwindCSS** for styling, on the youkyi design system: light by default,
  dark as the signature theme (the choice is persisted).
- All parsing lives in pure, testable functions under `src/lib/pki/`, with no
  Svelte import: `parse.ts`, `chain.ts`, `crl.ts`, `pkcs7.ts`, `pkcs12.ts`,
  `asn1.ts`, `convert.ts`, `format.ts`, `pem.ts`, `oids.ts`, `detect.ts`,
  `generate.ts` and `sign.ts`. Each route under `src/routes/` is a thin UI
  shell around them.
- `@peculiar/x509` v2 builds its objects through tsyringe, which needs a
  Reflect metadata polyfill on the consumer side, so `@abraham/reflection` is
  imported ahead of it in every module that uses the library.
- PKCS#7 and PKCS#12 go through `pkijs`, whose Web Crypto engine is registered
  once in `src/lib/pki/engine.ts`.
- Unit tests live in `tests/pki/` (Vitest) and browser tests in `e2e/`
  (Playwright). Fixtures are real public roots (ISRG Root X1/X2) plus a
  generated EC chain and CSR, see `scripts/generate-fixtures.mjs`.

## Security posture

- **No network egress from the app.** The Content-Security-Policy is emitted by
  SvelteKit as a `<meta>` tag with `connect-src 'none'`; nginx adds
  `frame-ancestors 'none'`, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy: no-referrer`, a restrictive `Permissions-Policy` and the
  cross-origin isolation headers. The Vercel demo sends the same header set
  (see `vercel.json`).
- **Hostile-input limits.** Every decoder rejects an input over 4 MB, and the
  ASN.1 walker is bounded in node count and nesting depth, so a malformed
  artefact cannot hang the tab.
- **Hardened runtime.** nginx runs as a non-root user on port 8080; the shipped
  `docker-compose.yml` adds a read-only root filesystem, `cap_drop: ALL`,
  `no-new-privileges` and resource limits.
- **Supply chain.** Both base images are pinned to immutable digests kept
  current by Renovate. CI fails on a fixable HIGH/CRITICAL finding, both on the
  repository (`trivy fs`) and on the freshly built image, which is also
  rejected when its base OS is end-of-life, so a vulnerable image is never
  pushed. Licences are scanned in a separate, non-blocking pass.
- **Accessibility.** The interface meets WCAG 2.2 AA.

## Versioning & releases

This project follows [Semantic Versioning](https://semver.org/) and
[Conventional Commits](https://www.conventionalcommits.org/). Notable changes
are recorded in [`CHANGELOG.md`](./CHANGELOG.md). Contribution rules live in
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

### Cutting a release

1. In [`CHANGELOG.md`](./CHANGELOG.md), rename the `## [Unreleased]` heading to
   the new version with today's date, e.g. `## [1.2.3] - 2026-06-01`, add a
   fresh empty `## [Unreleased]` above it, and update the link references at
   the bottom of the file.
2. Bump `"version"` in `package.json` to the same number.
3. Commit on `main` (a conventional commit, e.g. `chore(release): 1.2.3`) and
   push.
4. Tag the commit and push the tag:
   ```sh
   git tag -a v1.2.3 -m "pki-toolbox v1.2.3"
   git push origin v1.2.3
   ```

### The pipeline

Lint, unit tests and end-to-end tests run on every push. The scan, build and
release stages come from the shared `YouKyi-Infra/ci-infrastructure/ci-catalog`
components (`trivy-scan`, `docker-build`, `gitlab-release`), pinned by version
in [`.gitlab-ci.yml`](./.gitlab-ci.yml).

A `vX.Y.Z` tag runs the whole chain: scan, image build, image scan, push of
`vX.Y.Z` to the GitLab registry and to the public mirrors (ghcr.io, Docker
Hub), then a **GitLab Release whose notes are the matching `## [X.Y.Z]` section
extracted from `CHANGELOG.md`** (an empty section fails the job rather than
publishing empty notes).

A push to `main` runs the same pipeline minus the release step, and the image
job runs only when a file affecting the build changed, so a docs- or
config-only push does not rebuild the image.

Dependencies are kept up to date by [Renovate](https://docs.renovatebot.com/),
which extends the shared `Renovate-Bot/renovate-config` preset
(see [`renovate.json`](./renovate.json)).

## License

[MIT](./LICENSE)
