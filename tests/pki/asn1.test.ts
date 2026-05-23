/**
 * Tests for the ASN.1 walker in `asn1.ts`: normal parsing, hostile-input
 * depth/node-count bounds, and trailing-bytes rejection.
 *
 * All DER fixtures are constructed programmatically so the test has no
 * dependency on large binary files.
 *
 * Implementation note on node-count budgets
 * -----------------------------------------
 * `asn1.ts` sets MAX_NODES = 100_000 as a defence-in-depth guard inside the
 * `walk()` function. In practice, the `asn1js` library enforces its own
 * global DEFAULT_MAX_NODES = 10_000 during `fromBER()`, so any DER blob with
 * more than ~10_000 total nodes is rejected before `walk()` is ever invoked.
 * The tests below therefore verify the observable end-to-end behaviour:
 * over-large structures throw; structures within the limit parse correctly.
 */
import { describe, it, expect } from 'vitest';
import { parseAsn1 } from '$lib/pki/asn1';
import { derToPem } from '$lib/pki/pem';

// ---------------------------------------------------------------------------
// DER construction helpers
// ---------------------------------------------------------------------------

/** Encode a DER length field (definite, short or long form). */
function derLength(n: number): Uint8Array {
	if (n < 0x80) return new Uint8Array([n]);
	const bytes: number[] = [];
	let v = n;
	while (v > 0) {
		bytes.unshift(v & 0xff);
		v >>>= 8;
	}
	return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

/** Concatenate several Uint8Arrays into one. */
function concat(...parts: Uint8Array[]): Uint8Array {
	const total = parts.reduce((s, p) => s + p.length, 0);
	const out = new Uint8Array(total);
	let off = 0;
	for (const p of parts) {
		out.set(p, off);
		off += p.length;
	}
	return out;
}

/** Build a DER TLV (tag, length, value). */
function tlv(tag: number, content: Uint8Array): Uint8Array {
	return concat(new Uint8Array([tag]), derLength(content.length), content);
}

/** DER SEQUENCE (tag 0x30) wrapping `content`. */
function sequence(content: Uint8Array): Uint8Array {
	return tlv(0x30, content);
}

/** DER NULL (tag 0x05, zero bytes of content). */
function derNull(): Uint8Array {
	return new Uint8Array([0x05, 0x00]);
}

/** DER INTEGER (tag 0x02) holding an unsigned single-byte value. */
function integer(value: number): Uint8Array {
	return tlv(0x02, new Uint8Array([value & 0xff]));
}

/** Wrap raw DER bytes in a PEM block so `parseAsn1` can consume them. */
function wrapPem(der: Uint8Array): string {
	return derToPem(der, 'DATA');
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Depth limit applied by `asn1.ts` walk() before recursing into children.
 * Mirrored from the source; kept in sync manually.
 */
const MAX_DEPTH = 40;

/**
 * `asn1js` enforces a global node budget (DEFAULT_MAX_NODES = 10_000) during
 * fromBER(). Structures above this threshold are rejected by asn1js before
 * our custom walk() ever runs.
 */
const ASN1JS_MAX_NODES = 10_000;

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

/**
 * Build a chain of SEQUENCE wrappers `depth` levels deep, with a single
 * INTEGER leaf at the innermost level.
 */
function buildNestedSequences(depth: number): Uint8Array {
	let inner: Uint8Array = integer(0);
	for (let i = 0; i < depth; i++) {
		inner = sequence(inner);
	}
	return inner;
}

/**
 * Build a flat SEQUENCE containing `count` NULL children.
 * Total nodes when parsed: 1 (root SEQUENCE) + count (NULLs).
 */
function buildFlatSequenceWithNulls(count: number): Uint8Array {
	const nullBytes = new Uint8Array(count * 2);
	for (let i = 0; i < count; i++) {
		nullBytes[i * 2] = 0x05;
		nullBytes[i * 2 + 1] = 0x00;
	}
	return sequence(nullBytes);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseAsn1 — normal small DER', () => {
	it('parses a minimal SEQUENCE { INTEGER } structure', () => {
		const der = sequence(integer(42));
		const node = parseAsn1(wrapPem(der));
		expect(node.tag).toBe('SEQUENCE');
		expect(node.children).toHaveLength(1);
		expect(node.children[0].tag).toBe('INTEGER');
		expect(node.children[0].value).toBe('42');
	});

	it('parses a SEQUENCE containing a NULL child', () => {
		const der = sequence(derNull());
		const node = parseAsn1(wrapPem(der));
		expect(node.tag).toBe('SEQUENCE');
		expect(node.children).toHaveLength(1);
		expect(node.children[0].tag).toBe('NULL');
	});

	it('reports the correct byte offset (0) for the root node', () => {
		const der = sequence(integer(1));
		const node = parseAsn1(wrapPem(der));
		expect(node.offset).toBe(0);
	});

	it('reports the correct content length for the outer SEQUENCE', () => {
		const inner = integer(7);
		const der = sequence(inner);
		const node = parseAsn1(wrapPem(der));
		// `length` is the byte count of the SEQUENCE's content (not including header).
		expect(node.length).toBe(inner.length);
	});

	it('marks constructed SEQUENCE nodes and primitive INTEGER nodes correctly', () => {
		const der = sequence(integer(1));
		const node = parseAsn1(wrapPem(der));
		expect(node.constructed).toBe(true);
		expect(node.children[0].constructed).toBe(false);
	});
});

describe('parseAsn1 — MAX_DEPTH truncation (ARCH-01)', () => {
	it('handles a structure nested to exactly MAX_DEPTH without crashing', () => {
		// MAX_DEPTH layers of SEQUENCE around an INTEGER leaf.
		// The walker must terminate gracefully, not recurse past the limit.
		const der = buildNestedSequences(MAX_DEPTH);
		expect(() => parseAsn1(wrapPem(der))).not.toThrow();
	});

	it('sets a truncation-marker value on the node that reaches the depth limit', () => {
		// MAX_DEPTH + 1 layers: the node at depth MAX_DEPTH receives the marker
		// instead of expanding its children.
		const der = buildNestedSequences(MAX_DEPTH + 1);
		const root = parseAsn1(wrapPem(der));

		// Walk to the node at depth MAX_DEPTH.
		let node = root;
		for (let d = 0; d < MAX_DEPTH; d++) {
			expect(node.children).toHaveLength(1);
			node = node.children[0];
		}

		// At depth MAX_DEPTH the walker stops: children are NOT expanded.
		expect(node.children).toHaveLength(0);
		expect(node.value).toMatch(/maximum nesting depth/i);
	});

	it('includes the suppressed child count in the truncation message', () => {
		const der = buildNestedSequences(MAX_DEPTH + 1);
		const root = parseAsn1(wrapPem(der));

		let node = root;
		for (let d = 0; d < MAX_DEPTH; d++) {
			node = node.children[0];
		}

		// The truncated node wraps 1 child (the next SEQUENCE level).
		expect(node.value).toMatch(/1 child node/i);
	});
});

describe('parseAsn1 — node-count budget (ARCH-01)', () => {
	it('parses successfully when node count is comfortably within the budget', () => {
		// 1 SEQUENCE + 1000 NULLs = 1001 nodes, far below any limit.
		const der = buildFlatSequenceWithNulls(1000);
		const node = parseAsn1(wrapPem(der));
		expect(node.tag).toBe('SEQUENCE');
		expect(node.children).toHaveLength(1000);
	});

	it('parses successfully up to one below the asn1js node budget', () => {
		// asn1js enforces DEFAULT_MAX_NODES = 10_000 during BER parsing.
		// 1 root + (ASN1JS_MAX_NODES - 2) NULLs = ASN1JS_MAX_NODES - 1 total nodes.
		const count = ASN1JS_MAX_NODES - 2;
		const der = buildFlatSequenceWithNulls(count);
		const node = parseAsn1(wrapPem(der));
		expect(node.children).toHaveLength(count);
	});

	it('throws when the total node count exceeds the asn1js budget', () => {
		// ASN1JS_MAX_NODES NULL children + 1 root SEQUENCE = ASN1JS_MAX_NODES + 1
		// total nodes. asn1js rejects this before our walk() is called.
		// The observable result is a thrown Error (exact message may vary by
		// asn1js version, so we test that ANY error is raised rather than
		// matching a specific string).
		const der = buildFlatSequenceWithNulls(ASN1JS_MAX_NODES);
		expect(() => parseAsn1(wrapPem(der))).toThrow();
	});
});

describe('parseAsn1 — trailing-bytes rejection (ARCH-01)', () => {
	it('rejects two complete DER structures concatenated inside one PEM block', () => {
		const singleDer = sequence(integer(1));
		const doubled = concat(singleDer, singleDer);
		expect(() => parseAsn1(wrapPem(doubled))).toThrowError(/trailing byte/i);
	});

	it('rejects a single extra zero byte appended after a valid structure', () => {
		const singleDer = sequence(integer(1));
		const withTrailing = concat(singleDer, new Uint8Array([0x00]));
		expect(() => parseAsn1(wrapPem(withTrailing))).toThrowError(/trailing byte/i);
	});
});

describe('parseAsn1 — invalid input', () => {
	it('rejects input that is neither valid PEM nor base64-encoded DER', () => {
		expect(() => parseAsn1('definitely not der')).toThrowError(/could not be parsed as ASN\.1/i);
	});
});
