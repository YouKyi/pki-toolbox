import { describe, it, expect } from 'vitest';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import '@abraham/reflection';
import { X509CrlGenerator, X509CrlReason } from '@peculiar/x509';
import { decodeCrl } from '#lib/pki/crl.js';
import { decodePkcs7 } from '#lib/pki/pkcs7.js';
import { convertArtefact, buildPkcs7 } from '#lib/pki/convert.js';
import { passwordBytes, toArrayBuffer } from '#lib/pki/engine.js';
import { ekuName, extensionName } from '#lib/pki/oids.js';
import { derToPem } from '#lib/pki/pem.js';

const EC = { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' };

const NEXT_UPDATE = new Date('2030-01-01T00:00:00Z');

/**
 * A freshly signed CRL, so entry shapes the bundled sample lacks can be exercised.
 * Entries are only read back when the CRL carries a nextUpdate: without one,
 * @peculiar/x509 3.1 silently drops every revoked entry on parse.
 */
async function makeCrl(
	entries: { serialNumber: string; reason?: number }[],
	nextUpdate: Date | null = NEXT_UPDATE
) {
	const keys = await crypto.subtle.generateKey(EC, false, ['sign', 'verify']);
	const crl = await X509CrlGenerator.create({
		issuer: 'CN=Edge CA',
		signingAlgorithm: EC,
		signingKey: keys.privateKey,
		nextUpdate: nextUpdate ?? undefined,
		entries: entries.map((e) => ({ ...e, reason: e.reason as X509CrlReason | undefined }))
	});
	return crl.toString('pem');
}

/** A PKCS#7 ContentInfo of type `data` rather than SignedData. */
function dataContentInfo(): string {
	const info = new pkijs.ContentInfo({
		contentType: '1.2.840.113549.1.7.1',
		content: new asn1js.OctetString({ valueHex: new Uint8Array([1, 2, 3]).buffer })
	});
	return derToPem(new Uint8Array(info.toSchema().toBER()), 'PKCS7');
}

describe('decodeCrl edge cases', () => {
	it('tells a missing reason apart from an unknown reason code', async () => {
		const pem = await makeCrl([
			{ serialNumber: '01' },
			{ serialNumber: '02', reason: X509CrlReason.cACompromise },
			{ serialNumber: '03', reason: 7 }
		]);
		const crl = decodeCrl(pem);
		expect(crl.issuer).toBe('CN=Edge CA');
		expect(crl.entryCount).toBe(3);
		expect(crl.entries.map((e) => e.reason)).toEqual([
			'None (not specified in the CRL)',
			'CA compromise',
			'Code 7'
		]);
	});

	it('keeps the next update when the CRL announces one', async () => {
		const crl = decodeCrl(await makeCrl([]));
		expect(crl.nextUpdate?.toISOString()).toBe(NEXT_UPDATE.toISOString());
		expect(crl.entryCount).toBe(0);
	});

	it('reports a missing next update as null', async () => {
		expect(decodeCrl(await makeCrl([], null)).nextUpdate).toBeNull();
	});
});

describe('PKCS#7 edge cases', () => {
	it('rejects a ContentInfo that is not SignedData', async () => {
		await expect(decodePkcs7(dataContentInfo())).rejects.toThrowError(/not SignedData/);
	});

	it('decodes a certs-only bundle that carries no certificate', async () => {
		const pem = derToPem(buildPkcs7([]), 'PKCS7');
		const p7 = await decodePkcs7(pem);
		expect(p7.certificateCount).toBe(0);
		expect(p7.signerCount).toBe(0);
	});

	it('refuses to convert a PKCS#7 that is not SignedData', () => {
		expect(() => convertArtefact(dataContentInfo())).toThrowError(/SignedData expected/);
	});
});

describe('passwordBytes', () => {
	it('maps Latin-1 characters to single bytes', () => {
		expect([...new Uint8Array(passwordBytes('aéÿ'))]).toEqual([0x61, 0xe9, 0xff]);
	});

	it('rejects characters outside Latin-1 instead of corrupting them', () => {
		expect(() => passwordBytes('mot€')).toThrowError(/non-Latin/);
	});
});

describe('toArrayBuffer', () => {
	it('returns only the bytes of the view, not its whole backing buffer', () => {
		const view = new Uint8Array([0, 1, 2, 3, 4]).subarray(1, 4);
		expect([...new Uint8Array(toArrayBuffer(view))]).toEqual([1, 2, 3]);
	});
});

describe('OID names', () => {
	it('humanises known OIDs and falls back to the dotted form', () => {
		expect(ekuName('1.3.6.1.5.5.7.3.1')).toBe('serverAuth');
		expect(ekuName('1.2.3.4')).toBe('1.2.3.4');
		expect(extensionName('2.5.29.19')).toBe('Basic Constraints');
		expect(extensionName('1.2.3.4')).toBe('1.2.3.4');
	});
});
