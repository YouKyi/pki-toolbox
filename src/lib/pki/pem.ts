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

/** Matches one `-----BEGIN X-----…-----END X-----` block. */
const BLOCK_RE = /-----BEGIN ([A-Z0-9 #]+?)-----[\s\S]+?-----END \1-----/g;

/**
 * Split a PEM string into its individual armoured blocks, in document order.
 * Text outside of `BEGIN/END` markers is ignored.
 */
export function splitBlocks(input: string): PemBlock[] {
	const out: PemBlock[] = [];
	let match: RegExpExecArray | null;
	BLOCK_RE.lastIndex = 0;
	while ((match = BLOCK_RE.exec(input)) !== null) {
		out.push({ type: match[1].trim(), pem: match[0] });
	}
	return out;
}

/** True when the string contains at least one PEM armoured block. */
export function looksLikePem(input: string): boolean {
	BLOCK_RE.lastIndex = 0;
	return BLOCK_RE.test(input);
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
