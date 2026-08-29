/**
 * PEM helpers, pure functions, no DOM, no crypto.
 *
 * A PEM file can contain several armoured blocks (a certificate chain, a key
 * plus its certificate, …). These helpers slice such a file into individual
 * blocks and convert between PEM and DER.
 */

export type PemBlock = {
	/** The label between the dashes, e.g. `CERTIFICATE`, `CERTIFICATE REQUEST`. */
	type: string;
	/** The full armoured block, dashes included. */
	pem: string;
};

/**
 * Upper bound on the size of any artefact the decoders will accept, applied
 * centrally so every tool benefits. A pathological multi-megabyte paste can
 * make ASN.1 parsing hang the browser tab; 4 MB comfortably fits any real
 * certificate, chain, CRL or PKCS#12 bundle while rejecting hostile input.
 */
export const MAX_INPUT_BYTES = 4 * 1024 * 1024;

/**
 * Reject an artefact whose raw text is larger than `MAX_INPUT_BYTES`. Call this
 * at every decoder entry point before any parsing work begins.
 */
export function assertInputSize(input: string): void {
	// One UTF-16 code unit is at least one byte once decoded; this is a cheap
	// upper-bound check that avoids allocating a TextEncoder for huge inputs.
	if (input.length > MAX_INPUT_BYTES) {
		throw new Error(
			`The input is too large (limit ${MAX_INPUT_BYTES / (1024 * 1024)} MB). ` +
				'Paste a single PKI artefact rather than a whole file dump.'
		);
	}
}

type PemMarker = {
	kind: 'begin' | 'end';
	/** The untrimmed label: END markers must match BEGIN markers byte for byte. */
	label: string;
	start: number;
	end: number;
};

type PemBlockRange = {
	type: string;
	start: number;
	end: number;
};

const BEGIN_PREFIX = '-----BEGIN ';
const END_PREFIX = '-----END ';
const MARKER_SUFFIX = '-----';

function isLabelCharacter(code: number): boolean {
	return (
		(code >= 0x41 && code <= 0x5a) || // A-Z
		(code >= 0x30 && code <= 0x39) || // 0-9
		code === 0x20 || // space
		code === 0x23 // #
	);
}

/**
 * Read BEGIN and END markers in one pass without scanning an unterminated
 * block once for every BEGIN marker that precedes it.
 */
function scanMarkers(input: string): PemMarker[] {
	const markers: PemMarker[] = [];
	let cursor = 0;

	while (cursor < input.length) {
		const start = input.indexOf(MARKER_SUFFIX, cursor);
		if (start === -1) break;

		let kind: PemMarker['kind'];
		let labelStart: number;
		if (input.startsWith(BEGIN_PREFIX, start)) {
			kind = 'begin';
			labelStart = start + BEGIN_PREFIX.length;
		} else if (input.startsWith(END_PREFIX, start)) {
			kind = 'end';
			labelStart = start + END_PREFIX.length;
		} else {
			// Move by one so an overlapping run of dashes cannot hide a marker.
			cursor = start + 1;
			continue;
		}

		let labelEnd = labelStart;
		while (labelEnd < input.length && isLabelCharacter(input.charCodeAt(labelEnd))) {
			labelEnd += 1;
		}

		if (labelEnd === labelStart || !input.startsWith(MARKER_SUFFIX, labelEnd)) {
			cursor = start + 1;
			continue;
		}

		const end = labelEnd + MARKER_SUFFIX.length;
		markers.push({ kind, label: input.slice(labelStart, labelEnd), start, end });
		cursor = end;
	}

	return markers;
}

function firstEndAfter(markers: PemMarker[], offset: number): PemMarker | null {
	let low = 0;
	let high = markers.length;
	while (low < high) {
		const middle = low + Math.floor((high - low) / 2);
		if (markers[middle].start <= offset) low = middle + 1;
		else high = middle;
	}
	return markers[low] ?? null;
}

/** Find complete, non-overlapping PEM blocks with leftmost-first semantics. */
function blockRanges(input: string): PemBlockRange[] {
	const markers = scanMarkers(input);
	const endsByLabel = new Map<string, PemMarker[]>();
	for (const marker of markers) {
		if (marker.kind !== 'end') continue;
		const ends = endsByLabel.get(marker.label);
		if (ends) ends.push(marker);
		else endsByLabel.set(marker.label, [marker]);
	}

	const ranges: PemBlockRange[] = [];
	let consumedUntil = 0;
	for (const marker of markers) {
		if (marker.kind !== 'begin' || marker.start < consumedUntil) continue;
		const closing = firstEndAfter(endsByLabel.get(marker.label) ?? [], marker.end);
		if (!closing) continue;
		ranges.push({ type: marker.label.trim(), start: marker.start, end: closing.end });
		consumedUntil = closing.end;
	}
	return ranges;
}

/**
 * Split a PEM string into its individual armoured blocks, in document order.
 * Text outside of `BEGIN/END` markers is ignored.
 */
export function splitBlocks(input: string): PemBlock[] {
	return blockRanges(input).map((range) => ({
		type: range.type,
		pem: input.slice(range.start, range.end)
	}));
}

/** True when the string contains at least one PEM armoured block. */
export function looksLikePem(input: string): boolean {
	return blockRanges(input).length > 0;
}

/** Decode a base64 string to bytes (works in browsers and Node). */
export function base64ToBytes(b64: string): Uint8Array {
	const clean = b64.replace(/\s+/g, '');
	if (clean.length === 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0) {
		throw new Error('The content is not valid base64.');
	}
	let bin: string;
	try {
		bin = atob(clean);
	} catch {
		throw new Error('The content is not valid base64.');
	}
	if (bin.length > MAX_INPUT_BYTES) {
		throw new Error(
			`The decoded content is too large (limit ${MAX_INPUT_BYTES / (1024 * 1024)} MB).`
		);
	}
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

/** Encode bytes to base64 (works in browsers and Node). */
export function bytesToBase64(bytes: Uint8Array): string {
	let bin = '';
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin);
}

/** Extract the raw DER bytes from a single PEM block. */
export function pemToDer(pem: string): Uint8Array {
	const body = pem
		.replace(/-----BEGIN [^-]+-----/, '')
		.replace(/-----END [^-]+-----/, '')
		.trim();
	return base64ToBytes(body);
}

/** Wrap DER bytes into a PEM block of the given type (default `CERTIFICATE`). */
export function derToPem(der: Uint8Array, type = 'CERTIFICATE'): string {
	const b64 = bytesToBase64(der);
	const lines = b64.match(/.{1,64}/g) ?? [];
	return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----`;
}
