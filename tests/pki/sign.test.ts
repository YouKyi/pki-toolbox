import { describe, it, expect } from 'vitest';
import { generateSelfSigned } from '$lib/pki/generate';
import { importCa, issueCertificate } from '$lib/pki/sign';
import {
	X509Certificate,
	AuthorityKeyIdentifierExtension,
	SubjectKeyIdentifierExtension,
	KeyUsagesExtension,
	KeyUsageFlags
} from '@peculiar/x509';
import { decodeCertificate } from '$lib/pki/parse';

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
