# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: the **enterprise system / infrastructure administrator**. They open
pki-toolbox mid-incident or mid-deployment to debug an internal PKI, a TLS chain
or a client certificate, typically in a context where pasting a certificate
into a third-party website is forbidden by policy, or where the artefact itself
is sensitive.

The same tools serve the maintainer's own operational work (step-ca, Traefik,
Rudder) and, by extension, the clients whose infrastructure he runs. Developers,
DevOps engineers and auditors are plausible secondary audiences but were not
confirmed as design drivers.

## Product Purpose

Decode and inspect PKI artefacts (X.509 certificates, PKCS#10 CSRs,
certificate chains, CRLs, PKCS#7/CMS bundles, PKCS#12 keystores, raw ASN.1),
and generate self-signed or CA-signed certificates, entirely inside the
browser. It exists as a privacy-respecting, self-hostable replacement for online
certificate decoders, which require uploading the very artefacts an
administrator is not allowed to upload.

Success: an administrator who cannot use an online decoder can still get the
answer in seconds, and can prove to a security reviewer that nothing left the
machine.

## Positioning

The **no-network contract** is the mechanism, not a claim: parsing runs on
WebCrypto and `@peculiar/x509` in the page, the CSP declares `connect-src
'none'`, fonts are self-hosted, and the backend only ever serves static files.
Opening the browser's network tab while decoding shows zero requests: the
proof is reproducible by the user, not asserted by the vendor. A hosted
competitor cannot copy this truthfully, because their product is the upload.

## Operating Context

- Used from a workstation or a jump host, often during an incident or a
  deployment window, alongside `openssl`, `step-ca`, Traefik and internal CAs.
- Artefacts arrive by copy-paste from a terminal, or as a file dragged in
  (`.pem`, `.crt`, `.der`, `.p12`, `.pfx`).
- Frequently run self-hosted on an internal network, sometimes air-gapped, from
  a pinned container image; a public demo exists at
  <https://pki-toolbox.youkyi.net> serving the exact same static build.
- Deployment expects immutable release tags (`vX.Y.Z`) or pinned digests, never
  a moving tag, so a deployed version can be audited and rolled back.

## Capabilities and Constraints

**Capabilities**, eleven tools, all shipped: certificate decoder, CSR decoder,
chain decoder (ordered, with issuer↔subject verification), fingerprints
(SHA-1/256/512), CRL decoder, PKCS#7 decoder, PKCS#12 decoder (password
protected), ASN.1 viewer, format conversion (PEM ↔ DER ↔ PKCS#7), self-signed
certificate generation (RSA / EC / Ed25519), and issuance from an existing CA
(new key pair or pasted CSR, leaf or intermediate, with SKI/AKI extensions and a
ready-to-serve fullchain).

**Durable constraints future work must preserve** (all four confirmed):

1. **Zero network requests.** 100% client-side, `connect-src 'none'`,
   self-hosted fonts, no third-party runtime dependency. The central contract of
   the product; any feature that would need a backend is out of bounds.
2. **Self-hostable and static.** A prerendered SvelteKit build (adapter-static,
   `prerender = true`) served by nginx as a non-root user in a container, with
   pinned image digests. No Node runtime in production, ever.
3. **English interface.** UI and documentation stay in English for
   international reach, even though the project's working language is French.
4. **Accessibility and responsiveness are held.** WCAG AA targeted, focus always
   visible, colour never the sole carrier of meaning, and an end-to-end guard
   that fails the pipeline if any element renders content wider than its box at
   390px.

Private key material imported into WebCrypto is non-extractable and never
leaves the page, a property to preserve in any future generation or signing
feature.

## Brand Commitments

- Published under the **youkyi** personal brand (legal entity: AGASSEAU
  Alexandre, auto-entreprise); the footer links to <https://youkyi.fr> and to
  the source repository.
- The project serves **two goals of equal weight**: being a genuinely useful
  open-source tool, and standing as public proof of youkyi's infrastructure and
  defensive-security competence. Any decision must serve both: utility is
  never sacrificed for showcase, and polish is never treated as optional.
- The interface follows the youkyi brand master (`brand.md`), currently DA v2:
  matte neutrals, a single orange accent restricted to five uses, radius as the
  default shape, the 1/Φ² slope as a signature only, elevation carried by value.
  Self-hosted OFL fonts (Poppins, Inter, IBM Plex Mono, Space Grotesk).
- Voice: an engineer explaining to another engineer: calm confidence, show
  rather than assert, state limits plainly, no marketing filler.

## Evidence on Hand

- Working software: all eleven tools ship and each page carries a real "Load an
  example" artefact.
- The no-network claim is verifiable live in the browser's network tab, and is
  additionally covered by an end-to-end test asserting the contract.
- Test suite: 95 unit tests over the PKI layer, plus a Playwright suite run
  against the real static build (smoke, per-tool decoding, responsive guard).
- Public images on GHCR and Docker Hub; MIT licence; public demo.
- **Not on hand, and not to be fabricated:** customer testimonials, user counts,
  download or adoption figures, third-party audits, benchmarks, security
  certifications, or any claim of commercial deployment.

## Product Principles

1. **The proof beats the promise.** Every privacy claim must be verifiable by
   the user in under a minute; if it cannot be shown, it is not claimed.
2. **No backend, no exception.** A feature that cannot run in the page does not
   ship. This constraint defines the product rather than limiting it.
3. **Useful under pressure.** The user arrives mid-incident: an answer in
   seconds, no signup, no configuration, no tutorial.
4. **Utility and craft carry equal weight.** The tool must serve the
   ecosystem and stand as evidence of the maintainer's competence; neither
   justifies neglecting the other.
5. **Deployable by someone who audits what they deploy.** Immutable tags,
   pinned digests, non-root container, hardened headers. The operator running
   it is the same kind of person as the user using it.

## Accessibility & Inclusion

WCAG AA is the internal target, with AAA on body text, an engineering practice,
not a published commitment. Enforced in practice: visible focus rings, reduced
motion honoured, meaning never carried by colour alone (status is doubled by an
icon and a label), and a responsive guard at 390px in the end-to-end suite.
