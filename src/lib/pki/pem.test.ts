/**
 * Tests for the PEM helpers in `pem.ts`: block splitting, label extraction,
 * base64/DER round-tripping, the input-size guard and malformed-input handling.
 */
import { describe, it, expect } from 'vitest';
import {
	splitBlocks,
	looksLikePem,
	base64ToBytes,
	bytesToBase64,
	pemToDer,
	derToPem,
	assertInputSize,
	MAX_INPUT_BYTES
} from './pem';
import { ISRG_ROOT_X1, TEST_CHAIN } from '../samples';

describe('base64ToBytes / bytesToBase64', () => {
	it('round-trips an arbitrary byte sequence', () => {
		const bytes = new Uint8Array([0, 1, 2, 127, 128, 200, 255]);
		expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
	});

	it('ignores whitespace inside the base64 body', () => {
		const clean = bytesToBase64(new Uint8Array([1, 2, 3, 4, 5]));
		const spaced = clean.replace(/(.)/g, '$1 ');
		expect(base64ToBytes(spaced)).toEqual(base64ToBytes(clean));
	});

	it('rejects non-base64 input with a clear message', () => {
		expect(() => base64ToBytes('not valid base64 !!!')).toThrowError(/not valid base64/i);
	});

	it('rejects a string whose length is not a multiple of four', () => {
		expect(() => base64ToBytes('AAA')).toThrowError(/not valid base64/i);
	});
});

describe('splitBlocks', () => {
	it('extracts a single block and its label', () => {
		const blocks = splitBlocks(ISRG_ROOT_X1);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].type).toBe('CERTIFICATE');
	});

	it('extracts every block of a concatenated PEM in document order', () => {
		const blocks = splitBlocks(TEST_CHAIN);
		expect(blocks).toHaveLength(3);
		expect(blocks.every((b) => b.type === 'CERTIFICATE')).toBe(true);
	});

	it('ignores text outside of the BEGIN/END markers', () => {
		const noisy = `garbage before\n${ISRG_ROOT_X1}\ngarbage after`;
		const blocks = splitBlocks(noisy);
		expect(blocks).toHaveLength(1);
	});

	it('returns an empty array when there is no armoured block', () => {
		expect(splitBlocks('just some plain text')).toEqual([]);
	});
});

describe('looksLikePem', () => {
	it('is true for a real PEM block', () => {
		expect(looksLikePem(ISRG_ROOT_X1)).toBe(true);
	});

	it('is false for bare base64', () => {
		expect(looksLikePem('TUlJQg==')).toBe(false);
	});
});

describe('pemToDer / derToPem', () => {
	it('round-trips a certificate through DER and back to PEM', () => {
		const der = pemToDer(ISRG_ROOT_X1);
		expect(der.length).toBeGreaterThan(0);
		const rebuilt = pemToDer(derToPem(der));
		expect(rebuilt).toEqual(der);
	});

	it('wraps DER with the requested label', () => {
		const der = pemToDer(ISRG_ROOT_X1);
		expect(derToPem(der, 'X509 CRL')).toMatch(/^-----BEGIN X509 CRL-----/);
		expect(derToPem(der, 'X509 CRL')).toMatch(/-----END X509 CRL-----$/);
	});

	it('rejects a malformed PEM body', () => {
		const broken = '-----BEGIN CERTIFICATE-----\nnot base64 @@@\n-----END CERTIFICATE-----';
		expect(() => pemToDer(broken)).toThrowError(/not valid base64/i);
	});
});

describe('assertInputSize', () => {
	it('accepts input within the limit', () => {
		expect(() => assertInputSize('a'.repeat(1024))).not.toThrow();
	});

	it('rejects input larger than MAX_INPUT_BYTES with a clear message', () => {
		expect(() => assertInputSize('a'.repeat(MAX_INPUT_BYTES + 1))).toThrowError(/too large/i);
	});
});
