/**
 * Tests for `detect.ts`: what the interface uses to name an artefact and route
 * it to the tool that reads it. The interesting cases are the two the product
 * got wrong before it asked: a keystore armoured as a certificate, which is
 * what a dropped `.p12` used to become, and a private key, which no tool reads.
 */
import { describe, it, expect } from 'vitest';
import {
	detectArtefact,
	detectBytes,
	detectPrivateKey,
	isPkcs12,
	stripPrivateKeyBlocks
} from '$lib/pki/detect';
import { base64ToBytes, derToPem } from '$lib/pki/pem';
import {
	ISRG_ROOT_X1,
	TEST_CHAIN,
	TEST_CRL,
	TEST_CSR,
	TEST_PKCS7,
	TEST_PKCS12
} from '$lib/samples';

describe('detectArtefact: PEM labels', () => {
	it('names a certificate and routes it to the certificate decoder', () => {
		expect(detectArtefact(ISRG_ROOT_X1)).toMatchObject({
			kind: 'certificate',
			slug: 'decode-certificate'
		});
	});

	it('calls several concatenated certificates a chain', () => {
		expect(detectArtefact(TEST_CHAIN)).toMatchObject({ kind: 'chain', slug: 'decode-chain' });
	});

	it('names a signing request', () => {
		expect(detectArtefact(TEST_CSR)).toMatchObject({ kind: 'csr', slug: 'decode-csr' });
	});

	it('names a revocation list', () => {
		expect(detectArtefact(TEST_CRL)).toMatchObject({ kind: 'crl', slug: 'decode-crl' });
	});

	it('names a PKCS#7 bundle', () => {
		expect(detectArtefact(TEST_PKCS7)).toMatchObject({ kind: 'pkcs7', slug: 'decode-pkcs7' });
	});

	it('sends no private key anywhere, whatever its label', () => {
		for (const label of ['PRIVATE KEY', 'RSA PRIVATE KEY', 'EC PRIVATE KEY']) {
			const pem = `-----BEGIN ${label}-----\nMIIBVQIBADAN\n-----END ${label}-----`;
			expect(detectArtefact(pem)).toMatchObject({ kind: 'private-key', slug: null });
		}
	});

	it('tells an encrypted private key apart, and still routes it nowhere', () => {
		const pem =
			'-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIBVQIBADAN\n-----END ENCRYPTED PRIVATE KEY-----';
		expect(detectArtefact(pem)).toMatchObject({ kind: 'encrypted-private-key', slug: null });
	});
});

describe('detectArtefact: a key never decides the route', () => {
	const KEY = '-----BEGIN PRIVATE KEY-----\nMIIBVQIBADAN\n-----END PRIVATE KEY-----';

	it('routes a server bundle by its certificate, not by the key above it', () => {
		// What `openssl` writes and what a reader pastes: the key first.
		expect(detectArtefact(`${KEY}\n${ISRG_ROOT_X1}`)).toMatchObject({
			kind: 'certificate',
			slug: 'decode-certificate'
		});
	});

	it('routes a key beside a signing request by the request', () => {
		expect(detectArtefact(`${KEY}\n${TEST_CSR}`)).toMatchObject({
			kind: 'csr',
			slug: 'decode-csr'
		});
	});

	it('still counts the certificates of a bundle, so a key plus a chain is a chain', () => {
		expect(detectArtefact(`${KEY}\n${TEST_CHAIN}`)).toMatchObject({ kind: 'chain' });
	});

	it('answers with the key when the paste is nothing but keys', () => {
		expect(detectArtefact(KEY)).toMatchObject({ kind: 'private-key', slug: null });
	});
});

describe('detectPrivateKey', () => {
	const KEY = '-----BEGIN PRIVATE KEY-----\nMIIBVQIBADAN\n-----END PRIVATE KEY-----';

	it('finds the key inside a bundle whose certificate carries the route', () => {
		// The box must keep covering it even though the paste routes elsewhere.
		expect(detectPrivateKey(`${KEY}\n${ISRG_ROOT_X1}`)).toMatchObject({ kind: 'private-key' });
	});

	it('tells an encrypted key apart', () => {
		const encrypted =
			'-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIBVQIBADAN\n-----END ENCRYPTED PRIVATE KEY-----';
		expect(detectPrivateKey(encrypted)).toMatchObject({ kind: 'encrypted-private-key' });
	});

	it('says nothing when no key is in the paste', () => {
		expect(detectPrivateKey(ISRG_ROOT_X1)).toBeNull();
	});
});

describe('stripPrivateKeyBlocks', () => {
	const KEY = '-----BEGIN PRIVATE KEY-----\nMIIBVQIBADAN\n-----END PRIVATE KEY-----';

	it('keeps the certificate but removes the key from a server bundle', () => {
		const safe = stripPrivateKeyBlocks(`${KEY}\n${ISRG_ROOT_X1}`);
		expect(safe).toBe(ISRG_ROOT_X1);
		expect(safe).not.toContain('PRIVATE KEY');
	});

	it('leaves an artefact without a key byte-for-byte unchanged', () => {
		const input = `prefix\n${ISRG_ROOT_X1}\nsuffix`;
		expect(stripPrivateKeyBlocks(input)).toBe(input);
	});
});

describe('detectArtefact: bytes over labels', () => {
	it('recognises a bare base64 keystore', () => {
		expect(detectArtefact(TEST_PKCS12)).toMatchObject({ kind: 'pkcs12', slug: 'decode-pkcs12' });
	});

	it('sees through a keystore armoured as a certificate', () => {
		// Exactly what dropping a .p12 on the certificate decoder used to produce.
		const armoured = derToPem(base64ToBytes(TEST_PKCS12), 'CERTIFICATE');
		expect(detectArtefact(armoured)).toMatchObject({ kind: 'pkcs12', slug: 'decode-pkcs12' });
	});

	it('offers the ASN.1 viewer for a DER structure it cannot name', () => {
		// SEQUENCE { INTEGER 1 }: valid DER, no artefact this product decodes.
		const der = new Uint8Array([0x30, 0x03, 0x02, 0x01, 0x01]);
		expect(detectBytes(der)).toMatchObject({ kind: 'der', slug: 'asn1-viewer' });
	});

	it('says nothing about what is not an artefact at all', () => {
		expect(detectArtefact('')).toBeNull();
		expect(detectArtefact('hello, world')).toBeNull();
		expect(
			detectArtefact('-----BEGIN SOMETHING ELSE-----\nAAAA\n-----END SOMETHING ELSE-----')
		).toBeNull();
	});
});

describe('isPkcs12', () => {
	it('accepts the real keystore fixture', () => {
		expect(isPkcs12(base64ToBytes(TEST_PKCS12))).toBe(true);
	});

	it('rejects a certificate', () => {
		const der = base64ToBytes(ISRG_ROOT_X1.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));
		expect(isPkcs12(der)).toBe(false);
	});

	it('reads the short length form as well as the long one', () => {
		// SEQUENCE (short form) { INTEGER 3 }
		expect(isPkcs12(new Uint8Array([0x30, 0x05, 0x02, 0x01, 0x03, 0x00, 0x00]))).toBe(true);
	});
});
