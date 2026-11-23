/**
 * Edge cases of the encoding layer (ASN.1 walker, PEM scanner, detection,
 * formatting) that the main suites do not reach. DER fixtures are written as
 * hex so each test states the exact bytes it feeds the parser.
 */
import { describe, it, expect } from 'vitest';
import { parseAsn1 } from '#lib/pki/asn1.js';
import {
	splitBlocks,
	base64ToBytes,
	derToPem,
	bytesToBase64,
	MAX_INPUT_BYTES
} from '#lib/pki/pem.js';
import { detectBytes, isPkcs12 } from '#lib/pki/detect.js';
import { hexWithColons, humanKeyAlgorithm, humanSignatureAlgorithm } from '#lib/pki/format.js';

/** Hex DER (spaces allowed) to the base64 the parser accepts. */
function der(hex: string): string {
	return Buffer.from(hex.replace(/\s+/g, ''), 'hex').toString('base64');
}

/** Tag and value of the top-level node. */
function top(hex: string) {
	const { tag, tagClass, constructed, value, children } = parseAsn1(der(hex));
	return { tag, tagClass, constructed, value, children: children.length };
}

describe('parseAsn1 values', () => {
	it('shows a non-universal primitive as hex, and an empty one as nothing', () => {
		expect(top('80 02 ab cd')).toMatchObject({ tag: '[0]', tagClass: 'Context', value: 'AB CD' });
		expect(top('80 00').value).toBe('');
		expect(top('c1 01 01')).toMatchObject({ tag: '[1]', tagClass: 'Private', value: '01' });
	});

	it('names the classes of constructed non-universal tags', () => {
		expect(top('60 02 05 00')).toMatchObject({ tagClass: 'Application', children: 1 });
		expect(top('a0 00')).toMatchObject({ tag: '[0]', tagClass: 'Context', children: 0 });
	});

	it('reads BOOLEAN false', () => {
		expect(top('01 01 00').value).toBe('FALSE');
	});

	it('reads a RELATIVE-OID', () => {
		expect(top('0d 02 2a 03')).toMatchObject({ tag: 'RELATIVE-OID', value: '42.3' });
	});

	it('reads zero from its valid encoding and a long ENUMERATED as hex', () => {
		expect(top('02 01 00').value).toBe('0');
		expect(top('0a 09 01 02 03 04 05 06 07 08 09').value).toBe('01 02 03 04 05 06 07 08 09');
	});

	it('flags an INTEGER without content octets instead of inventing zero', () => {
		// X.690 §8.3.1 requires at least one content octet.
		expect(top('02 00').value).toBe('(invalid: no content octets)');
		expect(top('0a 00').value).toBe('(invalid: no content octets)');
	});

	it('shows an empty OCTET STRING as nothing', () => {
		expect(top('04 00').value).toBe('');
	});

	it('names an unknown universal tag by number and shows its bytes', () => {
		expect(top('0e 01 00')).toMatchObject({ tag: 'UNIVERSAL 14', value: '00' });
		// End-of-contents carries no value block bytes at all.
		expect(top('00 00')).toMatchObject({ tag: 'UNIVERSAL 0', value: '' });
	});

	it('decodes the less common string types', () => {
		expect(top('14 02 41 42')).toMatchObject({ tag: 'TeletexString', value: 'AB' });
		expect(top('1c 04 00 00 00 41')).toMatchObject({ tag: 'UniversalString', value: 'A' });
		expect(top('1e 02 00 41')).toMatchObject({ tag: 'BMPString', value: 'A' });
		expect(top('1b 01 41')).toMatchObject({ tag: 'GeneralString', value: 'A' });
		expect(top('12 01 31')).toMatchObject({ tag: 'NumericString', value: '1' });
	});

	it('renders a valid GeneralizedTime as ISO 8601', () => {
		expect(top('18 0f 32 30 32 34 30 31 30 31 30 30 30 30 30 30 5a').value).toBe(
			'2024-01-01T00:00:00.000Z'
		);
	});

	it('shows an overflowing GeneralizedTime as encoded, flagged as not a date', () => {
		// asn1js accepts the fraction `.5e999`, which overflows into an invalid date.
		const text = '2020010100.5e999Z';
		const hex = Buffer.from(text).toString('hex');
		expect(top(`18 ${text.length.toString(16)} ${hex}`).value).toBe(`${text} (not a valid date)`);
	});

	it('splits a constructed (BER) string into its fragments', () => {
		const node = parseAsn1(der('33 06 13 01 41 13 01 42'));
		expect(node).toMatchObject({ tag: 'PrintableString', constructed: true, value: null });
		expect(
			node.children.map(({ tag, value, offset, length }) => ({ tag, value, offset, length }))
		).toEqual([
			{ tag: 'PrintableString', value: 'A', offset: 2, length: 1 },
			{ tag: 'PrintableString', value: 'B', offset: 5, length: 1 }
		]);
	});

	it('shows constructed content that is not a run of BER elements as hex', () => {
		expect(top('33 02 13 05')).toMatchObject({ constructed: true, value: '13 05', children: 0 });
	});
});

describe('parseAsn1 input errors', () => {
	it('rejects input that is neither PEM nor base64', () => {
		expect(() => parseAsn1('!!!')).toThrowError(
			'The input is neither valid PEM nor base64-encoded DER.'
		);
	});
});

describe('splitBlocks marker scanning', () => {
	const body = 'AAAA';

	it('skips dash runs that are neither BEGIN nor END markers', () => {
		const pem = `-----FOO-----\n-----BEGIN X-----\n${body}\n-----END X-----`;
		expect(splitBlocks(pem).map((b) => b.type)).toEqual(['X']);
	});

	it('ignores markers with an empty, lowercase or unterminated label', () => {
		expect(splitBlocks(`-----BEGIN -----\n${body}\n-----END -----`)).toEqual([]);
		expect(splitBlocks(`-----BEGIN cert-----\n${body}\n-----END cert-----`)).toEqual([]);
		expect(splitBlocks(`-----BEGIN X\n${body}\n-----END X`)).toEqual([]);
	});
});

describe('base64 and PEM helpers', () => {
	it('refuses decoded content larger than the input limit', () => {
		const b64 = bytesToBase64(new Uint8Array(MAX_INPUT_BYTES + 3));
		expect(() => base64ToBytes(b64)).toThrowError(/decoded content is too large/);
	});

	it('wraps empty DER into an empty PEM body', () => {
		expect(derToPem(new Uint8Array(), 'X')).toBe('-----BEGIN X-----\n\n-----END X-----');
	});
});

describe('byte-level detection', () => {
	it('detects nothing in fewer than four bytes', () => {
		expect(detectBytes(new Uint8Array([0x30, 0x02, 0x05]))).toBeNull();
	});

	it('detects nothing when the bytes do not open a SEQUENCE', () => {
		const bytes = new Uint8Array([0x02, 0x01, 0x03, 0x00]);
		expect(isPkcs12(bytes)).toBe(false);
		expect(detectBytes(bytes)).toBeNull();
	});
});

describe('format helpers', () => {
	it('groups an empty hex string into nothing', () => {
		expect(hexWithColons('')).toBe('');
	});

	it('labels key algorithms with missing details', () => {
		expect(humanKeyAlgorithm(undefined)).toEqual({ family: 'Unknown', label: 'Unknown' });
		expect(humanKeyAlgorithm({ name: 'RSASSA-PKCS1-v1_5' })).toMatchObject({ label: 'RSA' });
		expect(humanKeyAlgorithm({ name: 'ECDSA' })).toMatchObject({ family: 'EC', label: 'EC' });
	});

	it('labels signature algorithms with missing or unusual details', () => {
		expect(humanSignatureAlgorithm(undefined)).toBe('Unknown');
		expect(humanSignatureAlgorithm({ name: 'ECDSA' })).toBe('ECDSA');
		expect(humanSignatureAlgorithm({ name: 'RSA-PSS', hash: 'SHA-384' })).toBe(
			'SHA-384 with RSA-PSS'
		);
		expect(humanSignatureAlgorithm({ name: 'GOST', hash: { name: 'Streebog' } })).toBe(
			'Streebog with GOST'
		);
	});
});
