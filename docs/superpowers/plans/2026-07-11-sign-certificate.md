# Sign Certificate From a CA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New `/sign-certificate` tool: paste a CA certificate + private key, issue a signed leaf or intermediate CA certificate (new key pair or pasted CSR) — 100 % client-side.

**Architecture:** A new `src/lib/pki/sign.ts` module (CA import + issuance via `@peculiar/x509` `X509CertificateGenerator.create`) reusing helpers exported from `generate.ts`; a new SvelteKit route `/sign-certificate` registered in `tools.ts`; a shared `PemOutput.svelte` component extracted from `generate-selfsigned`.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), TypeScript, `@peculiar/x509` v2 (+ `@abraham/reflection` polyfill), WebCrypto, Tailwind 4, Vitest 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-11-sign-certificate-design.md` — read it first.

## Global Constraints

- Branch: `feat/sign-certificate`, MR !126, issue #11. Commit messages: Conventional Commits, `Refs #11` in the body.
- **NEVER add `Co-Authored-By`, `Claude-Session`, or any "Generated with Claude Code" mention to commits, MR or issues.**
- Toolchain: Node 24 via nvm, no global pnpm — prefix every package command with `corepack`: `corepack pnpm <cmd>`. Run `corepack pnpm install` once before anything.
- UI copy in English (matches the rest of the app). Code comments in English.
- `@peculiar/x509` v2 needs `import '@abraham/reflection';` as the FIRST import of any module that uses it.
- Vitest runs in Node (WebCrypto available via `globalThis.crypto`). Test command: `corepack pnpm vitest --run tests/pki/sign.test.ts`. Full gate: `corepack pnpm test && corepack pnpm check && corepack pnpm lint`.
- Supported CA key types (import + signing algorithm): RSA (rsaEncryption) → RSASSA-PKCS1-v1_5/SHA-256; EC P-256 → ECDSA/SHA-256; P-384 → ECDSA/SHA-384; P-521 → ECDSA/SHA-512; Ed25519 → Ed25519. Anything else (incl. RSA-PSS) → clear error.

---

### Task 1: Export shared helpers from `generate.ts`

**Files:**

- Modify: `src/lib/pki/generate.ts`
- Test: existing `tests/pki/v2.test.ts` (no new test — pure visibility refactor, no behaviour change)

**Interfaces:**

- Produces: `export const ALGORITHMS: Record<KeyAlgorithmChoice, AlgoSpec>`, `export type AlgoSpec`, `export function randomSerial(crypto: Crypto): string`, `export function buildName(opts: Pick<GenerateOptions, 'commonName' | 'organization' | 'country'>): JsonName`, `export function webCrypto(): Crypto` — all consumed by Task 2/3.

- [ ] **Step 1: Make the helpers exported**

In `src/lib/pki/generate.ts`, add `export` to the declarations of `AlgoSpec` (type), `ALGORITHMS`, `webCrypto`, `randomSerial`, and `buildName`. Narrow `buildName`'s parameter so callers don't need a full `GenerateOptions`:

```ts
export type AlgoSpec = {
	generate: RsaHashedKeyGenParams | EcKeyGenParams | { name: 'Ed25519' };
	sign: { name: string; hash?: string };
};

export const ALGORITHMS: Record<KeyAlgorithmChoice, AlgoSpec> = {/* unchanged body */};

export function webCrypto(): Crypto {
	/* unchanged body */
}

/** A random, positive 16-byte serial number as a hex string. */
export function randomSerial(crypto: Crypto): string {
	/* unchanged body */
}

export function buildName(
	opts: Pick<GenerateOptions, 'commonName' | 'organization' | 'country'>
): JsonName {
	/* unchanged body */
}
```

No other change: bodies and the `generateSelfSigned` call sites stay identical.

- [ ] **Step 2: Verify nothing broke**

Run: `corepack pnpm install && corepack pnpm test && corepack pnpm check`
Expected: all existing tests PASS, svelte-check clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pki/generate.ts
git commit -m "refactor(pki): export key/name/serial helpers for reuse

Refs #11"
```

---

### Task 2: `sign.ts` — `importCa`

**Files:**

- Create: `src/lib/pki/sign.ts`
- Create: `tests/pki/sign.test.ts`

**Interfaces:**

- Consumes: `webCrypto` from `$lib/pki/generate`, `pemToDer` from `$lib/pki/pem` (`pemToDer(pem: string): Uint8Array`, no label argument).
- Produces: `export type CaContext = { cert: X509Certificate; key: CryptoKey; signingAlgorithm: { name: string; hash?: string }; warnings: string[] }`, `export async function importCa(certPem: string, keyPem: string): Promise<CaContext>` — consumed by Task 3/4 and the page (Task 6).

- [ ] **Step 1: Write the failing tests**

Create `tests/pki/sign.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateSelfSigned } from '$lib/pki/generate';
import { importCa } from '$lib/pki/sign';

/** Generate a fresh CA (cert + key PEM) with the existing generator. */
async function makeCa(
	keyAlgorithm: 'ec-p256' | 'rsa-2048' | 'ed25519' = 'ec-p256',
	validityDays = 3650
) {
	return generateSelfSigned({
		commonName: 'sign.test CA',
		keyAlgorithm,
		validityDays,
		sans: [],
		isCa: true
	});
}

describe('importCa', () => {
	it('imports an EC CA and derives its signing algorithm', async () => {
		const ca = await makeCa('ec-p256');
		const ctx = await importCa(ca.certificatePem, ca.privateKeyPem);
		expect(ctx.signingAlgorithm).toEqual({ name: 'ECDSA', hash: 'SHA-256' });
		expect(ctx.warnings).toHaveLength(0);
		expect(ctx.cert.subject).toContain('sign.test CA');
	});

	it('imports an RSA CA', async () => {
		const ca = await makeCa('rsa-2048');
		const ctx = await importCa(ca.certificatePem, ca.privateKeyPem);
		expect(ctx.signingAlgorithm).toEqual({ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' });
	});

	it('imports an Ed25519 CA', async () => {
		const ca = await makeCa('ed25519');
		const ctx = await importCa(ca.certificatePem, ca.privateKeyPem);
		expect(ctx.signingAlgorithm).toEqual({ name: 'Ed25519' });
	});

	it('rejects an encrypted PKCS#8 key with an openssl hint', async () => {
		const ca = await makeCa();
		const encrypted =
			'-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIBvTBXBgkqhkiG9w0BBQ0=\n-----END ENCRYPTED PRIVATE KEY-----';
		await expect(importCa(ca.certificatePem, encrypted)).rejects.toThrowError(/openssl pkey/);
	});

	it('rejects a key that does not match the certificate', async () => {
		const a = await makeCa();
		const b = await makeCa();
		await expect(importCa(a.certificatePem, b.privateKeyPem)).rejects.toThrowError(
			/does not match/i
		);
	});

	it('rejects garbage instead of a certificate', async () => {
		const ca = await makeCa();
		await expect(importCa('not a cert', ca.privateKeyPem)).rejects.toThrowError(/CA certificate/i);
	});

	it('warns (non-blocking) when the certificate is not a CA', async () => {
		const leaf = await generateSelfSigned({
			commonName: 'not-a-ca.test',
			keyAlgorithm: 'ec-p256',
			validityDays: 365,
			sans: [],
			isCa: false
		});
		const ctx = await importCa(leaf.certificatePem, leaf.privateKeyPem);
		expect(ctx.warnings.some((w) => /not marked as a CA/i.test(w))).toBe(true);
	});
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `corepack pnpm vitest --run tests/pki/sign.test.ts`
Expected: FAIL — cannot resolve `$lib/pki/sign`.

- [ ] **Step 3: Implement `importCa`**

Create `src/lib/pki/sign.ts`:

```ts
/**
 * Certificate issuance signed by an existing CA, entirely in the browser.
 * The CA private key is imported into WebCrypto and never leaves the page.
 */
// @peculiar/x509 v2 requires a Reflect metadata polyfill on the consumer side.
import '@abraham/reflection';
import { X509Certificate, BasicConstraintsExtension, cryptoProvider } from '@peculiar/x509';
import { pemToDer } from './pem';
import { webCrypto } from './generate';

export type CaContext = {
	cert: X509Certificate;
	key: CryptoKey;
	signingAlgorithm: { name: string; hash?: string };
	/** Non-blocking issues detected at import time. */
	warnings: string[];
};

type CaAlgo = {
	import: RsaHashedImportParams | EcKeyImportParams | Algorithm;
	sign: { name: string; hash?: string };
};

function errMessage(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

/** Map the CA certificate's public-key algorithm to WebCrypto import/sign params. */
function caAlgorithm(cert: X509Certificate): CaAlgo {
	const alg = cert.publicKey.algorithm as { name: string; namedCurve?: string };
	switch (alg.name) {
		case 'RSASSA-PKCS1-v1_5':
			return {
				import: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
				sign: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }
			};
		case 'ECDSA': {
			const curve = alg.namedCurve ?? '';
			const hash =
				curve === 'P-256'
					? 'SHA-256'
					: curve === 'P-384'
						? 'SHA-384'
						: curve === 'P-521'
							? 'SHA-512'
							: '';
			if (!hash) throw new Error(`Unsupported EC curve for a CA key: ${curve || 'unknown'}.`);
			return { import: { name: 'ECDSA', namedCurve: curve }, sign: { name: 'ECDSA', hash } };
		}
		case 'Ed25519':
			return { import: { name: 'Ed25519' }, sign: { name: 'Ed25519' } };
		default:
			throw new Error(
				`Unsupported CA key type: ${alg.name}. Supported: RSA (PKCS#1 v1.5), EC P-256/P-384/P-521, Ed25519.`
			);
	}
}

/**
 * Parse the CA certificate, import its private key into WebCrypto and verify
 * that both belong together (sign/verify probe). Throws on any hard failure;
 * soft issues (certificate not marked as a CA) land in `warnings`.
 */
export async function importCa(certPem: string, keyPem: string): Promise<CaContext> {
	const crypto = webCrypto();
	cryptoProvider.set(crypto);

	if (/-----BEGIN ENCRYPTED PRIVATE KEY-----/.test(keyPem)) {
		throw new Error(
			'This private key is encrypted, which is not supported. Decrypt it first: openssl pkey -in encrypted.key -out clear.key'
		);
	}

	let cert: X509Certificate;
	try {
		cert = new X509Certificate(certPem);
	} catch (e) {
		throw new Error(`The CA certificate could not be parsed (${errMessage(e)}).`, { cause: e });
	}

	const algo = caAlgorithm(cert);

	let key: CryptoKey;
	try {
		const der = pemToDer(keyPem);
		key = await crypto.subtle.importKey('pkcs8', der as BufferSource, algo.import, false, ['sign']);
	} catch (e) {
		throw new Error(
			`The CA private key could not be imported as PKCS#8 (${errMessage(e)}). It must be an unencrypted "BEGIN PRIVATE KEY" block matching the certificate's key type.`,
			{ cause: e }
		);
	}

	// Sign/verify probe: proves the pasted key is the certificate's key.
	const probe = crypto.getRandomValues(new Uint8Array(32));
	let matches = false;
	try {
		const publicKey = await cert.publicKey.export(algo.import, ['verify'], crypto);
		const signature = await crypto.subtle.sign(algo.sign, key, probe);
		matches = await crypto.subtle.verify(algo.sign, publicKey, signature, probe);
	} catch {
		matches = false;
	}
	if (!matches) throw new Error('The private key does not match the CA certificate.');

	const warnings: string[] = [];
	const bc = cert.getExtension(BasicConstraintsExtension);
	if (!bc?.ca) {
		warnings.push(
			'This certificate is not marked as a CA (Basic Constraints cA is not set); verifiers may reject certificates it signs.'
		);
	}

	return { cert, key, signingAlgorithm: algo.sign, warnings };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `corepack pnpm vitest --run tests/pki/sign.test.ts`
Expected: 7 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pki/sign.ts tests/pki/sign.test.ts
git commit -m "feat(pki): import a CA certificate and key for signing

Refs #11"
```

---

### Task 3: `sign.ts` — `issueCertificate`, new-key mode

**Files:**

- Modify: `src/lib/pki/sign.ts`
- Modify: `tests/pki/sign.test.ts`

**Interfaces:**

- Consumes: `CaContext`/`importCa` (Task 2); `ALGORITHMS`, `KEY_ALGORITHM_LABELS`, `randomSerial`, `buildName`, `webCrypto`, `KeyAlgorithmChoice` from `$lib/pki/generate`; `derToPem` from `$lib/pki/pem`.
- Produces (consumed by Task 4 and the page):

```ts
export type IssueSubject =
	{ kind: 'generate'; keyAlgorithm: KeyAlgorithmChoice } | { kind: 'csr'; csrPem: string };

export type IssueOptions = {
	commonName: string;
	organization?: string;
	country?: string;
	validityDays: number;
	/** DNS Subject Alternative Names. */
	sans: string[];
	/** Issue an intermediate CA (Basic Constraints cA = true). */
	isCa: boolean;
	subject: IssueSubject;
};

export type IssuedCertificate = {
	certificatePem: string;
	/** Only present when the tool generated the key pair. */
	privateKeyPem?: string;
	/** Issued certificate followed by the CA certificate. */
	fullchainPem: string;
	warnings: string[];
};

export async function issueCertificate(
	ca: CaContext,
	opts: IssueOptions
): Promise<IssuedCertificate>;
```

- [ ] **Step 1: Write the failing tests**

Append to `tests/pki/sign.test.ts` (extend the import from `$lib/pki/sign` with `issueCertificate`, and add):

```ts
import {
	X509Certificate,
	AuthorityKeyIdentifierExtension,
	SubjectKeyIdentifierExtension,
	KeyUsagesExtension,
	KeyUsageFlags
} from '@peculiar/x509';
import { decodeCertificate } from '$lib/pki/parse';

describe('issueCertificate (new key pair)', () => {
	it('issues a leaf signed by the CA, with SKI/AKI and a fullchain', async () => {
		const caPems = await makeCa('ec-p256');
		const ca = await importCa(caPems.certificatePem, caPems.privateKeyPem);
		const issued = await issueCertificate(ca, {
			commonName: 'leaf.sign.test',
			organization: 'pki-toolbox',
			country: 'FR',
			validityDays: 365,
			sans: ['leaf.sign.test', 'alt.sign.test'],
			isCa: false,
			subject: { kind: 'generate', keyAlgorithm: 'ec-p256' }
		});

		expect(issued.privateKeyPem).toContain('BEGIN PRIVATE KEY');
		expect(issued.warnings).toHaveLength(0);
		// fullchain = leaf + CA
		expect(issued.fullchainPem.match(/BEGIN CERTIFICATE/g)).toHaveLength(2);

		const leaf = new X509Certificate(issued.certificatePem);
		// signed by the CA, not self-signed
		expect(await leaf.verify({ publicKey: ca.cert.publicKey })).toBe(true);
		expect(leaf.issuer).toBe(ca.cert.subject);

		// AKI == SHA-1 key id of the CA public key (the generated CA has no SKI
		// extension, so compute the expected id directly from its key)
		const expectedSki = await SubjectKeyIdentifierExtension.create(ca.cert.publicKey);
		expect(leaf.getExtension(AuthorityKeyIdentifierExtension)?.keyId).toBe(expectedSki.keyId);
		expect(leaf.getExtension(SubjectKeyIdentifierExtension)?.keyId).toBeTruthy();

		const decoded = await decodeCertificate(issued.certificatePem);
		expect(decoded.isCA).toBe(false);
		expect(decoded.subjectAltNames.map((s) => s.value)).toContain('alt.sign.test');
	});

	it('issues an intermediate CA that can itself sign', async () => {
		const rootPems = await makeCa('ec-p256');
		const root = await importCa(rootPems.certificatePem, rootPems.privateKeyPem);
		const inter = await issueCertificate(root, {
			commonName: 'sign.test Intermediate CA',
			validityDays: 1825,
			sans: [],
			isCa: true,
			subject: { kind: 'generate', keyAlgorithm: 'ec-p256' }
		});

		const interCert = new X509Certificate(inter.certificatePem);
		const ku = interCert.getExtension(KeyUsagesExtension);
		expect((ku!.usages & KeyUsageFlags.keyCertSign) !== 0).toBe(true);
		expect((await decodeCertificate(inter.certificatePem)).isCA).toBe(true);

		// The intermediate can sign a leaf in turn.
		const interCtx = await importCa(inter.certificatePem, inter.privateKeyPem!);
		const leaf = await issueCertificate(interCtx, {
			commonName: 'deep.sign.test',
			validityDays: 365,
			sans: ['deep.sign.test'],
			isCa: false,
			subject: { kind: 'generate', keyAlgorithm: 'ec-p256' }
		});
		const leafCert = new X509Certificate(leaf.certificatePem);
		expect(await leafCert.verify({ publicKey: interCert.publicKey })).toBe(true);
	});

	it('warns when the requested validity outlives the CA', async () => {
		const caPems = await makeCa('ec-p256', 30);
		const ca = await importCa(caPems.certificatePem, caPems.privateKeyPem);
		const issued = await issueCertificate(ca, {
			commonName: 'outlives.sign.test',
			validityDays: 365,
			sans: [],
			isCa: false,
			subject: { kind: 'generate', keyAlgorithm: 'ec-p256' }
		});
		expect(issued.warnings.some((w) => /CA certificate expires/i.test(w))).toBe(true);
	});

	it('requires a Common Name', async () => {
		const caPems = await makeCa();
		const ca = await importCa(caPems.certificatePem, caPems.privateKeyPem);
		await expect(
			issueCertificate(ca, {
				commonName: '  ',
				validityDays: 365,
				sans: [],
				isCa: false,
				subject: { kind: 'generate', keyAlgorithm: 'ec-p256' }
			})
		).rejects.toThrowError(/Common Name/);
	});
});
```

- [ ] **Step 2: Run tests, verify the new ones fail**

Run: `corepack pnpm vitest --run tests/pki/sign.test.ts`
Expected: FAIL — `issueCertificate` is not exported.

- [ ] **Step 3: Implement `issueCertificate` (new-key mode only)**

In `src/lib/pki/sign.ts`, extend the `@peculiar/x509` import with `X509CertificateGenerator, KeyUsagesExtension, KeyUsageFlags, ExtendedKeyUsageExtension, SubjectAlternativeNameExtension, SubjectKeyIdentifierExtension, AuthorityKeyIdentifierExtension, type Extension, type PublicKeyType` and add `import { ALGORITHMS, KEY_ALGORITHM_LABELS, randomSerial, buildName, webCrypto, type KeyAlgorithmChoice } from './generate';` plus `derToPem` from `./pem`. Then add the types from the Interfaces block above, and:

```ts
/**
 * Issue a certificate signed by the imported CA. The subject key pair is
 * either generated locally or taken from a verified CSR (Task 4).
 */
export async function issueCertificate(
	ca: CaContext,
	opts: IssueOptions
): Promise<IssuedCertificate> {
	if (!opts.commonName.trim()) throw new Error('The Common Name (CN) is required.');

	const crypto = webCrypto();
	cryptoProvider.set(crypto);

	let publicKey: PublicKeyType;
	let privateKeyPem: string | undefined;

	if (opts.subject.kind === 'generate') {
		const spec = ALGORITHMS[opts.subject.keyAlgorithm];
		let keys: CryptoKeyPair;
		try {
			keys = (await crypto.subtle.generateKey(spec.generate, true, [
				'sign',
				'verify'
			])) as CryptoKeyPair;
		} catch (e) {
			throw new Error(
				`This browser cannot generate a ${KEY_ALGORITHM_LABELS[opts.subject.keyAlgorithm]} key.`,
				{ cause: e }
			);
		}
		publicKey = keys.publicKey;
		const pkcs8 = await crypto.subtle.exportKey('pkcs8', keys.privateKey);
		privateKeyPem = derToPem(new Uint8Array(pkcs8), 'PRIVATE KEY');
	} else {
		publicKey = await csrPublicKey(opts.subject.csrPem, crypto); // Task 4
	}

	const notBefore = new Date(Date.now() - 60_000); // 1 min in the past for clock skew
	const notAfter = new Date(notBefore.getTime() + opts.validityDays * 86_400_000);

	const warnings: string[] = [];
	if (notAfter > ca.cert.notAfter) {
		warnings.push(
			`The requested validity ends after the CA certificate expires (${ca.cert.notAfter.toISOString().slice(0, 10)}); the chain will not verify past that date.`
		);
	}

	const keyUsage = opts.isCa
		? KeyUsageFlags.keyCertSign | KeyUsageFlags.cRLSign
		: KeyUsageFlags.digitalSignature | KeyUsageFlags.keyEncipherment;

	const extensions: Extension[] = [
		new BasicConstraintsExtension(opts.isCa, undefined, true),
		new KeyUsagesExtension(keyUsage, true),
		await SubjectKeyIdentifierExtension.create(publicKey, false, crypto),
		await AuthorityKeyIdentifierExtension.create(ca.cert.publicKey, false, crypto)
	];
	if (!opts.isCa) {
		// serverAuth + clientAuth
		extensions.push(
			new ExtendedKeyUsageExtension(['1.3.6.1.5.5.7.3.1', '1.3.6.1.5.5.7.3.2'], false)
		);
	}
	const sans = opts.sans.map((v) => v.trim()).filter(Boolean);
	if (sans.length) {
		extensions.push(
			new SubjectAlternativeNameExtension(sans.map((value) => ({ type: 'dns' as const, value })))
		);
	}

	const cert = await X509CertificateGenerator.create({
		serialNumber: randomSerial(crypto),
		subject: buildName(opts),
		issuer: ca.cert.subjectName,
		notBefore,
		notAfter,
		signingAlgorithm: ca.signingAlgorithm,
		publicKey,
		signingKey: ca.key,
		extensions
	});

	const certificatePem = cert.toString('pem');
	return {
		certificatePem,
		privateKeyPem,
		fullchainPem: `${certificatePem}\n${ca.cert.toString('pem')}\n`,
		warnings
	};
}
```

For this task, stub the CSR branch so the module compiles:

```ts
async function csrPublicKey(csrPem: string, crypto: Crypto): Promise<PublicKeyType> {
	void csrPem;
	void crypto;
	throw new Error('CSR mode not implemented yet.');
}
```

If `PublicKeyType` is not exported by the installed `@peculiar/x509` version, type `publicKey` as `CryptoKey | import('@peculiar/x509').PublicKey` instead — check with `corepack pnpm check`.

- [ ] **Step 4: Run tests, verify they pass**

Run: `corepack pnpm vitest --run tests/pki/sign.test.ts`
Expected: all PASS (11 total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pki/sign.ts tests/pki/sign.test.ts
git commit -m "feat(pki): issue CA-signed certificates with a generated key pair

Refs #11"
```

---

### Task 4: `sign.ts` — CSR mode

**Files:**

- Modify: `src/lib/pki/sign.ts`
- Modify: `tests/pki/sign.test.ts`

**Interfaces:**

- Consumes: `TEST_CSR` from `tests/fixtures/certs.ts`; `decodeCsr` from `$lib/pki/parse` (page-side pre-fill — no new helper).
- Produces: the `{ kind: 'csr'; csrPem: string }` branch of `IssueSubject` becomes functional. `sign.ts` verifies the CSR signature itself (`Pkcs10CertificateRequest.verify`) — `decodeCsr` does not.

- [ ] **Step 1: Write the failing tests**

Append to `tests/pki/sign.test.ts` (add `TEST_CSR` to the fixtures import):

```ts
import { TEST_CSR } from '../fixtures/certs';

describe('issueCertificate (CSR)', () => {
	it('certifies the public key of a valid CSR, without a private key output', async () => {
		const caPems = await makeCa('ec-p256');
		const ca = await importCa(caPems.certificatePem, caPems.privateKeyPem);
		const issued = await issueCertificate(ca, {
			commonName: 'from-csr.sign.test',
			validityDays: 365,
			sans: ['from-csr.sign.test'],
			isCa: false,
			subject: { kind: 'csr', csrPem: TEST_CSR }
		});

		expect(issued.privateKeyPem).toBeUndefined();
		const leaf = new X509Certificate(issued.certificatePem);
		expect(await leaf.verify({ publicKey: ca.cert.publicKey })).toBe(true);
		// The certified key is the CSR's, not a fresh one.
		const { Pkcs10CertificateRequest } = await import('@peculiar/x509');
		const csr = new Pkcs10CertificateRequest(TEST_CSR);
		expect(leaf.publicKey.toString('hex')).toBe(csr.publicKey.toString('hex'));
		// Subject comes from the form, not the CSR.
		expect(leaf.subject).toContain('from-csr.sign.test');
	});

	it('rejects a CSR with a broken signature', async () => {
		const caPems = await makeCa('ec-p256');
		const ca = await importCa(caPems.certificatePem, caPems.privateKeyPem);
		// Flip characters in the base64 body to corrupt the signature.
		const lines = TEST_CSR.trim().split('\n');
		const bodyIdx = Math.floor(lines.length / 2);
		lines[bodyIdx] = lines[bodyIdx].replace(/[A-Za-z]/g, (c) => (c === 'A' ? 'B' : 'A'));
		const tampered = lines.join('\n');
		await expect(
			issueCertificate(ca, {
				commonName: 'tampered.sign.test',
				validityDays: 365,
				sans: [],
				isCa: false,
				subject: { kind: 'csr', csrPem: tampered }
			})
		).rejects.toThrowError(/CSR|PKCS#10/i);
	});

	it('rejects input that is not a CSR', async () => {
		const caPems = await makeCa('ec-p256');
		const ca = await importCa(caPems.certificatePem, caPems.privateKeyPem);
		await expect(
			issueCertificate(ca, {
				commonName: 'x.sign.test',
				validityDays: 365,
				sans: [],
				isCa: false,
				subject: { kind: 'csr', csrPem: 'not a csr' }
			})
		).rejects.toThrowError(/PKCS#10/i);
	});
});
```

Note: `leaf.publicKey.toString('hex')` — if `PublicKey` has no `toString('hex')` in the installed version, compare `Buffer.from(leaf.publicKey.rawData).toString('base64')` against the CSR's instead.

- [ ] **Step 2: Run tests, verify the new ones fail**

Run: `corepack pnpm vitest --run tests/pki/sign.test.ts`
Expected: the three CSR tests FAIL with "CSR mode not implemented yet".

- [ ] **Step 3: Implement the CSR branch**

In `src/lib/pki/sign.ts`, add `Pkcs10CertificateRequest` to the `@peculiar/x509` import and replace the stub:

```ts
/**
 * Parse and verify a PKCS#10 request, returning its public key. `decodeCsr`
 * (parse.ts) does not check the signature, so it is verified here — a CSR
 * whose proof-of-possession fails must not be certified.
 */
async function csrPublicKey(csrPem: string, crypto: Crypto): Promise<PublicKeyType> {
	let csr: Pkcs10CertificateRequest;
	try {
		csr = new Pkcs10CertificateRequest(csrPem);
	} catch (e) {
		throw new Error(`This does not look like a PKCS#10 request (${errMessage(e)}).`, {
			cause: e
		});
	}
	let valid = false;
	try {
		valid = await csr.verify(crypto);
	} catch {
		valid = false;
	}
	if (!valid) throw new Error('The CSR signature is invalid; refusing to certify its key.');
	return csr.publicKey;
}
```

- [ ] **Step 4: Run tests, verify everything passes**

Run: `corepack pnpm vitest --run tests/pki/sign.test.ts && corepack pnpm test && corepack pnpm check`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pki/sign.ts tests/pki/sign.test.ts
git commit -m "feat(pki): sign PKCS#10 requests with the imported CA

Refs #11"
```

---

### Task 5: Shared `PemOutput.svelte` + optional decode button on `PemInput`

**Files:**

- Create: `src/lib/components/PemOutput.svelte`
- Modify: `src/lib/components/PemInput.svelte` (decode button only when `ondecode` is provided)
- Modify: `src/routes/generate-selfsigned/+page.svelte` (use `PemOutput`, drop the local snippet)

**Interfaces:**

- Produces: `PemOutput` props `{ title: string; value: string; filename: string }` — copy/download handled internally. Consumed by `generate-selfsigned` and the new page (Task 6).
- `PemInput` change: the decode button and the Ctrl+Enter hint render only when `ondecode` is passed. All existing callers pass it → no visible change for them.

- [ ] **Step 1: Create `PemOutput.svelte`**

```svelte
<script lang="ts">
	/**
	 * PEM result block with copy and download actions, shared by the
	 * generation tools.
	 */
	import Icon from './Icon.svelte';
	import { writeToClipboard } from '$lib/clipboard';
	import { downloadText } from '$lib/download';

	type Props = { title: string; value: string; filename: string };
	let { title, value, filename }: Props = $props();

	let copied = $state(false);

	async function copy() {
		if (await writeToClipboard(value)) {
			copied = true;
			setTimeout(() => (copied = false), 1200);
		}
	}
</script>

<article
	class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
>
	<header class="flex items-center justify-between px-5 py-3">
		<span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</span>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={copy}
				class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
			>
				<Icon name={copied ? 'check' : 'copy'} size={13} />
				{copied ? 'Copied' : 'Copy'}
			</button>
			<button
				type="button"
				onclick={() => downloadText(filename, value, 'application/x-pem-file')}
				class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
			>
				<Icon name="upload" size={13} class="rotate-180" /> Download
			</button>
		</div>
	</header>
	<pre
		class="max-h-56 overflow-auto border-t border-slate-200 bg-slate-50 p-4 font-mono text-[12px] leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">{value}</pre>
</article>
```

- [ ] **Step 2: Use it in `generate-selfsigned/+page.svelte`**

Remove the `pemBlock` snippet, the `copy()` function, the `copied` state and the now-unused imports (`writeToClipboard`, `downloadText`, `Icon` stays — it is still used by the generate button). Replace the two `{@render pemBlock(...)}` calls with:

```svelte
<PemOutput title="Certificate (PEM)" value={result.certificatePem} filename="certificate.crt" />
```

and

```svelte
<PemOutput
	title="Private key (PEM, PKCS#8)"
	value={result.privateKeyPem}
	filename="private-key.key"
/>
```

(keep the private-key warning `Alert` between them), adding `import PemOutput from '$lib/components/PemOutput.svelte';`.

- [ ] **Step 3: Make `PemInput`'s decode button conditional**

In `src/lib/components/PemInput.svelte`, wrap the decode `<button>` (the one calling `ondecode?.()`, lines ~116–127) in `{#if ondecode}…{/if}`, and wrap the "Tip: Ctrl/⌘ + Enter to decode." span in the same condition:

```svelte
{#if ondecode}
	<span class="hidden sm:inline">Tip: Ctrl/⌘ + Enter to decode.</span>
{/if}
```

- [ ] **Step 4: Verify**

Run: `corepack pnpm check && corepack pnpm lint && corepack pnpm test`
Expected: clean. (Visual check happens with the user's local run.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/PemOutput.svelte src/lib/components/PemInput.svelte src/routes/generate-selfsigned/+page.svelte
git commit -m "refactor(ui): extract PemOutput and make PemInput decode button optional

Refs #11"
```

---

### Task 6: Route `/sign-certificate` + catalogue + icon + README

**Files:**

- Modify: `src/lib/components/Icon.svelte` (add `stamp` icon)
- Modify: `src/lib/tools.ts` (new entry)
- Create: `src/routes/sign-certificate/+page.svelte`
- Modify: `README.md` (tools table row)

**Interfaces:**

- Consumes: `importCa`, `issueCertificate`, `CaContext` (`$lib/pki/sign`); `KEY_ALGORITHM_LABELS`, `KeyAlgorithmChoice` (`$lib/pki/generate`); `decodeCsr` (`$lib/pki/parse`); `PemInput` (no `ondecode` for CA fields), `PemOutput`, `ToolHeader`, `Alert`, `Icon`.
- Produces: tool slug `sign-certificate` (used by the e2e test in Task 7).

- [ ] **Step 1: Add the `stamp` icon**

In `src/lib/components/Icon.svelte`, add to `ICONS` (Tabler `rubber-stamp` style, matches the stroked set):

```ts
stamp:
	'<path d="M5 21h14" /><path d="M5 18a1 1 0 0 1 -1 -1v-1a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v1a1 1 0 0 1 -1 1z" /><path d="M9.5 14c.318 -1.483 .509 -2.734 .509 -4a3.5 3.5 0 1 0 -6.918 .75" transform="translate(5 0)" /><path d="M14.5 14c-.318 -1.483 -.509 -2.734 -.509 -4" />',
```

If the rendering looks off in the user's visual check, fall back to `certificate` — do not block on icon aesthetics.

- [ ] **Step 2: Register the tool**

In `src/lib/tools.ts`, append after the `generate-selfsigned` entry:

```ts
{
	slug: 'sign-certificate',
	name: 'Sign from a CA',
	description:
		'Issue a certificate signed by an existing CA: new key pair or CSR, leaf or intermediate CA, with a ready-to-use fullchain.',
	icon: 'stamp',
	category: 'generate',
	status: 'ready'
}
```

- [ ] **Step 3: Create the page**

`src/routes/sign-certificate/+page.svelte`:

```svelte
<script lang="ts">
	import { requireTool } from '$lib/tools';
	import { importCa, issueCertificate, type CaContext } from '$lib/pki/sign';
	import { KEY_ALGORITHM_LABELS, type KeyAlgorithmChoice } from '$lib/pki/generate';
	import { decodeCsr } from '$lib/pki/parse';
	import type { IssuedCertificate } from '$lib/pki/sign';
	import ToolHeader from '$lib/components/ToolHeader.svelte';
	import PemInput from '$lib/components/PemInput.svelte';
	import PemOutput from '$lib/components/PemOutput.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const tool = requireTool('sign-certificate');

	const algorithms = Object.entries(KEY_ALGORITHM_LABELS) as [KeyAlgorithmChoice, string][];
	const inputClass =
		'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500/40 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

	// --- CA material ---
	let caCertPem = $state('');
	let caKeyPem = $state('');
	let ca = $state<CaContext | null>(null);
	let caError = $state('');
	let caLoading = $state(false);

	// Editing the CA material invalidates the previously loaded CA.
	$effect(() => {
		void caCertPem;
		void caKeyPem;
		ca = null;
	});

	async function loadCa() {
		caLoading = true;
		caError = '';
		try {
			ca = await importCa(caCertPem, caKeyPem);
		} catch (e) {
			caError = e instanceof Error ? e.message : String(e);
		} finally {
			caLoading = false;
		}
	}

	// --- Subject ---
	let mode = $state<'generate' | 'csr'>('generate');
	let csrPem = $state('');
	let csrError = $state('');
	let commonName = $state('service.internal');
	let organization = $state('');
	let country = $state('');
	let keyAlgorithm = $state<KeyAlgorithmChoice>('ec-p256');
	let validityDays = $state(365);
	let sansText = $state('service.internal');
	let isCa = $state(false);

	async function readCsr() {
		csrError = '';
		try {
			const csr = await decodeCsr(csrPem);
			const part = (key: string) => csr.subjectParts.find((p) => p.key === key)?.value ?? '';
			commonName = part('CN');
			organization = part('O');
			country = part('C');
			sansText = csr.subjectAltNames
				.filter((s) => s.type.toLowerCase().includes('dns'))
				.map((s) => s.value)
				.join(', ');
		} catch (e) {
			csrError = e instanceof Error ? e.message : String(e);
		}
	}

	// --- Result ---
	let result = $state<IssuedCertificate | null>(null);
	let signError = $state('');
	let signing = $state(false);

	async function sign() {
		if (!ca) return;
		signing = true;
		signError = '';
		result = null;
		try {
			result = await issueCertificate(ca, {
				commonName,
				organization,
				country,
				validityDays,
				sans: sansText.split(/[\n,]+/),
				isCa,
				subject: mode === 'csr' ? { kind: 'csr', csrPem } : { kind: 'generate', keyAlgorithm }
			});
		} catch (e) {
			signError = e instanceof Error ? e.message : String(e);
		} finally {
			signing = false;
		}
	}
</script>

<svelte:head><title>{tool.name}, PKI-Toolbox</title></svelte:head>

<ToolHeader {tool} />

<!-- Block 1: CA material -->
<section
	class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
>
	<h2 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
		1. Certificate authority
	</h2>
	<div class="grid gap-4 lg:grid-cols-2">
		<div>
			<p class="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">CA certificate</p>
			<PemInput bind:value={caCertPem} derLabel="CERTIFICATE" accept=".pem,.crt,.cer,.der" />
		</div>
		<div>
			<p class="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
				CA private key (unencrypted PKCS#8)
			</p>
			<PemInput bind:value={caKeyPem} derLabel="PRIVATE KEY" accept=".pem,.key,.der" />
		</div>
	</div>

	<button
		type="button"
		onclick={loadCa}
		disabled={caLoading || !caCertPem.trim() || !caKeyPem.trim()}
		class="yk-cut mt-4 inline-flex items-center gap-2 bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-400 dark:text-[color:var(--yk-on-accent)] dark:hover:bg-teal-300"
	>
		<Icon name={caLoading ? 'clock' : 'shield'} size={16} />
		{caLoading ? 'Loading…' : 'Load the CA'}
	</button>

	<div class="mt-3 space-y-3" aria-live="polite">
		{#if caError}
			<Alert variant="error" title="CA import failed">{caError}</Alert>
		{/if}
		{#if ca}
			<Alert variant="info" title="CA loaded">
				{ca.cert.subject} — valid until {ca.cert.notAfter.toISOString().slice(0, 10)}
			</Alert>
			{#each ca.warnings as warning (warning)}
				<Alert variant="warn" title="Warning">{warning}</Alert>
			{/each}
		{/if}
	</div>
</section>

<!-- Block 2: subject -->
<section
	class="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
>
	<h2 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">2. Subject</h2>

	<div
		class="mb-4 inline-flex rounded-lg border border-slate-300 p-0.5 text-sm dark:border-slate-700"
		role="tablist"
		aria-label="Subject key source"
	>
		{#each [{ id: 'generate', label: 'New key pair' }, { id: 'csr', label: 'Sign a CSR' }] as m (m.id)}
			<button
				type="button"
				role="tab"
				aria-selected={mode === m.id}
				onclick={() => (mode = m.id as typeof mode)}
				class="rounded-md px-3 py-1.5 font-medium transition {mode === m.id
					? 'bg-teal-700 text-white dark:bg-teal-400 dark:text-[color:var(--yk-on-accent)]'
					: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}"
			>
				{m.label}
			</button>
		{/each}
	</div>

	{#if mode === 'csr'}
		<div class="mb-4">
			<p class="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
				PKCS#10 request — its subject and DNS SANs pre-fill the form below; the form wins.
			</p>
			<PemInput
				bind:value={csrPem}
				derLabel="CERTIFICATE REQUEST"
				accept=".pem,.csr,.req,.der"
				decodeLabel="Read the CSR"
				ondecode={readCsr}
			/>
			{#if csrError}
				<div class="mt-3"><Alert variant="error" title="CSR error">{csrError}</Alert></div>
			{/if}
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">Common Name (CN) *</span>
			<input bind:value={commonName} required aria-required="true" class={inputClass} />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">Organization (O)</span>
			<input bind:value={organization} class={inputClass} placeholder="(optional)" />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">Country (C)</span>
			<input bind:value={country} class={inputClass} placeholder="FR" maxlength="2" />
		</label>
		{#if mode === 'generate'}
			<label class="flex flex-col gap-1 text-sm">
				<span class="font-medium text-slate-600 dark:text-slate-300">Key algorithm</span>
				<select bind:value={keyAlgorithm} class={inputClass}>
					{#each algorithms as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>
			</label>
		{/if}
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">Validity (days)</span>
			<input type="number" bind:value={validityDays} min="1" max="7300" class={inputClass} />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="font-medium text-slate-600 dark:text-slate-300">
				Subject Alternative Names (DNS)
			</span>
			<input bind:value={sansText} class={inputClass} placeholder="service.internal" />
		</label>
	</div>

	<label class="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
		<input
			type="checkbox"
			bind:checked={isCa}
			class="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500/40 dark:border-slate-600"
		/>
		Intermediate CA, Basic Constraints cA = true
	</label>

	<button
		type="button"
		onclick={sign}
		disabled={signing || !ca || !commonName.trim() || (mode === 'csr' && !csrPem.trim())}
		class="yk-cut mt-5 inline-flex items-center gap-2 bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-400 dark:text-[color:var(--yk-on-accent)] dark:hover:bg-teal-300"
	>
		<Icon name={signing ? 'clock' : 'stamp'} size={16} />
		{signing ? 'Signing…' : 'Sign the certificate'}
	</button>
	{#if !ca}
		<p class="mt-2 text-xs text-slate-400 dark:text-slate-500">Load the CA first (step 1).</p>
	{/if}
</section>

<!-- Results -->
<div class="mt-6 space-y-4" aria-live="polite" aria-atomic="false">
	{#if signError}
		<Alert variant="error" title="Signing failed">{signError}</Alert>
	{/if}

	{#if result}
		{#each result.warnings as warning (warning)}
			<Alert variant="warn" title="Warning">{warning}</Alert>
		{/each}

		<PemOutput title="Certificate (PEM)" value={result.certificatePem} filename="certificate.crt" />

		{#if result.privateKeyPem}
			<Alert variant="warn" title="Private key">
				Keep this private key in a safe place and never share it. It is shown only here and is
				stored nowhere.
			</Alert>
			<PemOutput
				title="Private key (PEM, PKCS#8)"
				value={result.privateKeyPem}
				filename="private-key.key"
			/>
		{/if}

		<PemOutput
			title="Fullchain (certificate + CA)"
			value={result.fullchainPem}
			filename="fullchain.pem"
		/>
	{/if}
</div>
```

Check `Alert.svelte`'s accepted `variant` values first; if `info` is not one of them, use the closest existing variant for the "CA loaded" block.

- [ ] **Step 4: README row**

In `README.md`, add to the tools table (match the existing column formatting):

```markdown
| Sign from a CA | ready | Issue certificates signed by an existing CA: new key or CSR, leaf or intermediate. |
```

- [ ] **Step 5: Verify**

Run: `corepack pnpm check && corepack pnpm lint && corepack pnpm test`
Expected: clean. Then `corepack pnpm build` — must succeed (static adapter prerender).

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/Icon.svelte src/lib/tools.ts src/routes/sign-certificate/+page.svelte README.md
git commit -m "feat(ui): add the sign-from-a-CA tool page

Refs #11"
```

---

### Task 7: E2e happy path

**Files:**

- Create: `e2e/sign-certificate.spec.ts`

**Interfaces:**

- Consumes: the `/generate-selfsigned` and `/sign-certificate` pages as shipped; PemInput textareas carry `aria-label="PKI artefact input"` (two on the sign page: index 0 = CA cert, 1 = CA key).

- [ ] **Step 1: Write the e2e test**

```ts
import { test, expect } from '@playwright/test';

/**
 * Full happy path: generate a CA with the existing tool, feed it to the
 * sign-from-a-CA tool, issue a leaf and check the three PEM outputs.
 */
test('issues a CA-signed certificate end to end', async ({ page }) => {
	// 1. Generate a CA.
	await page.goto('/generate-selfsigned');
	await page.getByLabel(/Common Name/).fill('E2E Test CA');
	await page.getByLabel(/Certificate authority/).check();
	await page.getByRole('button', { name: 'Generate the certificate' }).click();

	const caCert = await page.locator('pre').nth(0).innerText();
	const caKey = await page.locator('pre').nth(1).innerText();
	expect(caCert).toContain('BEGIN CERTIFICATE');
	expect(caKey).toContain('BEGIN PRIVATE KEY');

	// 2. Load the CA in the new tool.
	await page.goto('/sign-certificate');
	const pemInputs = page.getByLabel('PKI artefact input');
	await pemInputs.nth(0).fill(caCert);
	await pemInputs.nth(1).fill(caKey);
	await page.getByRole('button', { name: 'Load the CA' }).click();
	await expect(page.getByText('CA loaded')).toBeVisible();
	await expect(page.getByText('E2E Test CA', { exact: false }).first()).toBeVisible();

	// 3. Issue a leaf.
	await page.getByLabel(/Common Name/).fill('leaf.e2e.test');
	await page.getByLabel(/Subject Alternative Names/).fill('leaf.e2e.test');
	await page.getByRole('button', { name: 'Sign the certificate' }).click();

	await expect(page.getByText('Certificate (PEM)')).toBeVisible();
	await expect(page.getByText('Private key (PEM, PKCS#8)')).toBeVisible();
	await expect(page.getByText('Fullchain (certificate + CA)')).toBeVisible();

	const fullchain = await page.locator('pre').last().innerText();
	expect(fullchain.match(/BEGIN CERTIFICATE/g)).toHaveLength(2);
});
```

- [ ] **Step 2: Run the e2e suite**

Run: `corepack pnpm exec playwright install chromium` (once), then `corepack pnpm test:e2e`
Expected: new spec PASS, existing specs (smoke/tools/responsive) still PASS — the new tool appears in the navbar/home grid, so watch for any snapshot-ish assertions and fix the test (not the app) if one trips.

- [ ] **Step 3: Commit and push**

```bash
git add e2e/sign-certificate.spec.ts
git commit -m "test(e2e): cover the sign-from-a-CA happy path

Refs #11"
git push origin feat/sign-certificate
```

Then update MR !126's checklist (`glab mr update 126 --description …` with the boxes ticked) and hand over to the user for the local run (`corepack pnpm dev`).
