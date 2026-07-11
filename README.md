# pki-toolbox

[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

A **self-hosted, 100 % client-side decoder for PKI artefacts**, X.509 certificates,
PKCS#10 CSRs, certificate chains and DER fingerprints. A privacy-respecting,
self-hostable replacement for online certificate decoders.

**Live demo:** <https://pki-toolbox.youkyi.net> (the demo is the same static
build you can self-host below; nothing you paste leaves your browser).

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
| Sign from a CA      | ✅ ready | Issue a cert from a CA: new key or CSR, leaf/intermediate   |

## Run it

Always run a pinned, immutable release tag (`vX.Y.Z`), never `latest`: a moving
tag cannot be audited or rolled back. For the strongest guarantee, pin the
image digest (`...@sha256:...`).

```sh
docker run -p 8080:8080 ghcr.io/youkyi/pki-toolbox:v1.0.4
```

Then open <http://localhost:8080>.

### Public images

Each release is published, under the same immutable `vX.Y.Z` tag, to:

| Registry                  | Image                        |
| ------------------------- | ---------------------------- |
| GitHub Container Registry | `ghcr.io/youkyi/pki-toolbox` |
| Docker Hub                | `youkyi/pki-toolbox`         |

```sh
docker pull ghcr.io/youkyi/pki-toolbox:v1.0.4   # or
docker pull youkyi/pki-toolbox:v1.0.4
```

### Self-host with Docker Compose

```yaml
services:
  pki-toolbox:
    image: ghcr.io/youkyi/pki-toolbox:v1.0.4
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
filesystem, dropped capabilities, resource limits); use that file directly
rather than this minimal example.

The image is built from `nginx:alpine-slim`, weighs under 25 MB, listens on the
non-privileged port **8080** and runs as a **non-root** user.

## Local development

Requires **Node 24** and **pnpm**.

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
- **TailwindCSS** for styling, on the youkyi design system: light by default, dark as the signature theme (the choice is persisted).
- All parsing lives in pure, testable functions under `src/lib/pki/`
  (`parse.ts`, `chain.ts`, `format.ts`, `pem.ts`, `oids.ts`).
- The tool catalogue is a single registry (`src/lib/tools.ts`) that drives the
  sidebar and the home page grid.
- Test fixtures are real public roots (ISRG Root X1/X2) plus a generated EC
  chain and CSR, see `scripts/generate-fixtures.mjs`.

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

The `vX.Y.Z` tag triggers the CI pipeline, which runs lint, test and the
supply-chain filesystem scan, then builds the image via the Dockerfile (Trivy
image scan included, fails on a fixable HIGH/CRITICAL CVE), pushes
`<registry>/pki-toolbox:vX.Y.Z`, and publishes a **GitLab Release whose notes
are the matching `## [X.Y.Z]` section extracted from `CHANGELOG.md`**.

A push to `main` runs the same pipeline minus the release step. The lint, test
and supply-chain jobs run on every push; the `docker` job (build, image scan,
push) runs only when a file affecting the build changed, so a docs- or
config-only push does not rebuild the image.

Dependencies are kept up to date by [Renovate](https://docs.renovatebot.com/),
which extends the shared `Renovate-Bot/renovate-config` preset
(see [`renovate.json`](./renovate.json)).

## License

[MIT](./LICENSE)
