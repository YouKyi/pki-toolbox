import { describe, it, expect } from 'vitest';
import { decodeCrl } from '$lib/pki/crl';
import { decodePkcs7 } from '$lib/pki/pkcs7';
import { decodePkcs12 } from '$lib/pki/pkcs12';
import { parseAsn1 } from '$lib/pki/asn1';
import { convertArtefact, buildPkcs7 } from '$lib/pki/convert';
import { generateSelfSigned } from '$lib/pki/generate';
import { decodeCertificate } from '$lib/pki/parse';
import {
	TEST_CRL,
	TEST_PKCS7,
	TEST_PKCS12,
	TEST_PKCS12_PASSWORD,
	ISRG_ROOT_X2
} from '../fixtures/certs';

describe('decodeCrl', () => {
	it('decodes issuer, dates and revoked entries', () => {
		const crl = decodeCrl(TEST_CRL);
		expect(crl.issuer).toContain('pki-toolbox Test CA');
		expect(crl.signatureAlgorithm).toMatch(/ECDSA/);
		expect(crl.thisUpdate).toBeInstanceOf(Date);
		expect(crl.entryCount).toBe(1);
		expect(crl.entries[0].reason).toBe('Clé compromise');
	});

	it('rejects input that is not a CRL', () => {
		expect(() => decodeCrl('not a crl')).toThrow();
	});
});

describe('decodePkcs7', () => {
	it('extracts every embedded certificate from a bundle', async () => {
		const p7 = await decodePkcs7(TEST_PKCS7);
		expect(p7.certificateCount).toBe(2);
		const subjects = p7.certificates.map((c) => c.subject).join(' | ');
		expect(subjects).toContain('demo.pki-toolbox.test');
		expect(subjects).toContain('pki-toolbox Test CA');
	});

	it('rejects input that is not a PKCS#7 bundle', async () => {
		await expect(decodePkcs7('not a bundle')).rejects.toThrow();
	});
});

describe('decodePkcs12', () => {
	it('opens the container with the correct password', async () => {
		const p12 = await decodePkcs12(TEST_PKCS12, TEST_PKCS12_PASSWORD);
		expect(p12.integrityVerified).toBe(true);
		expect(p12.certificateCount).toBe(2);
		expect(p12.keyCount).toBe(1);
	});

	it('rejects a wrong password', async () => {
		await expect(decodePkcs12(TEST_PKCS12, 'wrong-password')).rejects.toThrow();
	});
});

describe('parseAsn1', () => {
	it('walks a certificate into its three top-level fields', () => {
		const root = parseAsn1(ISRG_ROOT_X2);
		expect(root.tag).toBe('SEQUENCE');
		expect(root.children).toHaveLength(3);
		expect(root.children[2].tag).toBe('BIT STRING');
	});

	it('rejects input that is not DER', () => {
		expect(() => parseAsn1('definitely not der')).toThrow();
	});
});

describe('convertArtefact / buildPkcs7', () => {
	it('converts a single PEM certificate to DER representations', () => {
		const items = convertArtefact(ISRG_ROOT_X2);
		expect(items).toHaveLength(1);
		expect(items[0].label).toBe('CERTIFICATE');
		expect(items[0].der.length).toBeGreaterThan(0);
		expect(items[0].derBase64.length).toBeGreaterThan(0);
	});

	it('explodes a PKCS#7 bundle into its certificates', () => {
		const items = convertArtefact(TEST_PKCS7);
		expect(items).toHaveLength(2);
	});

	it('bundles certificates back into a PKCS#7 structure', () => {
		const items = convertArtefact(ISRG_ROOT_X2);
		const bundle = buildPkcs7(items.map((i) => i.der));
		expect(bundle.length).toBeGreaterThan(0);
		expect(bundle[0]).toBe(0x30); // ASN.1 SEQUENCE
	});
});

describe('generateSelfSigned', () => {
	it('produces a self-signed EC certificate that decodes back', async () => {
		const { certificatePem, privateKeyPem } = await generateSelfSigned({
			commonName: 'test.example',
			organization: 'pki-toolbox',
			country: 'FR',
			keyAlgorithm: 'ec-p256',
			validityDays: 365,
			sans: ['test.example'],
			isCa: false
		});
		expect(certificatePem).toContain('BEGIN CERTIFICATE');
		expect(privateKeyPem).toContain('BEGIN PRIVATE KEY');

		const cert = await decodeCertificate(certificatePem);
		expect(cert.isSelfSigned).toBe(true);
		expect(cert.subject).toContain('test.example');
		expect(cert.publicKey.curve).toBe('P-256');
		expect(cert.subjectAltNames.map((s) => s.value)).toContain('test.example');
	});

	it('marks the certificate as a CA when requested', async () => {
		const { certificatePem } = await generateSelfSigned({
			commonName: 'Test Root CA',
			keyAlgorithm: 'rsa-2048',
			validityDays: 3650,
			sans: [],
			isCa: true
		});
		const cert = await decodeCertificate(certificatePem);
		expect(cert.isCA).toBe(true);
		expect(cert.publicKey.family).toBe('RSA');
	});
});
