import { describe, it, expect } from 'vitest';
import { decodeCertificate, decodeCsr } from '$lib/pki/parse';
import {
	ISRG_ROOT_X1,
	ISRG_ROOT_X1_SHA256,
	ISRG_ROOT_X2,
	TEST_LEAF,
	TEST_CSR
} from '../fixtures/certs';

describe('decodeCertificate — RSA (ISRG Root X1)', () => {
	it('extracts the identity fields', async () => {
		const cert = await decodeCertificate(ISRG_ROOT_X1);
		expect(cert.kind).toBe('certificate');
		expect(cert.subject).toContain('ISRG Root X1');
		expect(cert.issuer).toContain('ISRG Root X1');
		expect(cert.isSelfSigned).toBe(true);
		expect(cert.subjectParts.some((p) => p.key === 'CN' && p.value === 'ISRG Root X1')).toBe(true);
	});

	it('reports an RSA-4096 public key and a CA basic constraint', async () => {
		const cert = await decodeCertificate(ISRG_ROOT_X1);
		expect(cert.publicKey.family).toBe('RSA');
		expect(cert.publicKey.bits).toBe(4096);
		expect(cert.isCA).toBe(true);
		expect(cert.basicConstraints?.ca).toBe(true);
	});

	it('parses validity dates and key usage', async () => {
		const cert = await decodeCertificate(ISRG_ROOT_X1);
		expect(cert.notBefore).toBeInstanceOf(Date);
		expect(cert.notAfter.getTime()).toBeGreaterThan(cert.notBefore.getTime());
		expect(cert.keyUsage).toContain('keyCertSign');
	});

	it('computes the expected DER fingerprints', async () => {
		const cert = await decodeCertificate(ISRG_ROOT_X1);
		expect(cert.fingerprints.sha256).toBe(ISRG_ROOT_X1_SHA256);
		expect(cert.fingerprints.sha1).toHaveLength(40);
		expect(cert.fingerprints.sha512).toHaveLength(128);
	});
});

describe('decodeCertificate — EC', () => {
	it('reports the named curve for ISRG Root X2 (P-384)', async () => {
		const cert = await decodeCertificate(ISRG_ROOT_X2);
		expect(cert.publicKey.family).toBe('EC');
		expect(cert.publicKey.curve).toBe('P-384');
		expect(cert.isCA).toBe(true);
	});

	it('extracts SAN and extended key usage from a leaf certificate', async () => {
		const cert = await decodeCertificate(TEST_LEAF);
		expect(cert.isCA).toBe(false);
		expect(cert.publicKey.curve).toBe('P-256');
		expect(cert.subjectAltNames.map((s) => s.value)).toContain('demo.pki-toolbox.test');
		expect(cert.extendedKeyUsage).toContain('serverAuth');
		expect(cert.extendedKeyUsage).toContain('clientAuth');
	});
});

describe('decodeCertificate — errors', () => {
	it('rejects input that is not a certificate', async () => {
		await expect(decodeCertificate('not a certificate')).rejects.toThrow();
	});
});

describe('decodeCsr', () => {
	it('extracts the subject and public key of a PKCS#10 request', async () => {
		const csr = await decodeCsr(TEST_CSR);
		expect(csr.kind).toBe('csr');
		expect(csr.subject).toContain('request.pki-toolbox.test');
		expect(csr.publicKey.family).toBe('EC');
		expect(csr.signatureAlgorithm).toMatch(/ECDSA/);
	});

	it('reads requested SAN entries when present', async () => {
		const csr = await decodeCsr(TEST_CSR);
		expect(csr.subjectAltNames.map((s) => s.value)).toContain('request.pki-toolbox.test');
	});

	it('rejects input that is not a CSR', async () => {
		await expect(decodeCsr('not a csr')).rejects.toThrow();
	});
});
