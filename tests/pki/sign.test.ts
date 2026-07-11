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
