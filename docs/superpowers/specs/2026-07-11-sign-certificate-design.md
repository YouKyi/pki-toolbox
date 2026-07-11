# Sign certificate from a CA — design

Date: 2026-07-11
Status: validated

## Goal

pki-toolbox can generate a self-signed certificate (optionally a CA), but cannot issue a
certificate *signed by* an existing CA. This tool closes the loop: paste a CA certificate
and its private key, get a signed leaf (or intermediate CA) certificate — entirely
client-side, nothing leaves the browser.

## Scope

Two issuance modes on a single new page:

- **Mode A — new key pair**: the tool generates the subject key pair (same algorithm
  choices as `generate-selfsigned`) and issues the certificate.
- **Mode B — sign a CSR**: the user pastes a PKCS#10 CSR; its public key is certified.
  Subject and DNS SANs are extracted from the CSR to pre-fill the form, but the form
  values win at signing time (the CA decides, the CSR proposes). No algorithm picker in
  this mode — the key is the CSR's.

The issued certificate can itself be a CA (checkbox "intermediate CA"), enabling full
root → intermediate → leaf hierarchies built inside the toolbox.

Out of scope for v1:

- Encrypted CA private keys (PKCS#8 `ENCRYPTED PRIVATE KEY`). Detected and rejected with
  an actionable error suggesting `openssl pkey -in encrypted.key -out clear.key`.
- CA persistence, serial tracking, issued-certificate registry (stateless philosophy).
- Non-DNS SAN types (mirrors `generate-selfsigned`).

## Architecture

### New module `src/lib/pki/sign.ts`

- `importCa(certPem: string, keyPem: string): Promise<CaContext>`
  - Parse the CA certificate with `@peculiar/x509` `X509Certificate`.
  - Reject encrypted PKCS#8 keys early (PEM label check) with the openssl hint.
  - Derive the WebCrypto import algorithm from the CA certificate's public key — this is
    independent of the generation picker's `ALGORITHMS`, so a pasted CA may use a key
    type the picker does not offer. Supported CA key types and signing algorithms:
    | CA key | Import algorithm | Signing algorithm |
    | --- | --- | --- |
    | RSA (rsaEncryption) | RSASSA-PKCS1-v1_5 / SHA-256 | RSASSA-PKCS1-v1_5 / SHA-256 |
    | EC P-256 | ECDSA P-256 | ECDSA / SHA-256 |
    | EC P-384 | ECDSA P-384 | ECDSA / SHA-384 |
    | EC P-521 | ECDSA P-521 | ECDSA / SHA-512 |
    | Ed25519 | Ed25519 | Ed25519 |
    Any other key type (including RSA-PSS keys, id-RSASSA-PSS OID) → clear error,
    out of scope for v1. Then `crypto.subtle.importKey('pkcs8', …)`.
  - Verify the private key matches the certificate via a sign/verify probe.
  - Surface a **non-blocking warning** when the CA certificate lacks
    `BasicConstraints cA=true`.
- `issueCertificate(ca: CaContext, opts): Promise<IssuedCertificate>`
  - Subject public key comes either from a freshly generated key pair (mode A) or from a
    verified CSR (mode B). `decodeCsr` does **not** verify the CSR signature, so
    `sign.ts` calls `Pkcs10CertificateRequest.verify()` itself before issuing.
  - Issued via `X509CertificateGenerator.create` with `issuer` = CA subject,
    `signingKey` = CA private key, signing algorithm per the CA-key table above.
  - Random positive 16-byte serial (shared helper).
  - Returns certificate PEM, private key PEM (mode A only) and a fullchain PEM
    (leaf + pasted CA certificate).
  - Surfaces a **non-blocking warning** when the requested validity extends beyond the
    CA certificate's `notAfter`.

### Refactor of `src/lib/pki/generate.ts`

Export the currently private helpers so `sign.ts` reuses them instead of duplicating:
`randomSerial`, `buildName`, `ALGORITHMS` (and its `AlgoSpec` type). No behaviour change.

### Reuse

- `decodeCsr` (`src/lib/pki/parse.ts`) pre-fills the form in mode B.
- PEM output block (copy/download/pre) currently an inline snippet in
  `generate-selfsigned/+page.svelte` is extracted to a shared
  `src/lib/components/PemOutput.svelte` used by both pages.

## Extensions on the issued certificate

| Extension | Value | Critical |
| --- | --- | --- |
| BasicConstraints | cA per "intermediate CA" checkbox | yes |
| KeyUsage | leaf: digitalSignature + keyEncipherment; CA: keyCertSign + cRLSign | yes |
| ExtendedKeyUsage | serverAuth + clientAuth (leaf only) | no |
| SubjectAlternativeName | DNS entries from the form | no |
| SubjectKeyIdentifier | from the subject public key | no |
| AuthorityKeyIdentifier | from the CA certificate's public key | no |

SKI/AKI are new to the codebase (generate-selfsigned does not emit them) and are required
for clean chain building.

## Page `/sign-certificate`

- Registered in `src/lib/tools.ts`, category `generate`, status `ready`.
- Block 1 — CA material: two `PemInput`s (CA certificate, CA private key). Once both are
  valid, show the CA's CN and validity window; show the cA=false warning here.
- Block 2 — subject: toggle "New key pair" / "Sign a CSR".
  - New key pair: CN (required), O, C, key algorithm, validity days, DNS SANs,
    "intermediate CA" checkbox — same layout as `generate-selfsigned`.
  - Sign a CSR: `PemInput` for the CSR; on decode, CN/O/C/SANs are copied into the same
    editable fields.
- Action button → outputs: certificate PEM, private key PEM (mode A only, with the
  existing private-key warning `Alert`), fullchain PEM. Each via `PemOutput`.
- UI copy in English, matching the rest of the app.

## Error handling

Actionable `Alert variant="error"` for: encrypted CA key, key/certificate mismatch,
unparsable PEM, invalid CSR signature, WebCrypto key-generation failure.
`Alert variant="warn"` (non-blocking) for: CA without cA=true, validity beyond the CA's.

## Testing

- Unit — `tests/pki/sign.test.ts`:
  - Issue a leaf from a generated CA; verify the signature against the CA public key,
    issuer/subject linkage, and AKI keyIdentifier == SHA-1 of the CA public key (the CA
    produced by `generate-selfsigned` carries no SKI extension, so AKI cannot be compared
    to one).
  - CSR mode: subject/SAN pre-fill extraction, signature verification, issuance.
  - Intermediate CA issuance (cA=true, keyCertSign).
  - Errors: encrypted key rejected, key/cert mismatch, corrupted CSR.
- E2e — Playwright: happy path through the UI (generate a CA with the existing tool,
  paste it, sign a leaf, assert the three PEM outputs).
