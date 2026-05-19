/**
 * Tests for the presentation helpers in `format.ts`: hex encoding, serial and
 * date formatting, and the public-key / signature algorithm classifiers.
 */
import { describe, it, expect } from 'vitest';
import {
	bytesToHex,
	hexWithColons,
	formatSerial,
	formatDate,
	daysBetween,
	humanKeyAlgorithm,
	humanSignatureAlgorithm
} from '$lib/pki/format';

describe('bytesToHex', () => {
	it('encodes bytes as lowercase hex with no separators', () => {
		expect(bytesToHex(new Uint8Array([0, 15, 16, 255]))).toBe('000f10ff');
	});

	it('accepts an ArrayBuffer as well as a Uint8Array', () => {
		expect(bytesToHex(new Uint8Array([171, 205]).buffer)).toBe('abcd');
	});

	it('returns an empty string for empty input', () => {
		expect(bytesToHex(new Uint8Array())).toBe('');
	});
});

describe('hexWithColons', () => {
	it('groups hex into uppercase colon-separated byte pairs', () => {
		expect(hexWithColons('abcdef')).toBe('AB:CD:EF');
	});

	it('left-pads an odd-length hex string', () => {
		expect(hexWithColons('abc')).toBe('0A:BC');
	});

	it('strips non-hex characters before grouping', () => {
		expect(hexWithColons('ab:cd ef')).toBe('AB:CD:EF');
	});
});

describe('formatSerial', () => {
	it('shows the hex form alongside the decimal value', () => {
		expect(formatSerial('0a')).toBe('0A  (10)');
	});

	it('handles a long serial number', () => {
		const out = formatSerial('00ffff');
		expect(out).toContain('00:FF:FF');
		expect(out).toContain('(65535)');
	});
});

describe('formatDate', () => {
	it('renders a date in compact UTC form', () => {
		expect(formatDate(new Date('2024-01-02T03:04:05Z'))).toBe('2024-01-02 03:04:05 UTC');
	});

	it('reports an invalid date instead of throwing', () => {
		expect(formatDate(new Date('not a date'))).toBe('Invalid date');
	});
});

describe('daysBetween', () => {
	it('counts whole days between two dates', () => {
		const a = new Date('2024-01-01T00:00:00Z');
		const b = new Date('2024-01-11T00:00:00Z');
		expect(daysBetween(a, b)).toBe(10);
	});

	it('is negative when the second date is earlier', () => {
		const a = new Date('2024-01-11T00:00:00Z');
		const b = new Date('2024-01-01T00:00:00Z');
		expect(daysBetween(a, b)).toBe(-10);
	});
});

describe('humanKeyAlgorithm', () => {
	it('classifies an RSA key with its modulus length', () => {
		const info = humanKeyAlgorithm({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048 });
		expect(info.family).toBe('RSA');
		expect(info.label).toBe('RSA 2048-bit');
	});

	it('classifies an EC key with its named curve', () => {
		const info = humanKeyAlgorithm({ name: 'ECDSA', namedCurve: 'P-256' });
		expect(info.family).toBe('EC');
		expect(info.curve).toBe('P-256');
	});

	it('classifies an Ed25519 key into the EdDSA family', () => {
		const info = humanKeyAlgorithm({ name: 'Ed25519' });
		expect(info.family).toBe('EdDSA');
		expect(info.curve).toBe('Ed25519');
		expect(info.label).toBe('Ed25519');
	});

	it('classifies an Ed448 key into the EdDSA family', () => {
		const info = humanKeyAlgorithm({ name: 'Ed448' });
		expect(info.family).toBe('EdDSA');
		expect(info.curve).toBe('Ed448');
	});

	it('does not mislabel an EdDSA key as RSA or EC', () => {
		for (const name of ['Ed25519', 'Ed448', 'EdDSA']) {
			const info = humanKeyAlgorithm({ name });
			expect(info.family).not.toBe('RSA');
			expect(info.family).not.toBe('EC');
		}
	});
});

describe('humanSignatureAlgorithm', () => {
	it('combines the hash and the family for an RSA signature', () => {
		expect(humanSignatureAlgorithm({ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' })).toBe(
			'SHA-256 with RSA'
		);
	});

	it('reports an EdDSA signature by its bare name', () => {
		expect(humanSignatureAlgorithm({ name: 'Ed25519' })).toBe('Ed25519');
	});
});
