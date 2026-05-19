# pki-toolbox

[![pipeline status](https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/badges/main/pipeline.svg)](https://gitlab.int.youkyi.net/YouKyi-Infra/pki-toolbox/-/pipelines)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

A **self-hosted, 100 % client-side decoder for PKI artefacts**, X.509 certificates,
PKCS#10 CSRs, certificate chains and DER fingerprints. A privacy-respecting,
self-hostable replacement for online certificate decoders.

Every byte is parsed **inside your browser** with [`@peculiar/x509`](https://github.com/PeculiarVentures/x509).
Nothing is ever uploaded, the backend only ships static files. Open your
browser's network tab while decoding a certificate: you will not see a single
request.

## Tools

| Tool                | Status   | Description                                                 |
| ------------------- | -------- | ----------------------------------------------------------- |
| Certificate decoder | ✅ ready | All fields of an X.509 certificate                          |
| CSR decoder         | ✅ ready | Subject, key and requested extensions of a PKCS#10 request  |
| Chain decoder       | ✅ ready | Ordered chain with issuer ↔ subject verification            |
| Fingerprint         | ✅ ready | SHA-1 / SHA-256 / SHA-512 of the DER                        |
| CRL decoder         | ✅ ready | Revoked entries, dates and reasons of a CRL                 |
| PKCS#7 decoder      | ✅ ready | Every certificate embedded in a PKCS#7 / CMS bundle         |
| PKCS#12 decoder     | ✅ ready | Opens password-protected `.p12` / `.pfx` files              |
| ASN.1 viewer        | ✅ ready | Expandable tag/length/value tree of any DER artefact        |
| Format convert      | ✅ ready | PEM ↔ DER ↔ PKCS#7 conversion                               |
| Self-signed cert    | ✅ ready | Generate a self-signed cert + key pair (RSA / EC / Ed25519) |

## Run it

Always run a pinned, immutable release tag (`vX.Y.Z`), never `latest`: a moving
tag cannot be audited or rolled back. For the strongest guarantee, pin the
image digest (`...@sha256:...`).

```sh
docker run -p 8080:8080 <registry>/pki-toolbox:v1.0.1
```

Then open <http://localhost:8080>.

### Self-host with Docker Compose

```yaml
services:
  pki-toolbox:
    image: <registry>/pki-toolbox:v1.0.1
    ports:
      - '8080:8080'
    restart: unless-stopped
```

```sh
docker compose up -d
```

The image is built from `nginx:alpine-slim`, weighs under 25 MB, listens on the
non-privileged port **8080** and runs as a **non-root** user.

## Local development

Requires **Node 20** and **pnpm**.

```sh
pnpm install
pnpm dev        # dev server on http://localhost:5173
pnpm test       # unit tests (Vitest)
pnpm check      # svelte-check / TypeScript
pnpm lint       # Prettier + ESLint
pnpm build      # static build into ./build
```

### Building the Docker image

```sh
docker build -t pki-toolbox .
docker run -p 8080:8080 pki-toolbox
```

## How it works

- **SvelteKit 2** + **TypeScript**, built with `adapter-static` to plain
  HTML/JS, there is no Node runtime in production.
- **TailwindCSS** for styling, dark mode by default.
- All parsing lives in pure, testable functions under `src/lib/pki/`
  (`parse.ts`, `chain.ts`, `format.ts`, `pem.ts`, `oids.ts`).
- The tool catalogue is a single registry (`src/lib/tools.ts`) that drives the
  sidebar, the home page and the "coming soon" pages.
- Test fixtures are real public roots (ISRG Root X1/X2) plus a generated EC
  chain and CSR, see `scripts/generate-fixtures.mjs`.

## Versioning & releases

This project follows [Semantic Versioning](https://semver.org/) and
[Conventional Commits](https://www.conventionalcommits.org/). Notable changes
are recorded in [`CHANGELOG.md`](./CHANGELOG.md).

To cut a release, move the `Unreleased` entries in the changelog under a new
version heading, then tag the commit:

```sh
git tag -a v1.2.3 -m "v1.2.3"
git push origin v1.2.3
```

A `vX.Y.Z` tag triggers the CI `release` stage, which builds and pushes the
matching container image (`<registry>/pki-toolbox:vX.Y.Z`) and publishes a
GitLab Release.

Dependencies are kept up to date by [Renovate](https://docs.renovatebot.com/);
its behaviour is configured in [`renovate.json`](./renovate.json).

## License

[MIT](./LICENSE)
