/**
 * Generic ASN.1 / DER structure walker, built on `asn1js`. Turns any DER blob
 * into an expandable tag/length/value tree — the engine behind the ASN.1
 * viewer. It does not know about X.509 semantics; it only decodes structure.
 */
import * as asn1js from 'asn1js';
import { pemToDer } from './pem';
import { bytesToHex } from './format';
import { toArrayBuffer } from './engine';

export type Asn1Node = {
	/** Display tag, e.g. `SEQUENCE`, `INTEGER`, `[0]`. */
	tag: string;
	tagClass: string;
	constructed: boolean;
	/** Content length in bytes. */
	length: number;
	/** Absolute byte offset of the node in the DER blob. */
	offset: number;
	/** Decoded value for primitive nodes (null for constructed nodes). */
	value: string | null;
	children: Asn1Node[];
};

const UNIVERSAL_TAGS: Record<number, string> = {
	1: 'BOOLEAN',
	2: 'INTEGER',
	3: 'BIT STRING',
	4: 'OCTET STRING',
	5: 'NULL',
	6: 'OBJECT IDENTIFIER',
	10: 'ENUMERATED',
	12: 'UTF8String',
	13: 'RELATIVE-OID',
	16: 'SEQUENCE',
	17: 'SET',
	18: 'NumericString',
	19: 'PrintableString',
	20: 'TeletexString',
	22: 'IA5String',
	23: 'UTCTime',
	24: 'GeneralizedTime',
	26: 'VisibleString',
	27: 'GeneralString',
	28: 'UniversalString',
	30: 'BMPString'
};

const TAG_CLASSES: Record<number, string> = {
	1: 'Universal',
	2: 'Application',
	3: 'Context',
	4: 'Private'
};

const STRING_TAGS = new Set([12, 18, 19, 20, 22, 26, 27, 28, 30]);

type AnyBlock = {
	idBlock: { tagClass: number; tagNumber: number; isConstructed: boolean };
	lenBlock: { length: number };
	blockLength: number;
	valueBlock: {
		value?: AnyBlock[];
		valueHexView?: Uint8Array;
		value_hex?: ArrayBuffer;
		toString?: () => string;
	};
	getValue?: () => string;
	toDate?: () => Date;
};

function hexPreview(bytes: Uint8Array, max = 64): string {
	const hex = bytesToHex(bytes.subarray(0, max));
	const grouped = (hex.match(/.{2}/g) ?? []).join(' ').toUpperCase();
	return bytes.length > max ? `${grouped} … (${bytes.length} octets)` : grouped;
}

function contentBytes(block: AnyBlock): Uint8Array {
	return block.valueBlock.valueHexView ?? new Uint8Array();
}

function readValue(block: AnyBlock, tagClass: number, tagNumber: number): string | null {
	if (tagClass !== 1) {
		const bytes = contentBytes(block);
		return bytes.length ? hexPreview(bytes) : '';
	}
	switch (tagNumber) {
		case 1: // BOOLEAN
			return contentBytes(block).some((b) => b !== 0) ? 'TRUE' : 'FALSE';
		case 5: // NULL
			return '';
		case 6: // OBJECT IDENTIFIER
		case 13: {
			const oid = block.getValue?.() ?? block.valueBlock.toString?.() ?? '';
			return oid;
		}
		case 2: // INTEGER
		case 10: {
			// ENUMERATED
			const bytes = contentBytes(block);
			if (bytes.length === 0) return '0';
			if (bytes.length <= 8) {
				let n = 0n;
				for (const b of bytes) n = (n << 8n) | BigInt(b);
				return n.toString();
			}
			return hexPreview(bytes);
		}
		case 23: // UTCTime
		case 24: {
			// GeneralizedTime
			const date = block.toDate?.();
			if (date && !Number.isNaN(date.getTime())) return date.toISOString();
			return new TextDecoder().decode(contentBytes(block));
		}
		default:
			if (STRING_TAGS.has(tagNumber)) {
				const raw = block.valueBlock.value;
				if (typeof raw === 'string') return raw;
				return new TextDecoder().decode(contentBytes(block));
			}
			return hexPreview(contentBytes(block));
	}
}

function walk(block: AnyBlock, offset: number, depth: number): Asn1Node {
	const { tagClass, tagNumber, isConstructed } = block.idBlock;
	const length = block.lenBlock.length;
	const headerLength = block.blockLength - length;

	const tag =
		tagClass === 1 ? (UNIVERSAL_TAGS[tagNumber] ?? `UNIVERSAL ${tagNumber}`) : `[${tagNumber}]`;

	const node: Asn1Node = {
		tag,
		tagClass: TAG_CLASSES[tagClass] ?? 'Unknown',
		constructed: isConstructed,
		length,
		offset,
		value: null,
		children: []
	};

	const children = block.valueBlock.value;
	if (isConstructed && Array.isArray(children) && depth < 40) {
		let childOffset = offset + headerLength;
		for (const child of children) {
			node.children.push(walk(child, childOffset, depth + 1));
			childOffset += child.blockLength;
		}
	} else if (!isConstructed) {
		node.value = readValue(block, tagClass, tagNumber);
	}

	return node;
}

/**
 * Parse a PEM or DER artefact into an ASN.1 tree.
 * Throws an `Error` when the bytes are not valid DER.
 */
export function parseAsn1(input: string): Asn1Node {
	let der: Uint8Array;
	try {
		der = pemToDer(input);
	} catch (e) {
		throw new Error('The input is neither valid PEM nor base64-encoded DER.', { cause: e });
	}
	if (der.length === 0) throw new Error('The input is empty.');

	const parsed = asn1js.fromBER(toArrayBuffer(der));
	if (parsed.offset === -1 || !parsed.result) {
		throw new Error('The input could not be parsed as ASN.1 / DER.');
	}
	return walk(parsed.result as unknown as AnyBlock, 0, 0);
}
